export const API_BASE = "https://api.kartoons.to/api";
export const SITE_BASE = "https://kartoons.to";

export const commonHeaders = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "referer": "https://kartoons.to/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
};
import { ProviderContext } from "../types";


const SESSION_KEY = "kartoons_auth_session";
interface KartoonsSession {
  accessToken: string;
  userAgent: string;
}
const pendingSessions = new WeakMap<ProviderContext, Promise<KartoonsSession>>();

// Read only Kartoons' login token, never form fields or passwords. Verify it in
// the browser before resolving the dialog, then verify it again in the provider.
export const loginScript = `
(function () {
  if (window.__vegaKartoonsLogin) return;
  window.__vegaKartoonsLogin = true;
  var busy = false, done = false;
  async function poll() {
    if (done || busy) return;
    busy = true;
    try {
      var token = localStorage.getItem("token");
      if (token) {
        var res = await window.fetch("https://api.kartoons.to/api/auth/me", {
          headers: { Authorization: "Bearer " + token, Accept: "application/json" }
        });
        if (res.ok) {
          var body = await res.json();
          var user = body.data || body;
          user = user.user || user;
          if (user && (user.id || user._id || user.username) && window.ReactNativeWebView) {
            done = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              __waf: true,
              data: JSON.stringify({ kartoonsAuth: true, accessToken: token })
            }));
          }
        } else if (res.status === 401 && localStorage.getItem("token") === token) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    } catch (e) {}
    busy = false;
    if (!done) setTimeout(poll, 1000);
  }
  poll();
})(); true;
`;

async function validateSession(session: KartoonsSession, context: ProviderContext, signal?: AbortSignal): Promise<boolean> {
  let response: any;
  try {
    response = await context.axios.get(`${API_BASE}/auth/me`, {
      headers: {...commonHeaders, Authorization: `Bearer ${session.accessToken}`, "user-agent": session.userAgent},
      signal, timeout: 15000, validateStatus: () => true,
    });
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) return false;
    throw new Error("Kartoons could not validate your sign-in. Please try again.");
  }
  if (response.status === 401 || response.status === 403) return false;
  if (response.status < 200 || response.status >= 300) throw new Error("Kartoons sign-in validation is temporarily unavailable");
  const data = response.data?.data || response.data;
  const user = data?.user || data;
  return Boolean(user && typeof user === "object" && (user.id || user._id || user.username));
}

async function getSession(context: ProviderContext, signal?: AbortSignal, force = false): Promise<KartoonsSession> {
  const pending = pendingSessions.get(context);
  if (pending) return pending;
  const request = (async () => {
    let saved: any;
    if (!force) {
      try {
        saved = await context.kvStore?.get(SESSION_KEY);
        if (typeof saved === "string") saved = JSON.parse(saved);
      } catch {}
      if (typeof saved?.accessToken === "string" && saved.accessToken.trim()) {
        const session = {accessToken: saved.accessToken.trim(), userAgent: saved.userAgent || commonHeaders["user-agent"]};
        if (await validateSession(session, context, signal)) return session;
      }
    }
    await context.kvStore?.delete(SESSION_KEY);
    if (force || saved) await context.kvStore?.delete("kartoons_challenge_token");
    if (signal?.aborted) throw new Error("Kartoons sign-in cancelled");
    if (!context.openWebView) throw new Error("Sign in to Kartoons to use this provider");
    const result = await context.openWebView(`${SITE_BASE}/login`, {
      title: "Sign in to Kartoons",
      description: "A Kartoons account is required. Sign in to continue using this provider.",
      force: true, timeoutMs: 300000, injectedJavaScript: loginScript,
    });
    let payload: any = result?.data;
    try {
      for (let i = 0; i < 3; i++) {
        if (typeof payload === "string") payload = JSON.parse(payload);
        if (payload?.kartoonsAuth) break;
        payload = payload?.data;
      }
    } catch { payload = null; }
    if (payload?.kartoonsAuth !== true || typeof payload.accessToken !== "string" || !payload.accessToken.trim()) {
      throw new Error("Sign in to Kartoons to continue. No authenticated session was returned.");
    }
    const session = {accessToken: payload.accessToken.trim(), userAgent: result.userAgent || commonHeaders["user-agent"]};
    if (!await validateSession(session, context, signal)) throw new Error("Kartoons sign-in has expired or was rejected. Please sign in again.");
    await context.kvStore?.set(SESSION_KEY, session);
    return session;
  })();
  pendingSessions.set(context, request);
  try { return await request; }
  finally { if (pendingSessions.get(context) === request) pendingSessions.delete(context); }
}

export async function withKartoonsAuth(context: ProviderContext, signal?: AbortSignal): Promise<ProviderContext> {
  let session = await getSession(context, signal);
  const request = async (method: "get" | "post", url: string, data: any, config: any = {}) => {
    // Never forward the account token to worker playlists, segments or subtitles.
    if (!url.startsWith(API_BASE + "/")) {
      return method === "get" ? context.axios.get(url, config) : context.axios.post(url, data, config);
    }
    const send = () => {
      const headers = {...commonHeaders, ...config.headers, Authorization: `Bearer ${session.accessToken}`};
      delete headers.authorization;
      headers["user-agent"] = session.userAgent;
      delete headers["User-Agent"];
      const options = {...config, headers};
      return method === "get" ? context.axios.get(url, options) : context.axios.post(url, data, options);
    };
    let response: any;
    try { response = await send(); }
    catch (error: any) {
      if (error.response?.status !== 401) throw error;
      response = error.response;
    }
    if (response.status === 401) {
      session = await getSession(context, config.signal || signal, true);
      try { response = await send(); }
      catch (error: any) {
        if (error.response?.status !== 401) throw error;
        response = error.response;
      }
      if (response.status === 401) {
        await context.kvStore?.delete(SESSION_KEY);
        throw new Error("Kartoons rejected your login. Please sign in again.");
      }
    }
    return response;
  };
  return {...context, axios: {
    ...context.axios,
    get: (url: string, config?: any) => request("get", url, undefined, config),
    post: (url: string, data?: any, config?: any) => request("post", url, data, config),
  } as ProviderContext["axios"]};
}
