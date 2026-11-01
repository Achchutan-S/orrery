// Server-side authorization interface (blueprint 2, ADR-010). Implemented in Phase 4.
//
// What this stub guarantees: it denies every request, so nothing can be granted
// access by calling it early. What it does not do: identify anyone, read sessions,
// or protect anything. In Phases 0–3 every mounted page is public by construction
// (release resolution at build time); non-public experiences are simply not built.
// Never call authorize() from browser code: a client-side check is not a boundary.

export type Subject = { kind: 'anonymous' } | { kind: 'account'; id: string };
export type Action = 'view';
export type Decision =
  | { allowed: true }
  | { allowed: false; reason: 'not-implemented' };

export function authorize(_subject: Subject, _experienceId: string, _action: Action = 'view'): Decision {
  return { allowed: false, reason: 'not-implemented' };
}
