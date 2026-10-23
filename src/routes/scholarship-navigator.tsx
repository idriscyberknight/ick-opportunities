// ICK-owned auth storage. Derived from the reviewed Lovable broker protocol.
// Review alongside vite.config.ts when the generated integration changes.

/** Storage accepted by Supabase's `auth.storage` option; `localStorage` and the editor broker both satisfy it. */
export interface PreviewAuthStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}


/**
 * Preserve normal cross-tab localStorage reads. If a write is blocked,
 * keep that key in memory for this page lifetime.
 * A failed durable deletion is reported rather than silently called success.
 */
export function createSafeBrowserStorage(
  getStorage: () => Storage = () => window.localStorage,
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const pending = new Map<string, string | null>();
  const cache = new Map<string, string | null>();
  return {
    getItem(key) {
      if (pending.has(key)) return pending.get(key) ?? null;
      try {
        const value = getStorage().getItem(key) || null;
        cache.set(key, value);
        return value;
      } catch {
        return cache.get(key) ?? null;
      }
    },
    setItem(key, value) {
      cache.set(key, value);
      try {
        getStorage().setItem(key, value);
        pending.delete(key);
      } catch {
        pending.set(key, value);
      }
    },
    removeItem(key) {
      cache.delete(key);
      pending.set(key, null);
      try {
        getStorage().removeItem(key);
        pending.delete(key);
      } catch {
        try {
          // Existing broker protocol uses an empty string as a logout tombstone.
          getStorage().setItem(key, '');
          pending.delete(key);
        } catch {
          throw new Error(
            'Auth storage could not be cleared. Allow site storage and retry sign out.',
          );
        }
      }
    },
  };
}

type BrokerRequestType = 'lovable-preview-auth:get' | 'lovable-preview-auth:set' | 'lovable-preview-auth:remove';

interface BrokerRequest {
  type: BrokerRequestType;
  requestId: string;
  projectId: string;
  key: string;
  value?: string;
}

interface BrokerReply {
  ok: boolean;
  value: string | null;
}

const RESULT = 'lovable-preview-auth:result';

function readBrokerReply(data: unknown, requestId: string): BrokerReply | null {
  if (typeof data !== 'object' || data === null) return null;
  if (!('type' in data) || data.type !== RESULT) return null;
  if (!('requestId' in data) || data.requestId !== requestId) return null;
  if (!('ok' in data) || typeof data.ok !== 'boolean') return null;
  if (!('value' in data) || (data.value !== null && typeof data.value !== 'string')) return null;
  return {
    ok: data.ok,
    value: data.value,
  };
}

/**
 * On a Lovable preview surface, broker the auth session to the editor over
 * postMessage so the project's preview surfaces share one login; else localStorage.
 */
export function brokeredPreviewStorage(): PreviewAuthStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  const browserStorage = createSafeBrowserStorage();
  const host = location.hostname;
  const PREVIEW_ZONES = ['lovableproject.com', 'lovableproject-dev.com', 'lovable.app', 'gpt-eng.com', 'gptengineer.run'];
  const onPreviewZone = PREVIEW_ZONES.some((z) => host === z || host.endsWith('.' + z));
  // Read the id only from non-user-controlled host positions, so a user-named
  // preview--<name> host can't smuggle another project's id.
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  const projectId = onPreviewZone
    ? (new RegExp('^(?:id-preview(?:-[a-z0-9]+)?|project)--(' + UUID + ')(?:-dev)?(?=\\.|$)', 'i').exec(host)?.[1]
        ?? new RegExp('^(' + UUID + ')(?=[.-])', 'i').exec(host)?.[1])
    : undefined;
  // lib.dom types window.parent and location.ancestorOrigins as always set, but a
  // detached frame has no parent and not every browser implements ancestorOrigins.
  const parentWindow = window.parent as Window | null;
  const framed = parentWindow !== null && parentWindow !== window;
  if (!projectId || !framed) return browserStorage;

  // Post only to the real editor ancestor, validated as a Lovable origin, so the
  // session token can never reach an untrusted embedder.
  const dev = host.endsWith('.lovableproject-dev.com') || host.endsWith('.gpt-eng.com');
  const EDITOR = dev
    ? /^https:\/\/([a-z0-9-]+\.)*(lovable\.dev|gptengineer\.app)$|^http:\/\/localhost:3000$/
    : /^https:\/\/([a-z0-9-]+\.)*(lovable\.dev|gptengineer\.app)$/;
  const ancestorOrigins = location.ancestorOrigins as DOMStringList | undefined;
  let referrerOrigin = '';
  try { referrerOrigin = document.referrer ? new URL(document.referrer).origin : ''; } catch { /* Ignore malformed referrers. */ }
  const ancestor = ancestorOrigins?.[0] ?? referrerOrigin;
  const editorOrigins = ancestor && EDITOR.test(ancestor)
    ? [ancestor]
    : (dev ? ['https://lovable.dev', 'http://localhost:3000'] : ['https://lovable.dev']);
  const TIMEOUT = 2000;
  const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const request = (type: BrokerRequestType, key: string, value?: string): Promise<BrokerReply | null> =>
    new Promise((resolve) => {
      const requestId = newId();
      let done = false;
      const finish = (reply: BrokerReply | null) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(reply);
      };
      const onMessage = (e: MessageEvent<unknown>) => {
        if (e.source !== parentWindow) return;
        if (!editorOrigins.includes(e.origin)) return;
        const reply = readBrokerReply(e.data, requestId);
        if (reply) finish(reply);
      };
      window.addEventListener('message', onMessage);
      const timer = setTimeout(() => { finish(null); }, TIMEOUT);
      const msg: BrokerRequest = { type, requestId, projectId, key };
      if (value !== undefined) msg.value = value;
      // targetOrigin per trusted editor origin, so a session token never reaches an arbitrary embedder.
      try {
        for (const origin of editorOrigins) parentWindow.postMessage(msg, origin);
      } catch {
        finish(null);
      }
    });

  // The editor may not be listening yet at the first getItem, so retry once.
  let firstGet = true;
  const RETRY_DELAY = 250;
  // Blocked third-party storage throws here; seeding must not break broker reads.
  const readLocal = (key: string): string | null | undefined => { try { return browserStorage.getItem(key); } catch { return undefined; } };

  return {
    getItem: async (key) => {
      // Sent with GET and REMOVE so an editor that never cached this session can check or revoke it.
      const local = readLocal(key);
      let res = await request('lovable-preview-auth:get', key, local ?? undefined);
      if (!res && firstGet) {
        await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY));
        res = await request('lovable-preview-auth:get', key, local ?? undefined);
      }
      firstGet = false;
      // '' is the logout tombstone: clear the local copy too so it can't resurrect if
      // the broker later goes silent. A null value means never-synced -> keep local.
      if (res?.ok && res.value !== null) {
        if (res.value === '') {
          if (local !== undefined && readLocal(key) === local) browserStorage.removeItem(key);
          return null;
        }
        // Seed this origin so a new tab, whose editor holds no session, stays signed in.
        if (local === null && readLocal(key) === null) {
          try { browserStorage.setItem(key, res.value); } catch { /* storage full: still return the editor's session */ }
        }
        return res.value;
      }
      return browserStorage.getItem(key);
    },
    setItem: (key, value) => {
      browserStorage.setItem(key, value);
      return request('lovable-preview-auth:set', key, value).then((res) => {
        if (res?.ok && res.value !== null && browserStorage.getItem(key) === value) {
          if (res.value === '') browserStorage.removeItem(key);
          else browserStorage.setItem(key, res.value);
        }
      });
    },
    removeItem: (key) => {
      const local = readLocal(key);
      browserStorage.removeItem(key);
      return request('lovable-preview-auth:remove', key, local ?? undefined).then(() => {});
    },
  };
}

        
