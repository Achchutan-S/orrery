// The house script, on every page (about 1 KB): remembers which chapters this visitor has seen,
// in this browser only, so the opening can offer "continue" and the corridor can suggest a door
// not yet opened. Storage can be missing or refuse (private windows, blocked site data); every
// page works the same without it.
const VISITED = 'seeing:visited';
const LAST = 'seeing:last';

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage refused: nothing to remember */ } };

const header = document.querySelector<HTMLElement>('.see-sightline');
const here = header?.dataset.here;
const visited = new Set((read(VISITED) ?? '').split(' ').filter(Boolean));
if (here && header?.hasAttribute('data-chapter')) {
  visited.add(here);
  write(VISITED, [...visited].join(' '));
  write(LAST, here);
}

// The corridor's door: the first related chapter this visitor has not opened.
const door = document.querySelector<HTMLElement>('[data-doors]');
const link = door?.querySelector<HTMLAnchorElement>('[data-door]');
if (door && link) {
  const unseen = (door.dataset.doors ?? '').split(' ').find((id) => !visited.has(id));
  if (unseen) {
    link.href = `/seeing/${unseen}`;
    link.textContent = document.querySelector(`.see-atlas a[href="/seeing/${unseen}"]`)?.textContent ?? unseen;
  } else {
    door.querySelector('span')!.textContent = 'You have opened every door from here. Try another:';
  }
}

// The opening's "continue": only when there is somewhere to continue to.
const resume = document.querySelector<HTMLAnchorElement>('[data-resume]');
const last = read(LAST);
const lastTitle = last ? document.querySelector(`.see-atlas a[href="/seeing/${last}"]`)?.textContent : null;
if (resume && last && lastTitle) {
  resume.href = `/seeing/${last}`;
  resume.querySelector('[data-resume-title]')!.textContent = lastTitle;
  resume.hidden = false;
}
