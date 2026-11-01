// A deliberately small history router: pushState, popstate and real <a href> links.
// ponytail: no nested layouts, loaders or params parsing; adopt a router library when
// an experience needs them.
import { useCallback, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

export type Location = { path: string; search: string };
export type Navigate = (to: string) => void;

const read = (base: string): Location => ({
  path: decodeURI(location.pathname).slice(base.length + 1),
  search: location.search,
});

/** `initial` must match what the server rendered, so hydration does not mismatch. */
export function useRouter(base: string, initial: Location): [Location, Navigate] {
  const [loc, setLoc] = useState(initial);
  useEffect(() => {
    const sync = () => setLoc(read(base));
    sync(); // the server render could not know the query string
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, [base]);
  const navigate = useCallback<Navigate>((to) => {
    history.pushState(null, '', `${base}/${to}`);
    setLoc(read(base));
  }, [base]);
  return [loc, navigate];
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { base: string; to: string; navigate: Navigate };

/** A real link: works without JavaScript, opens in new tabs, and navigates in-app on a plain click. */
export function Link({ base, to, navigate, ...rest }: LinkProps) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={`${base}/${to}`} onClick={onClick} {...rest} />;
}
