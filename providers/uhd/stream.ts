import { ProviderContext, Stream } from "../types";
import { throwProviderError } from "../providerErrors";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";

export const getStream = async ({
  link: url,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  try {
    const { axios, cheerio, commonHeaders: headers } = providerContext;

    let targetUrl = url;

    // 1. Bypass thenaukriadda shortlink if applicable
    if (url.includes("thenaukriadda") || url.includes("sid=")) {
      console.log("UHDMovies: bypassing thenaukriadda shortlink:", url);
      try {
        const bypassed = await bypassThenaukriadda(url, providerContext, signal);
        if (bypassed) {
          targetUrl = bypassed;
          console.log("UHDMovies: bypassed to:", targetUrl);
        }
      } catch (bypassErr: any) {
        console.warn("UHDMovies: thenaukriadda bypass failed:", bypassErr.message);
      }
    }

    // 2. Hubcloud routing
    if (targetUrl.includes("hubcloud")) {
      return await hubcloudExtractor(
        targetUrl,
        signal as AbortSignal,
        axios,
        cheerio,
        headers,
        providerContext,
        isDownload,
        "UHDMovies"
      );
    }

    // 3. GDFlix routing
    if (targetUrl.includes("gdflix")) {
      return await gdflixExtractor(
        targetUrl,
        signal as AbortSignal,
        axios,
        cheerio,
        headers,
        providerContext
      );
    }

    // 4. DriveSeed / DriveLeech / AppDrive routing
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

    // 5. Direct video fallback
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
    throwProviderError("UHDMovies", "stream", err);
    return [];
  }
};

async function bypassThenaukriadda(
  initialUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<string> {
  const { axios, cheerio, commonHeaders } = providerContext;
  const headers = {
    ...commonHeaders,
    Referer: "https://uhdmovies.my/",
  };

  // Step 1: GET initial URL
  const res1 = await axios.get(initialUrl, { headers, signal });
  const html1 = typeof res1.data === "string" ? res1.data : "";

  // Check if response is already the destination or has location.replace
  const redirect1 = html1.match(/location\.replace\(["']([^"']+)["']\)/);
  if (redirect1 && !redirect1[1].includes("thenaukriadda")) {
    return redirect1[1].replace(/\\/g, "");
  }

  let cookies =
    res1.headers?.["set-cookie"]?.map((c: string) => c.split(";")[0]).join("; ") ||
    "lp_ck_test=1";

  const $1 = cheerio.load(html1);
  const form1 = $1("form");
  const action1 = form1.attr("action") || initialUrl.split("?")[0];
  const input1 =
    form1.find("input[name='_lp_http']").val() ||
    form1.find("input[name='_wp_http']").val() ||
    form1.find("input").val() ||
    initialUrl.split("sid=")[1];

  if (!input1) {
    return initialUrl;
  }

  // Step 2: POST to action1
  const inputName1 = form1.find("input[name='_lp_http']").length ? "_lp_http" : "_wp_http";
  const params1 = new URLSearchParams();
  params1.append(inputName1, input1 as string);

  const res2 = await axios.post(action1, params1.toString(), {
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: initialUrl,
      Cookie: cookies,
      Origin: new URL(action1).origin,
    },
    signal,
  });

  if (res2.headers?.["set-cookie"]) {
    cookies += "; " + res2.headers["set-cookie"].map((c: string) => c.split(";")[0]).join("; ");
  }

  const html2 = typeof res2.data === "string" ? res2.data : "";
  const $2 = cheerio.load(html2);
  const form2 = $2("#lp-s1-form, form[id*='lp-'], form[id*='wp-']").first();
  const action2 = form2.attr("action");

  if (!action2) {
    const directMatch = html2.match(/setAttribute\("href",\s*"(.*?)"/);
    if (directMatch) return directMatch[1];
    return initialUrl;
  }

  // Step 3: POST to action2 with all form2 inputs
  const params2 = new URLSearchParams();
  form2.find("input").each((_, el) => {
    const name = $2(el).attr("name");
    const val = $2(el).val();
    if (name) params2.append(name, (val as string) || "");
  });

  const res3 = await axios.post(action2, params2.toString(), {
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: action1,
      Cookie: cookies,
      Origin: new URL(action2).origin,
    },
    signal,
  });

  if (res3.headers?.["set-cookie"]) {
    cookies += "; " + res3.headers["set-cookie"].map((c: string) => c.split(";")[0]).join("; ");
  }

  // Step 4: Extract lp_go token from script
  const html3 = typeof res3.data === "string" ? res3.data : "";
  const scMatch = html3.match(/sc\(["']([^"']+)["'],\s*["']([^"']+)["']/);

  if (!scMatch) {
    const directGo = html3.match(/href=["'](https?:\/\/[^"']+\?lp_go=[^"']+)["']/);
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

  // Step 5: GET lp_go URL to get redirect destination
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
            /\.(mp4|mkv|m3u8)($|\?)/i.test(href))
        ) {
          addStream("Resume Cloud (Fast)", href);
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
          /\.(mp4|mkv|m3u8)($|\?)/i.test(href))
      ) {
        addStream("Direct File Stream", href);
      }
    });

    // 2. Instant Download (.btn-danger)
    try {
      const instantHref = $file(".btn-danger").attr("href");
      if (instantHref && instantHref.startsWith("http")) {
        if (instantHref.includes("?url=")) {
          const directPart = instantHref.split("?url=")[1];
          if (directPart && directPart.startsWith("http")) {
            addStream("Instant Download", directPart);
          }
        }

        // Try instant download gateway (video-gen / video-plex)
        try {
          const vRes = await axios.get(instantHref, {
            headers: { ...headers, Referer: fileUrl },
            signal,
          });
          const vHtml = typeof vRes.data === "string" ? vRes.data : "";
          const upMatch = vHtml.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
          if (upMatch) {
            const upPath = upMatch[1];
            const vOrigin = new URL(instantHref).origin;
            const upUrl = upPath.startsWith("http") ? upPath : vOrigin + upPath;
            const upRes = await axios.get(upUrl, {
              headers: { ...headers, Referer: instantHref },
              signal,
            });
            const $up = cheerio.load(upRes.data);
            const dlBtn = $up("#downloadBtn, a.btn-danger, a.btn-success").attr("href");
            if (dlBtn && dlBtn.startsWith("http")) {
              addStream("Instant CDN", dlBtn);
            }
          }
        } catch {}
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
