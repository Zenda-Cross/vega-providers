import { ProviderContext } from "../types";

export const SITE_BASE = "https://kartoons.to";
export const API_BASE = "https://api.kartoons.to/api/cloudstream";
export const commonHeaders = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  referer: SITE_BASE + "/",
  origin: SITE_BASE,
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
};

const SESSION_KEY = "kartoons_device_session";
interface DeviceSession { token: string; userAgent: string }
const pendingSessions = new WeakMap<ProviderContext, Promise<DeviceSession>>();

export async function applyCredentialReset(context: ProviderContext): Promise<void> {
  if (await context.kvStore?.get("kartoons_clear_credentials") !== true) return;
  for (const key of [SESSION_KEY, "kartoons_auth_session", "kartoons_challenge_token"]) {
    await context.kvStore.delete(key);
  }
  await context.kvStore.set("kartoons_clear_credentials", false);
  pendingSessions.delete(context);
}

// Matches the official Cloudstream plugin: generate a code, link the device on
// the website, and persist the device-status token. Account JWTs stay in the site.
export function deviceLoginScript(code: string, intervalMs: number): string {
  return `
(function () {
  if (window.__vegaKartoonsDevice) return;
  window.__vegaKartoonsDevice = true;
  var done = false;
  async function poll() {
    try {
      var res = await window.fetch(${JSON.stringify(API_BASE + "/device/status?code=" + encodeURIComponent(code))}, {headers:{Accept:"application/json"}});
      if (res.ok) {
        var body = await res.json();
        var data = body.data || body;
        if (data.status === "linked" && typeof data.token === "string" && data.token) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({__waf:true,data:JSON.stringify({
              kartoonsDevice:true,code:${JSON.stringify(code)},token:data.token
            })}));
            done = true;
          }
        }
        if (data.status === "expired") return;
      }
    } catch (e) {}
    if (!done) setTimeout(poll, ${intervalMs});
  }
  poll();
})(); true;`;
}

async function getSession(context: ProviderContext, signal?: AbortSignal, force = false): Promise<DeviceSession> {
  await applyCredentialReset(context);
  const pending = pendingSessions.get(context);
  if (pending) return pending;
  const request = (async () => {
    if (!force) {
      let saved: any = await context.kvStore?.get(SESSION_KEY);
      try { if (typeof saved === "string") saved = JSON.parse(saved); } catch { saved = null; }
      if (typeof saved?.token === "string" && saved.token.trim()) {
        return {token:saved.token.trim(),userAgent:saved.userAgent || commonHeaders["user-agent"]};
      }
    }
    if (signal?.aborted) throw new Error("Kartoons account linking cancelled");
    if (!context.openWebView) throw new Error("Link your Kartoons account to use this provider");
    let response: any;
    try {
      response = await context.axios.post(`${API_BASE}/device/code`, {}, {
        headers:commonHeaders,signal,timeout:15000,validateStatus:()=>true,
      });
    } catch { throw new Error("Could not generate a Kartoons login code. Please try again."); }
    const data = response.data?.data || response.data;
    if (response.status !== 200 || data?.success === false || !/^[A-Z0-9]{6}$/i.test(data?.code || "")) {
      throw new Error(`Could not generate a Kartoons login code (HTTP ${response.status})`);
    }
    const code = data.code;
    const expiresMs = Math.max(1000, Math.min(600000, (Number(data.expires_in) || 600) * 1000));
    const expiresAt = Date.now() + expiresMs;
    const intervalMs = Math.max(5000, Math.min(30000, (Number(data.poll_interval) || 5) * 1000));
    const redirect = `/cloudstream/link?code=${encodeURIComponent(code)}`;
    const result = await context.openWebView(`${SITE_BASE}/login?redirect=${encodeURIComponent(redirect)}`, {
      title:"Link your Kartoons account",
      description:`Sign in and approve code ${code} to link Vega to your Kartoons account.`,
      force:true, timeoutMs:Math.min(300000,expiresMs), injectedJavaScript:deviceLoginScript(code,intervalMs),
    });
    let payload: any = result?.data;
    try {
      for (let i=0;i<3;i++) {
        if (typeof payload === "string") payload = JSON.parse(payload);
        if (payload?.kartoonsDevice) break;
        payload = payload?.data;
      }
    } catch { payload = null; }
    if (Date.now() >= expiresAt) throw new Error("Kartoons login code expired. Please link your account again.");
    if (payload?.kartoonsDevice !== true || !/^[A-Z0-9]{6}$/i.test(payload.code || "") || typeof payload.token !== "string" || !payload.token.trim()) {
      throw new Error("Kartoons account was not linked. Complete the device-code approval to continue.");
    }
    // The app can coalesce simultaneous catalogue login dialogs. Accept the
    // shared dialog's code only if its server status confirms the same token.
    if (payload.code !== code) {
      let linked: any;
      try {
        const status = await context.axios.get(`${API_BASE}/device/status?code=${encodeURIComponent(payload.code)}`, {
          headers:commonHeaders,signal,timeout:15000,validateStatus:()=>true,
        });
        if (status.status === 200) linked = status.data?.data || status.data;
      } catch {}
      if (linked?.status !== "linked" || linked.token !== payload.token) {
        throw new Error("Kartoons account was not linked to this device. Please retry.");
      }
    }
    const session = {token:payload.token.trim(),userAgent:result.userAgent || commonHeaders["user-agent"]};
    await context.kvStore?.set(SESSION_KEY,session);
    // Retire the previous website-JWT flow after successful migration.
    await context.kvStore?.delete("kartoons_auth_session");
    await context.kvStore?.delete("kartoons_challenge_token");
    return session;
  })();
  pendingSessions.set(context,request);
  try { return await request; }
  finally { if (pendingSessions.get(context) === request) pendingSessions.delete(context); }
}

/** Start or reuse the device link from catalog initialization only. */
export async function initializeKartoons(context: ProviderContext, signal?: AbortSignal): Promise<void> {
  await getSession(context,signal);
}

export async function withKartoonsAuth(context: ProviderContext, signal?: AbortSignal): Promise<ProviderContext> {
  await applyCredentialReset(context);
  let saved: any = await context.kvStore?.get(SESSION_KEY);
  try { if (typeof saved === "string") saved = JSON.parse(saved); } catch { saved = null; }
  if (typeof saved?.token !== "string" || !saved.token.trim()) {
    throw new Error("Open the Kartoons catalog to link your account before using this provider.");
  }
  let session: DeviceSession = {token:saved.token.trim(),userAgent:saved.userAgent || commonHeaders["user-agent"]};
  const request = async (method:"get"|"post", url:string, data:any, config:any = {}) => {
    if (!url.startsWith(API_BASE + "/")) {
      return method === "get" ? context.axios.get(url,config) : context.axios.post(url,data,config);
    }
    const send = async () => {
      const target = new URL(url);
      target.searchParams.set("token",session.token);
      const headers = {...commonHeaders,...config.headers,"user-agent":session.userAgent};
      delete headers.Authorization; delete headers.authorization; delete headers["User-Agent"];
      try {
        const options = {...config,headers,validateStatus:()=>true};
        return method === "get" ? await context.axios.get(target.href,options) : await context.axios.post(target.href,data,options);
      } catch (error: any) {
        if (error.response) return error.response;
        // Do not include the credential-bearing request URL in provider errors.
        throw new Error("Kartoons request could not connect. Your linked account has been kept; please retry.");
      }
    };
    const rejected = (r:any) => r.status === 401 || r.data?.auth_required === true || r.data?.authRequired === true;
    let response = await send();
    if (rejected(response)) {
      await context.kvStore?.delete(SESSION_KEY);
      throw new Error("Kartoons rejected the device link. Open the Kartoons catalog to link your account again.");
    }
    if (response.status >= 400) throw new Error(`Kartoons request failed (HTTP ${response.status}). Your linked account has been kept.`);
    return response;
  };
  return {...context,commonHeaders:{...context.commonHeaders,"user-agent":session.userAgent},axios:{
    ...context.axios,
    get:(url:string,config?:any)=>request("get",url,undefined,config),
    post:(url:string,data?:any,config?:any)=>request("post",url,data,config),
  } as ProviderContext["axios"]};
}
