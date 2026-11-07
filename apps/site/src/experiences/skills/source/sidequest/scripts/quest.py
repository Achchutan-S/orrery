#!/usr/bin/env python3
"""Side Quest engine — all the mechanical decisions live here so Claude never
recomputes them: realm cooldowns, rarity rolls, Echo days, XP, levels, badges,
monthly journal stats, and log compaction.

State lives in a single memory file whose content lines look like
    - [stated] {"date": "...", "realm": "...", ...}
Claude dumps that file to disk, passes it with --mem, and appends the line
this script returns. Stdlib only.

Subcommands:
  roll     --mem F --date D [--exclude REALM_NAME]   pick today's quest
  log      --mem F --date D  < entry.json            score + build line to append
  journal  --mem F --date D [--month YYYY-MM]        monthly stats for the review
  compact  --mem F --date D [--keep-days N]          roll old entries into monthly summaries
"""
import argparse, calendar, datetime as dt, json, random, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE.parent / "config.json").read_text(encoding="utf-8"))
ECHO = "Echo"
PREFIX = "- [stated] "

FRONTMATTER = """---
name: sidequest
description: Side Quest habit log — daily out-of-field learning quests, XP, levels and badges; read when running a side quest
sources: [chat]
aliases: [side quest, sidequest log, quest journal]
---
"""

BADGES = {
    "first_steps":  ("🌱", "First Steps",   "Completed your first quest"),
    "cartographer": ("🗺️", "Cartographer",  "Visited all 8 realms in one month"),
    "speedrunner":  ("⚡", "Speedrunner",   "Five 2-minute quests"),
    "lucky_star":   ("💫", "Lucky Star",    "Completed a Legendary quest"),
    "echo_keeper":  ("🌀", "Echo Keeper",   "Survived three Echo days"),
    "shapeshifter": ("🎭", "Shapeshifter",  "Completed every quest type"),
    "hearthfire":   ("🔥", "Hearthfire",    "7 quest days inside any 10-day window"),
    "boomerang":    ("🪃", "Boomerang",     "Came back after a 7+ day break"),
    "moonlit":      ("🌕", "Moonlit Month", "25 quest days in a single month"),
    "centurion":    ("💯", "Centurion",     "100 quests completed"),
}

TITLES = [(1, "Curious Wanderer"), (3, "Apprentice of Many Things"), (5, "Journeyman Polymath"),
          (8, "Seasoned Explorer"), (12, "Renaissance Rogue"), (16, "Grand Polymath"),
          (21, "Living Encyclopedia")]

# ---------------------------------------------------------------- state ----

def load_state(path):
    entries, rollups = [], []
    p = Path(path) if path else None
    if not p or not p.exists():
        return entries, rollups, False
    exists = False
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line.startswith(PREFIX):
            continue
        exists = True
        try:
            obj = json.loads(line[len(PREFIX):])
        except json.JSONDecodeError:
            continue
        (rollups if "rollup" in obj else entries).append(obj)
    entries.sort(key=lambda e: e.get("date", ""))
    return entries, rollups, exists or "name: sidequest" in p.read_text(encoding="utf-8")

def d(s): return dt.date.fromisoformat(s)
def done(e): return e.get("done") in (True, "2min")
def mkey(day): return day.strftime("%Y-%m")
def realm_cfg(name): return next((r for r in CONFIG["realms"] if r["name"] == name), None)
def line_for(obj): return PREFIX + json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))

def totals(entries, rollups):
    t = {"xp": 0, "quests": 0, "speed": 0, "echo": 0, "formats": set(), "badges": set(), "days": set()}
    for r in rollups:
        c = r.get("counts", {})
        t["xp"] += r.get("xp", 0); t["quests"] += c.get("quests", 0)
        t["speed"] += c.get("speed", 0); t["echo"] += c.get("echo", 0)
        t["formats"].update(c.get("formats", [])); t["badges"].update(r.get("badges", []))
    for e in entries:
        t["xp"] += e.get("xp", 0); t["badges"].update(e.get("badges", []))
        if done(e):
            t["quests"] += 1; t["days"].add(e["date"])
            if e.get("done") == "2min": t["speed"] += 1
            if e.get("realm") == ECHO: t["echo"] += 1
            elif e.get("format"): t["formats"].add(e["format"])
    return t

def level_for(xp):
    lvl = 1
    while xp >= 100 * (lvl + 1) * lvl:  # XP needed to reach level L is 100*L*(L-1)
        lvl += 1
    title = [name for start, name in TITLES if lvl >= start][-1]
    floor, ceil = 100 * lvl * (lvl - 1), 100 * (lvl + 1) * lvl
    return {"level": lvl, "title": title, "xp": xp, "xp_into_level": xp - floor,
            "xp_for_next": ceil - floor, "progress_bar": bar((xp - floor) / (ceil - floor))}

def bar(frac, width=10):
    n = max(0, min(width, round(frac * width)))
    return "▰" * n + "▱" * (width - n)

# ----------------------------------------------------------------- roll ----

def cmd_roll(a, entries, rollups, rng):
    today = d(a.date)
    if not a.exclude and rng.random() < CONFIG["echo_day_probability"]:
        old = [e for e in entries if e.get("takeaway") and (today - d(e["date"])).days >= 7]
        old += [{**k, "date": r["rollup"] + "-01"} for r in rollups for k in r.get("keep", [])]
        if len(old) >= 2:
            pick = rng.sample(old, min(4, len(old)))
            return {"echo_day": True, "today": a.date,
                    "echoes": [{k: e.get(k) for k in ("date", "realm", "subtopic", "takeaway")} for e in pick]}

    last = {}
    for e in entries:
        if e.get("realm") and e["realm"] != ECHO:
            last[e["realm"]] = max(last.get(e["realm"], dt.date.min), d(e["date"]))
    names = [r["name"] for r in CONFIG["realms"] if r["name"] not in (a.exclude or [])]
    cd = CONFIG["cooldown_days_realm"]
    eligible = [n for n in names if n not in last or (today - last[n]).days >= cd]
    if not eligible:
        oldest = min(last.get(n, dt.date.min) for n in names)
        eligible = [n for n in names if last.get(n, dt.date.min) == oldest]
    weights = [realm_cfg(n)["weight"] for n in eligible]
    realm = rng.choices(eligible, weights=weights)[0]

    sub_cd = CONFIG["cooldown_days_subtopic"]
    avoid = [e["subtopic"] for e in entries
             if e.get("realm") == realm and e.get("subtopic") and (today - d(e["date"])).days < sub_cd]
    for r in rollups:
        for ri, sub, day in r.get("subtopics", []):
            if CONFIG["realms"][ri]["name"] == realm and (today - d(day)).days < sub_cd:
                avoid.append(sub)
    last_fmt = entries[-1].get("format") if entries else None

    roll = rng.random(); acc = 0.0; rarity = CONFIG["rarities"][0]
    for r in CONFIG["rarities"]:
        acc += r["chance"]
        if roll < acc:
            rarity = r; break

    rc = realm_cfg(realm)
    return {"echo_day": False, "today": a.date, "domain": realm, "realm": rc["realm"],
            "realm_emoji": rc["emoji"], "rarity": rarity["name"], "rarity_emoji": rarity["emoji"],
            "xp_on_offer": {"full": round(100 * rarity["mult"]), "two_minute": round(30 * rarity["mult"])},
            "formats": CONFIG["formats"], "avoid_format": last_fmt, "avoid_subtopics": avoid,
            "first_visit_ever": realm not in last and not any(realm in r.get("realms", []) for r in rollups)}

# ------------------------------------------------------------------ log ----

def cmd_log(a, entries, rollups, exists):
    try:
        e = json.loads(sys.stdin.read())
    except json.JSONDecodeError as exc:
        return {"ok": False, "error": f"invalid JSON on stdin: {exc}"}
    if e.get("done") not in (True, False, "2min"):
        return {"ok": False, "error": 'done must be true, false, or "2min"'}
    e["date"] = a.date
    today = d(a.date)
    is_echo = e.get("realm") == ECHO
    before = totals(entries, rollups)
    lvl_before = level_for(before["xp"])

    breakdown = []
    if done(e):
        if is_echo:
            breakdown.append(("Echo day survived", 120 if e["done"] is True else 40))
        else:
            mult = next((r["mult"] for r in CONFIG["rarities"] if r["name"] == e.get("rarity")), 1.0)
            base = 100 if e["done"] is True else 30
            label = "Quest complete" if e["done"] is True else "Speedrun (2-min)"
            if mult != 1.0: label += f" × {e.get('rarity')} {mult:g}"
            breakdown.append((label, round(base * mult)))
            month_realms = {x["realm"] for x in entries if done(x) and x["date"][:7] == a.date[:7]}
            if e.get("realm") not in month_realms:
                breakdown.append(("New territory this month", 25))
        if e.get("takeaway"):
            breakdown.append(("Loot captured (takeaway)", 10))
        past_days = sorted(x["date"] for x in entries if done(x))
        if past_days and (today - d(past_days[-1])).days >= 3:
            breakdown.append(("Welcome back", 20))
        if a.date in before["days"]:
            breakdown = [(f"{n} (second wind ½)", v // 2) for n, v in breakdown]
    e["xp"] = sum(v for _, v in breakdown)

    after_entries = entries + [e]
    after = totals(after_entries, rollups)
    earned = before["badges"]
    new = []
    def award(key, cond):
        if key not in earned and cond: new.append(key)
    if done(e):
        award("first_steps", after["quests"] >= 1)
        month = {x["realm"] for x in after_entries if done(x) and x["realm"] != ECHO and x["date"][:7] == a.date[:7]}
        award("cartographer", len(month) >= len(CONFIG["realms"]))
        award("speedrunner", after["speed"] >= 5)
        award("lucky_star", e.get("rarity") == "Legendary" and e["done"] is True)
        award("echo_keeper", after["echo"] >= 3)
        award("shapeshifter", set(CONFIG["formats"]) <= after["formats"])
        window = {x for x in after["days"] if 0 <= (today - d(x)).days < 10}
        award("hearthfire", len(window) >= 7)
        prev = sorted(x for x in before["days"] if x < a.date)
        award("boomerang", bool(prev) and (today - d(prev[-1])).days >= 7)
        award("moonlit", len({x for x in after["days"] if x[:7] == a.date[:7]}) >= 25)
        award("centurion", after["quests"] >= 100)
    if new: e["badges"] = new

    keep = {k: e.get(k) for k in ("date", "realm", "subtopic", "format", "rarity", "done", "xp", "takeaway", "badges") if e.get(k) is not None}
    line = line_for(keep)
    lvl_after = level_for(after["xp"])
    month_realms = {x["realm"] for x in after_entries if done(x) and x["realm"] != ECHO and x["date"][:7] == a.date[:7]}
    return {"ok": True, "line_to_append": line,
            "create_file": None if exists else FRONTMATTER + "\n" + line + "\n",
            "xp_breakdown": [{"reason": n, "xp": v} for n, v in breakdown], "xp_gained": e["xp"],
            "level": lvl_after, "leveled_up": lvl_after["level"] > lvl_before["level"],
            "title_changed": lvl_after["title"] != lvl_before["title"],
            "new_badges": [{"key": k, "emoji": BADGES[k][0], "name": BADGES[k][1], "why": BADGES[k][2]} for k in new],
            "quest_number": after["quests"], "realms_this_month": len(month_realms),
            "realms_total": len(CONFIG["realms"]),
            "needs_compact": len(entries) + 1 > CONFIG["compact_after_entries"]}

# -------------------------------------------------------------- journal ----

def cmd_journal(a, entries, rollups, rng):
    today = d(a.date)
    ym = a.month or mkey(today)
    y, m = map(int, ym.split("-"))
    dim = calendar.monthrange(y, m)[1]
    elapsed = today.day if ym == mkey(today) else (dim if dt.date(y, m, 1) < today else 0)
    month = [e for e in entries if e["date"][:7] == ym]
    roll = next((r for r in rollups if r["rollup"] == ym), None)
    done_days = sorted({e["date"] for e in month if done(e)})
    n_done = len(done_days) or (roll["counts"]["days"] if roll else 0)
    missed = max(0, elapsed - n_done)
    grace = min(missed, CONFIG["grace_days_per_month"])
    pct = round(min(100.0, n_done / max(1, elapsed - grace) * 100), 1) if elapsed else 0.0

    marks = {}
    for e in month:
        marks[e["date"]] = "✅" if e["done"] is True else "⚡" if e["done"] == "2min" else "💤"
        if e.get("realm") == ECHO and done(e): marks[e["date"]] = "🌀"
    first_wd = dt.date(y, m, 1).weekday()
    cells = ["  "] * first_wd + [marks.get(f"{ym}-{i:02d}", "⬜" if i <= elapsed else "·") for i in range(1, dim + 1)]
    grid = "Mo Tu We Th Fr Sa Su\n" + "\n".join(" ".join(cells[i:i + 7]) for i in range(0, len(cells), 7))

    touched = {e["realm"] for e in month if done(e) and e["realm"] != ECHO} | set(roll.get("realms", []) if roll else [])
    realm_map = [{"emoji": r["emoji"], "realm": r["realm"], "domain": r["name"], "visited": r["name"] in touched}
                 for r in CONFIG["realms"]]
    t = totals(entries, rollups)
    all_days = sorted(t["days"])
    gaps = [(d(b) - d(a_)).days for a_, b in zip(all_days, all_days[1:])]
    pool = [e for e in entries if e.get("takeaway") and (today - d(e["date"])).days >= 7] or [e for e in entries if e.get("takeaway")]
    pick = rng.choice(pool) if pool else None
    return {"month": ym, "completion_pct": pct, "quest_days": n_done, "elapsed_days": elapsed,
            "grace_days_used": grace, "month_xp": sum(e.get("xp", 0) for e in month) + (roll["xp"] if roll else 0),
            "calendar": grid, "legend": "✅ full  ⚡ 2-min  🌀 echo  💤 skipped  ⬜ no quest  · future",
            "realm_map": realm_map, "level": level_for(t["xp"]), "lifetime_quests": t["quests"],
            "badges": [{"emoji": BADGES[k][0], "name": BADGES[k][1], "why": BADGES[k][2]} for k in BADGES if k in t["badges"]],
            "badges_locked": [{"emoji": "🔒", "name": BADGES[k][1], "why": BADGES[k][2]} for k in BADGES if k not in t["badges"]],
            "longest_break_days": max(gaps) if gaps else 0,
            "unearthed_loot": {k: pick.get(k) for k in ("date", "realm", "subtopic", "takeaway")} if pick else None}

# -------------------------------------------------------------- compact ----

def cmd_compact(a, entries, rollups):
    today = d(a.date)
    cutoff = a.keep_days if a.keep_days is not None else CONFIG["keep_raw_days"]
    old = [e for e in entries if (today - d(e["date"])).days > cutoff]
    keep_raw = [e for e in entries if (today - d(e["date"])).days <= cutoff]
    by_month = {r["rollup"]: r for r in rollups}
    for e in old:
        ym = e["date"][:7]
        r = by_month.setdefault(ym, {"rollup": ym, "xp": 0, "counts": {"quests": 0, "days": 0, "speed": 0, "echo": 0, "formats": []},
                                     "realms": [], "subtopics": [], "badges": [], "keep": []})
        r["xp"] += e.get("xp", 0); r["badges"] = sorted(set(r["badges"]) | set(e.get("badges", [])))
        c = r["counts"]
        if done(e):
            c["quests"] += 1
            if e.get("done") == "2min": c["speed"] += 1
            if e.get("realm") == ECHO: c["echo"] += 1
            else:
                if e.get("format") and e["format"] not in c["formats"]: c["formats"].append(e["format"])
                if e.get("realm") not in r["realms"]: r["realms"].append(e["realm"])
        rc = realm_cfg(e.get("realm"))
        if e.get("subtopic") and rc: r["subtopics"].append([CONFIG["realms"].index(rc), e["subtopic"], e["date"]])
        if e.get("takeaway") and e.get("realm") != ECHO:
            r["keep"].append({k: e.get(k) for k in ("realm", "subtopic", "takeaway")})
    for ym, r in by_month.items():
        r["subtopics"] = [x for x in r["subtopics"] if (today - d(x[2])).days < CONFIG["cooldown_days_subtopic"]]
        days = {e["date"] for e in old if e["date"][:7] == ym and done(e)}
        r["counts"]["days"] += len(days)
        if len(r["keep"]) > 3:
            r["keep"] = random.Random(ym).sample(r["keep"], 3)
    body = [line_for(by_month[k]) for k in sorted(by_month)] + [line_for(e) for e in keep_raw]
    return {"ok": True, "rolled_up_entries": len(old),
            "full_file": FRONTMATTER + "\n" + "\n".join(body) + "\n"}

# ----------------------------------------------------------------- main ----

def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["roll", "log", "journal", "compact"])
    p.add_argument("--mem", default=None, help="Path to a dump of the memory file (missing = new player)")
    p.add_argument("--date", default=dt.date.today().isoformat(), help="User's local date, YYYY-MM-DD")
    p.add_argument("--month", default=None)
    p.add_argument("--exclude", action="append", help="Realm (domain) name to skip — used for a reroll")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--keep-days", type=int, default=None, help="compact: keep only this many days raw (use a small number if memory is full)")
    a = p.parse_args()
    rng = random.Random(a.seed) if a.seed is not None else random.Random()
    entries, rollups, exists = load_state(a.mem)
    out = {"roll": lambda: cmd_roll(a, entries, rollups, rng),
           "log": lambda: cmd_log(a, entries, rollups, exists),
           "journal": lambda: cmd_journal(a, entries, rollups, rng),
           "compact": lambda: cmd_compact(a, entries, rollups)}[a.cmd]()
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
