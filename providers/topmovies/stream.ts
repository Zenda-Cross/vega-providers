import { Stream, ProviderContext, EpisodeLink } from "../types";
import { throwProviderError } from "../providerErrors";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";

export const getStream = async function ({
  link: url,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    let targetUrl = url;

    // 1. Resolve movie landing pages if not already a shortlink/direct drive link
    if (
      type === "movie" &&
      !targetUrl.includes("thenaukriadda") &&
      !targetUrl.includes("sid=") &&
      !targetUrl.includes("driveseed") &&
      !targetUrl.includes("driveleech") &&
      !targetUrl.includes("appdrive") &&
      !targetUrl.includes("hubcloud") &&
      !targetUrl.includes("gdflix")
    ) {
      try {
        const episodeLinks = await modGetEpisodeLinks({ url: targetUrl, providerContext });
        if (episodeLinks && episodeLinks.length > 0 && episodeLinks[0].link) {
          targetUrl = episodeLinks[0].link;
        }
      } catch {}
    }

    // 2. Bypass thenaukriadda shortlink if applicable
    if (targetUrl.includes("thenaukriadda") || targetUrl.includes("sid=")) {
      try {
        const bypassed = await bypassThenaukriadda(targetUrl, providerContext, signal);
        if (bypassed) {
          targetUrl = bypassed;
        }
      } catch (bypassErr: any) {
        console.warn("TopMovies: thenaukriadda bypass failed:", bypassErr.message);
      }
    }

    // 3. Bypass legacy wp_http if applicable
    if (
      !targetUrl.includes("driveseed") &&
      !targetUrl.includes("driveleech") &&
      !targetUrl.includes("appdrive") &&
      !targetUrl.includes("hubcloud") &&
      !targetUrl.includes("gdflix")
    ) {
      try {
        const legacyBypassed = await bypassLegacyWpHttp(targetUrl, providerContext, signal);
        if (legacyBypassed) {
          targetUrl = legacyBypassed;
        }
      } catch {}
    }

    // 4. Resolve unblockedgames / redirect gateways
    if (targetUrl.includes("unblockedgames") || targetUrl.includes("leechpro")) {
      try {
        const res = await axios.get(targetUrl, {
          headers: commonHeaders,
          signal,
        });
        const html = typeof res.data === "string" ? res.data : "";
        const refreshMatch = html.match(/content=["']\d+;\s*url=(.*?)["']/i);
        const replaceMatch = html.match(/location\.replace\(["']([^"']+)["']\)/i);
        const nextUrl = refreshMatch?.[1] || replaceMatch?.[1];
        if (nextUrl) {
          targetUrl = nextUrl.replace(/\\/g, "");
        }
      } catch {}
    }

    // 5. Hubcloud routing
    if (targetUrl.includes("hubcloud")) {
      return await hubcloudExtractor(
        targetUrl,
        signal as AbortSignal,
        axios,
        cheerio,
        commonHeaders,
        providerContext,
        isDownload,
        "TopMovies"
      );
    }

    // 6. GDFlix routing
    if (targetUrl.includes("gdflix")) {
      return await gdflixExtractor(
        targetUrl,
        signal as AbortSignal,
        axios,
        cheerio,
        commonHeaders,
        providerContext
      );
    }

    // 7. DriveSeed / DriveLeech / AppDrive routing
    if (
      targetUrl.includes("driveseed") ||
      targetUrl.includes("driveleech") ||
      targetUrl.includes("appdrive")
    ) {
      const driveStreams = await extractStreamsFromDriveseed(
        targetUrl,
        providerContext,
        signal
      );
      if (driveStreams.length > 0) {
        return driveStreams;
      }
    }

    // 8. Direct video link fallback
    if (/\.(mp4|mkv|m3u8|avi)($|\?)/i.test(targetUrl)) {
      return [
        {
          server: "Direct Stream",
          link: targetUrl,
          type: targetUrl.includes(".m3u8") ? "m3u8" : "mkv",
        },
      ];
    }

    return [];
  } catch (err: any) {
    throwProviderError("TopMovies", "stream", err);
    return [];
  }
};

async function modGetEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    let cleanUrl = url;
    if (cleanUrl.includes("url=")) {
      cleanUrl = atob(cleanUrl.split("url=")[1]);
    }
    const res = await axios.get(cleanUrl, { headers: commonHeaders });
    const html = res.data;
    let $ = cheerio.load(html);
    if (url.includes("url=")) {
      const newUrl = $("meta[http-equiv='refresh']")
        .attr("content")
        ?.split("url=")[1];
      if (newUrl) {
        const res2 = await axios.get(newUrl, { headers: commonHeaders });
        $ = cheerio.load(res2.data);
      }
    }
    const episodeLinks: EpisodeLink[] = [];
    $("h3,h4").each((_, element) => {
      const seriesTitle = $(element).text();
      const link = $(element).find("a").attr("href");
      if (link && link !== "#") {
        episodeLinks.push({
          title: seriesTitle.trim() || "Download",
          link,
        });
      }
    });
    $("a.maxbutton").each((_, element) => {
      const seriesTitle = $(element).children("span").text();
      const link = $(element).attr("href");
      if (link && link !== "#") {
        episodeLinks.push({
          title: seriesTitle.trim() || "Download",
          link,
        });
      }
    });
    return episodeLinks;
  } catch {
    return [];
  }
}

async function bypassThenaukriadda(
  initialUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<string | null> {
  const { axios, cheerio, commonHeaders } = providerContext;
  const headers = { ...commonHeaders, Referer: "https://moviesleech.club/" };

  // Step 1: GET initial shortlink to extract _lp_http and cookies
  const res1 = await axios.get(initialUrl, { headers, signal });
  const html1 = typeof res1.data === "string" ? res1.data : "";
  const $1 = cheerio.load(html1);

  const lpHttp = $1('input[name="_lp_http"]').val() as string;
  let action1 = $1("form#lp-land").attr("action") || $1("form").attr("action") || initialUrl;
  if (!action1.startsWith("http")) {
    action1 = new URL(action1, initialUrl).href;
  }

  let cookies = "";
  const setCookies1 = res1.headers?.["set-cookie"];
  if (Array.isArray(setCookies1)) {
    cookies = setCookies1.map((c: string) => c.split(";")[0]).join("; ");
  }

  if (!lpHttp) {
    const directMatch = html1.match(/location\.replace\(["']([^"']+)["']\)/);
    if (directMatch) return directMatch[1].replace(/\\/g, "");
    return initialUrl;
  }

  // Step 2: POST _lp_http
  const fd1 = new URLSearchParams();
  fd1.append("_lp_http", lpHttp);

  const res2 = await axios.post(action1, fd1.toString(), {
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: initialUrl,
      Cookie: cookies,
    },
    signal,
  });

  const setCookies2 = res2.headers?.["set-cookie"];
  if (Array.isArray(setCookies2)) {
    const c2 = setCookies2.map((c: string) => c.split(";")[0]).join("; ");
    cookies = cookies ? `${cookies}; ${c2}` : c2;
  }

  const html2 = typeof res2.data === "string" ? res2.data : "";
  const $2 = cheerio.load(html2);

  const form2 = $2("form#lp-s1-form").length > 0 ? $2("form#lp-s1-form") : $2("form").first();
  let action2 = form2.attr("action") || action1;
  if (!action2.startsWith("http")) {
    action2 = new URL(action2, action1).href;
  }

  const fd2 = new URLSearchParams();
  form2.find("input").each((_, el) => {
    const name = $2(el).attr("name");
    const val = $2(el).attr("value");
    if (name && val !== undefined) {
      fd2.append(name, val);
    }
  });

  // Step 3: POST to article slug page
  const res3 = await axios.post(action2, fd2.toString(), {
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: action1,
      Cookie: cookies,
    },
    signal,
  });

  const setCookies3 = res3.headers?.["set-cookie"];
  if (Array.isArray(setCookies3)) {
    const c3 = setCookies3.map((c: string) => c.split(";")[0]).join("; ");
    cookies = cookies ? `${cookies}; ${c3}` : c3;
  }

  const html3 = typeof res3.data === "string" ? res3.data : "";
  const scMatch = html3.match(/sc\(["']([^"']+)["'],\s*["']([^"']+)["']/);

  if (!scMatch) {
    const directGo = html3.match(/href=["'](https?:\/\/[^"']*?[?&]lp_go=[^"']*)["']/);
    if (directGo) return directGo[1];
    const directMatch = html3.match(/location\.replace\(["']([^"']+)["']\)/);
    if (directMatch) return directMatch[1].replace(/\\/g, "");
    return action2;
  }

  const tokenName = scMatch[1];
  const tokenVal = scMatch[2];
  const origin2 = new URL(action2).origin;
  const lpGoUrl = `${origin2}/?lp_go=${tokenName}`;
  cookies += `; ${tokenName}=${tokenVal}`;

  // Step 4: GET lp_go URL to get redirect destination
  const res4 = await axios.get(lpGoUrl, {
    headers: {
      ...headers,
      Referer: action2,
      Cookie: cookies,
    },
    signal,
  });

  const html4 = typeof res4.data === "string" ? res4.data : "";
  const redirectMatch = html4.match(/location\.replace\(["']([^"']+)["']\)/);
  if (redirectMatch) {
    return redirectMatch[1].replace(/\\/g, "");
  }

  return res4.request?.res?.responseUrl || lpGoUrl;
}

async function bypassLegacyWpHttp(
  url: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<string | null> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  try {
    const sid = url.includes("sid=") ? url.split("sid=")[1] : "";
    let formUrl = url.split("?")[0];
    let wpHttp2 = "";

    if (sid) {
      const fd = new URLSearchParams();
      fd.append("_wp_http", sid);
      const res = await axios.post(formUrl, fd.toString(), {
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
        signal,
      });
      const $ = cheerio.load(res.data);
      wpHttp2 = $('input[name="_wp_http2"]').val() as string;
      const act = $("form").attr("action");
      if (act) formUrl = act.startsWith("http") ? act : new URL(act, formUrl).href;
    } else {
      const res = await axios.get(url, { headers, signal });
      const $ = cheerio.load(res.data);
      wpHttp2 = $('input[name="_wp_http2"]').val() as string;
      const act = $("form").attr("action");
      if (act) formUrl = act.startsWith("http") ? act : new URL(act, formUrl).href;
    }

    if (!wpHttp2) return null;

    const fd2 = new URLSearchParams();
    fd2.append("_wp_http2", wpHttp2);
    const res2 = await axios.post(formUrl, fd2.toString(), {
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: url,
      },
      signal,
    });
    const html2 = typeof res2.data === "string" ? res2.data : "";
    const linkMatch = html2.match(/setAttribute\("href",\s*"(.*?)"/);
    if (!linkMatch) return null;
    const link = linkMatch[1];
    const cookie = link.split("=")[1];

    const res3 = await axios.get(link, {
      headers: {
        ...headers,
        Referer: formUrl,
        Cookie: `${cookie}=${wpHttp2}`,
      },
      signal,
    });
    const html3 = typeof res3.data === "string" ? res3.data : "";
    const refreshMatch = html3.match(/content=["']\d+;\s*url=(.*?)["']/i);
    if (refreshMatch) return refreshMatch[1];
    const replaceMatch = html3.match(/location\.replace\(["']([^"']+)["']\)/i);
    if (replaceMatch) return replaceMatch[1];
    return res3.request?.res?.responseUrl || link;
  } catch {
    return null;
  }
}

async function extractStreamsFromDriveseed(
  driveUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  const streams: Stream[] = [];
  const addedUrls = new Set<string>();

  const addStream = (server: string, link: string) => {
    if (link && link.startsWith("http") && !addedUrls.has(link)) {
      addedUrls.add(link);
      streams.push({ server, link, type: "mkv" });
    }
  };

  let fileUrl = driveUrl;

  // Resolve /r? redirect link if present
  if (driveUrl.includes("/r?")) {
    try {
      const rRes = await axios.get(driveUrl, {
        headers: { ...headers, Referer: "https://en.thenaukriadda.in/" },
        signal,
      });
      const html = typeof rRes.data === "string" ? rRes.data : "";
      const pathMatch = html.match(/location\.replace\(["']([^"']+)["']\)/);
      if (pathMatch) {
        const p = pathMatch[1].replace(/\\/g, "");
        const origin = new URL(driveUrl).origin;
        fileUrl = p.startsWith("http") ? p : origin + p;
      }
    } catch {}
  }

  try {
    const fileRes = await axios.get(fileUrl, {
      headers: { ...headers, Referer: driveUrl },
      signal,
    });
    const fileHtml = typeof fileRes.data === "string" ? fileRes.data : "";
    const $file = cheerio.load(fileHtml);

    // 1. Resume Cloud (/zfile)
    try {
      const zfileUrl = fileUrl.replace("/file/", "/zfile/");
      const zRes = await axios.get(zfileUrl, {
        headers: { ...headers, Referer: fileUrl },
        signal,
      });
      const zHtml = typeof zRes.data === "string" ? zRes.data : "";
      const $z = cheerio.load(zHtml);

      // Direct Cloudflare worker download link or direct media links
      $z("a").each((_, el) => {
        const href = $z(el).attr("href");
        if (
          href &&
          (href.includes("workers.dev") ||
            href.includes("r2.dev") ||
            href.includes("drive.google.com") ||
            /\.(mp4|mkv|m3u8)($|\?)/i.test(href))
        ) {
          const serverName = href.includes("drive.google.com")
            ? "Google Drive"
            : "Resume Cloud (Fast)";
          addStream(serverName, href);
        }
      });

      // Video frame player link
      $z("iframe, video, source").each((_, el) => {
        const src = $z(el).attr("src");
        if (src) {
          const match = src.match(/link=(https?:\/\/[^&"']+)/);
          if (match && match[1]) {
            addStream("Direct Stream", match[1]);
          }
        }
      });
    } catch {}

    // Check direct media links on file page itself
    $file("a").each((_, el) => {
      const href = $file(el).attr("href");
      if (
        href &&
        (href.includes("workers.dev") ||
          href.includes("r2.dev") ||
          href.includes("drive.google.com") ||
          /\.(mp4|mkv|m3u8)($|\?)/i.test(href))
      ) {
        const serverName = href.includes("drive.google.com")
          ? "Google Drive"
          : "Direct File Stream";
        addStream(serverName, href);
      }
    });

    // 2. Instant Download (.btn-danger) -> Direct Google Video CDN
    try {
      const instantHref = $file(".btn-danger, a:contains('Instant Download')").attr("href");
      if (instantHref && instantHref.startsWith("http")) {
        if (instantHref.includes("url=")) {
          const directPart = decodeURIComponent(instantHref.split("url=")[1]);
          if (directPart && directPart.startsWith("http")) {
            addStream("Instant Download", directPart);
          }
        } else {
          try {
            const vRes = await axios.get(instantHref, {
              headers: { ...headers, Referer: fileUrl },
              maxRedirects: 0,
              validateStatus: (s: number) => s >= 200 && s < 400,
              signal,
            });

            const loc = vRes.headers?.location;
            if (loc) {
              let directGoogleUrl: string | null = null;
              if (loc.includes("url=")) {
                directGoogleUrl = decodeURIComponent(loc.split("url=")[1]);
              } else if (loc.includes("googleusercontent.com") || loc.startsWith("http")) {
                directGoogleUrl = loc;
              }
              if (directGoogleUrl && directGoogleUrl.startsWith("http")) {
                addStream("Instant Download", directGoogleUrl);
              }
            }
          } catch {}
        }
      }
    } catch {}

    // 3. Fallback worker links (/wfile type 1 & 2)
    for (const t of [1, 2]) {
      try {
        const wfileUrl = fileUrl.replace("/file/", "/wfile/") + `?type=${t}`;
        const wRes = await axios.get(wfileUrl, {
          headers: { ...headers, Referer: fileUrl },
          signal,
        });
        const wHtml = typeof wRes.data === "string" ? wRes.data : "";
        const $w = cheerio.load(wHtml);
        $w(".btn-success, a.btn").each((i, el) => {
          const href = $w(el).attr("href");
          if (href) addStream(`Worker ${t}.${i + 1}`, href);
        });
      } catch {}
    }
  } catch {}

  // 4. Fallback to gdflixExtractor if driveseed extraction returned nothing
  if (streams.length === 0) {
    try {
      const gdStreams = await gdflixExtractor(
        fileUrl,
        signal as AbortSignal,
        axios,
        cheerio,
        headers,
        providerContext
      );
      if (Array.isArray(gdStreams)) {
        for (const s of gdStreams) {
          addStream(s.server || "GDFlix", s.link);
        }
      }
    } catch {}
  }

  return streams;
}
