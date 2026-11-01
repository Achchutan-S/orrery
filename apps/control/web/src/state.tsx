// Server state for the whole app: one read of registry, release and pending changes, a
// restrained poll for edits made outside the Control Center, and the live announcer.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Issue, PendingData, RegistryData, ReleaseData } from '@pu/platform-schema';
import { createClient, failureOf, type Client } from './api.ts';

export type Data = { registry: RegistryData; release: ReleaseData; pending: PendingData };
export type Connection = 'connecting' | 'ready' | 'unavailable';

type Control = {
  client: Client;
  connection: Connection;
  data: Data | null;
  /** The server stopped answering after the app had loaded. */
  lost: boolean;
  /** A revision found on disk while an edit was in progress: the edit is based on older state. */
  externalRevision: string | null;
  /** Set after the server answered CATALOG_INVALID: editing is off until the code is fixed. */
  readOnly: Issue[] | null;
  setReadOnly: (issues: Issue[]) => void;
  connect: () => Promise<void>;
  /** Re-reads everything. Resolves to the new revision. */
  refresh: () => Promise<string | undefined>;
  announce: (message: string) => void;
  /** Editors register while a change is being prepared, so polling never refreshes under them. */
  useEditing: (active: boolean) => void;
};

const Ctx = createContext<Control | null>(null);
export const useControl = (): Control => useContext(Ctx)!;

export const POLL_MS = 5000;

export function ControlProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createClient);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [data, setData] = useState<Data | null>(null);
  const [lost, setLost] = useState(false);
  const [externalRevision, setExternalRevision] = useState<string | null>(null);
  const [readOnly, setReadOnlyState] = useState<Issue[] | null>(null);
  const [message, setMessage] = useState('');
  const revision = useRef<string | undefined>(undefined);
  const editors = useRef(0);
  const busy = useRef(false);

  const announce = useCallback((m: string) => {
    setMessage('');
    requestAnimationFrame(() => setMessage(m));
  }, []);

  const load = useCallback(async () => {
    const [registry, release, pending] = await Promise.all([client.registry(), client.release(), client.pending()]);
    revision.current = release.data.revision;
    setData({ registry: registry.data, release: release.data, pending: pending.data });
    setExternalRevision(null);
    setLost(false);
    return release.data.revision;
  }, [client]);

  const refresh = useCallback(async () => {
    busy.current = true;
    try {
      return await load();
    } catch (e) {
      if (failureOf(e).kind === 'unavailable') setLost(true);
      throw e;
    } finally {
      busy.current = false;
    }
  }, [load]);

  const connect = useCallback(async () => {
    setConnection('connecting');
    try {
      await client.session();
      await load();
      setConnection('ready');
    } catch {
      setConnection('unavailable');
    }
  }, [client, load]);

  useEffect(() => { void connect(); }, [connect]);

  // Poll the release file. Paused while the tab is hidden; never overlapping; never refreshing
  // under an open editor (it only flags that the file moved).
  useEffect(() => {
    if (connection !== 'ready') return;
    const tick = async () => {
      if (document.hidden || busy.current) return;
      busy.current = true;
      try {
        const { data: now } = await client.release();
        setLost(false);
        if (now.revision !== revision.current) {
          if (editors.current > 0) setExternalRevision(now.revision);
          else {
            await load();
            announce('config/release.json changed outside the Control Center. Every view now shows the file as it is.');
          }
        }
      } catch (e) {
        if (failureOf(e).kind === 'unavailable') setLost(true);
      } finally {
        busy.current = false;
      }
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) void tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [connection, client, load, announce]);

  const useEditing = (active: boolean) => {
    useEffect(() => {
      if (!active) return;
      editors.current += 1;
      return () => { editors.current -= 1; };
    }, [active]);
  };

  const value: Control = {
    client, connection, data, lost, externalRevision, readOnly,
    setReadOnly: setReadOnlyState, connect, refresh, announce, useEditing,
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      <p className="visually-hidden" role="status" aria-live="polite">{message}</p>
    </Ctx.Provider>
  );
}
