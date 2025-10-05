import { ProviderContext, Stream } from "../types";

const DEFAULT_HEADERS = {
  Accept: "application/json, text/html, */*",
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

function normalizeUrl(base: string, href: string) {
  if (!href) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  try {
    const u = new URL(href, base);
    return u.href;
  } catch {
    return href;
  }
}

async function fetchJsonOrText(url: string, providerContext: ProviderContext, signal?: AbortSignal) {
  const { axios } = providerContext;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, signal });
  return res.data;
}

async function extractFromOxxApi(apiUrl: string, providerContext: ProviderContext, signal?: AbortSignal): Promise<Stream[]> {
  const streams: Stream[] = [];
  try {
    const data = await fetchJsonOrText(apiUrl, providerContext, signal);

    if (typeof data === "object") {
      if (data.url) streams.push({ server: "oxxfile", link: data.url, type: "movie" });
      if (Array.isArray(data.links)) {
        data.links.forEach((l: any) => l?.url && streams.push({ server: "oxxfile", link: l.url, type: l.type || "movie" }));
      }
      if (data.data && typeof data.data === "object") {
        if (data.data.url) streams.push({ server: "oxxfile", link: data.data.url, type: data.data.type || "movie" });
        if (Array.isArray(data.data.links)) {
          data.data.links.forEach((l: any) => l?.url && streams.push({ server: "oxxfile", link: l.url, type: l.type || "movie" }));
        }
      }
      // Scan any string values for hubcloud
      Object.values(data).forEach((v: any) => {
        if (typeof v === "string" && v.includes("hubcloud")) streams.push({ server: "oxxfile", link: v, type: "movie" });
        if (Array.isArray(v)) v.forEach((it) => { if (typeof it === "string" && it.includes("hubcloud")) streams.push({ server: "oxxfile", link: it, type: "movie" }); });
      });
    }

    if (typeof data === "string") {
      const regex = /https?:\/\/[^\s"'<>]+(?:hubcloud|oxxfile|multiup|drive)[^\s"'<>]*/gi;
      const matches = data.match(regex) || [];
      matches.forEach((m) => streams.push({ server: "oxxfile", link: m, type: "movie" }));
    }
  } catch {}
  return streams;
}

async function extractFromHubCloudPage(hubUrl: string, providerContext: ProviderContext, signal?: AbortSignal): Promise<Stream[]> {
  const streams: Stream[] = [];
  const { axios, cheerio } = providerContext;


  try {
    const res = await axios.get(hubUrl, { headers: DEFAULT_HEADERS, signal });
    const html = res.data;

    const $ = cheerio.load(typeof html === "string" ? html : String(html));

    $("a,button").each((_, el) => {
      const href = $(el).attr("href") || $(el).attr("data-href") || $(el).attr("data-url") || "";
      const text = ($(el).text() || "").toLowerCase();
      const candidate = href || text;
      if (/hubcloud|download|\.mkv|\.mp4|drive|filepress|multiup|oxxfile/i.test(candidate)) {
        const url = href ? normalizeUrl(hubUrl, href) : candidate;
        streams.push({ server: "hubcloud", link: url, type: "movie" });
      }
    });

    $("script").each((_, s) => {
      const txt = $(s).html() || "";
      const regex = /https?:\/\/[^\s"'<>]+(?:download|hubcloud|oxxfile|multiup|drive|filepress)[^\s"'<>]*/gi;
      const matches = txt.match(regex) || [];
      matches.forEach((m) => streams.push({ server: "hubcloud", link: m, type: "movie" }));
    });
  } catch {}

  return streams;
}

async function genericPageScan(url: string, providerContext: ProviderContext, signal?: AbortSignal): Promise<Stream[]> {
  const streams: Stream[] = [];
  const { axios } = providerContext;
  try {
    const res = await axios.get(url, { headers: DEFAULT_HEADERS, signal });
    const html = res.data;
    const regex = /https?:\/\/[^\s"'<>]+(?:oxxfile|multiup|hubcloud|drive|filepress|dropbox|googleusercontent|mp4|mkv)[^\s"'<>]*/gi;
    const matches = (typeof html === "string" ? html : JSON.stringify(html)).match(regex) || [];
    matches.forEach((m) => streams.push({ server: "generic", link: m, type: "movie" }));
  } catch {}
  return streams;
}

export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  let streams: Stream[] = [];

  try {
    // OxxFile short link
    if (/oxxfile\.info\/s\/([^/]+)/i.test(link)) {
      const id = link.match(/oxxfile\.info\/s\/([^/]+)/i)?.[1];
      if (id) {
        const apiVariants = [
          `https://new3.oxxfile.info/api/s/${id}/api`,
          `https://new3.oxxfile.info/api/s/${id}/hubcloud`,
          `https://new3.oxxfile.info/api/s/${id}`,
        ];
        for (const apiUrl of apiVariants) {
          const oxStreams = await extractFromOxxApi(apiUrl, providerContext, signal);
          if (oxStreams.length) {
            oxStreams.forEach((s) => streams.push(s));
            const hubLinks = oxStreams.map(s => s.link).filter(l => /hubcloud/i.test(l));
            for (const h of hubLinks) {
              const hubExtracted = await extractFromHubCloudPage(h, providerContext, signal);
              hubExtracted.forEach(s => streams.push(s));
            }
            if (streams.length) break;
          }
        }
      }
    }

    // Direct Oxx API / hubcloud
    if (/oxxfile\.info\/api\/s\/[^/]+/i.test(link) || /oxxfile\.info\/api\/s\/[^/]+\/hubcloud/i.test(link)) {
      const oxStreams = await extractFromOxxApi(link, providerContext, signal);
      oxStreams.forEach((s) => streams.push(s));
      const hubLinks = oxStreams.map(s => s.link).filter(l => /hubcloud/i.test(l));
      for (const h of hubLinks) {
        const hubExtracted = await extractFromHubCloudPage(h, providerContext, signal);
        hubExtracted.forEach(s => streams.push(s));
      }
    }

    // HubCloud direct
    if (/hubcloud\.one\/drive\/[^/]+/i.test(link)) {
      const hubExtracted = await extractFromHubCloudPage(link, providerContext, signal);
      hubExtracted.forEach(s => streams.push(s));
    }

    // Generic scan
    const generic = await genericPageScan(link, providerContext, signal);
    generic.forEach(s => streams.push(s));

    // --- Filter and return only the last 3 HubCloud links ---
    const hubcloudStreams = streams.filter(s => s.server === "hubcloud");
    
    // The slice(-3) method gets the last 3 elements of the array.
    return hubcloudStreams.slice(-3);

  } catch {
    // If an error occurs, filter the collected streams and return the last three hubcloud
    return streams.filter(s => s.server === "hubcloud").slice(-3);
  }
}