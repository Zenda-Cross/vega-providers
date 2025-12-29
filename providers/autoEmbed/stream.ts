import { Stream, ProviderContext, TextTracks } from "../types";

export const getStream = async ({
  link: id,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> => {
  try {
    const streams: Stream[] = [];
    const payload = (() => {
      try {
        return JSON.parse(id);
      } catch {
        return { tmdbId: id };
      }
    })();

    const tmdbId: string | number =
      payload.tmdbId ?? payload.id ?? payload.tmdId ?? "";
    const imdbId: string = payload.imdbId ?? "";
    const season: string = payload.season ?? "";
    const episode: string = payload.episode ?? "";
    const effectiveType: string = payload.type ?? type ?? "movie";

    await getWebstreamerStream(
      String(imdbId),
      episode,
      season,
      effectiveType,
      streams,
      providerContext
    );

    await getRiveStream(
      String(tmdbId),
      episode,
      season,
      effectiveType,
      streams,
      providerContext
    );
    return streams;
  } catch (err) {
    console.error(err);
    return [];
  }
};

///////// Webstreamer
export async function getWebstreamerStream(
  imdbId: string,
  episode: string,
  season: string,
  type: string,
  Streams: Stream[],
  providerContext: ProviderContext
) {
  if (!imdbId || imdbId === "undefined") return;
  const url = `https://webstreamr.hayd.uk/{"multi":"on","al":"on","de":"on","es":"on","fr":"on","hi":"on","it":"on","mx":"on","mediaFlowProxyUrl":"","mediaFlowProxyPassword":""}/stream/${type}/${imdbId}${
    type === "series" ? `:${season}:${episode}` : ""
  }.json`;

  console.log("Webstreamer URL: ", encodeURI(url));
  try {
    const res = await providerContext.axios.get(encodeURI(url), {
      timeout: 30000,
      headers: providerContext.commonHeaders,
    });
    res.data?.streams.forEach((source: any) => {
      const url = source?.url;
      const name = source?.name || "WebStreamer";
      // Infer type from URL
      const qualityMatch = name?.match(/(\d{3,4})p/);
      const quality = qualityMatch
        ? (qualityMatch[1] as "360" | "480" | "720" | "1080" | "2160")
        : undefined;
      Streams.push({
        server: name,
        link: url,
        type,
        quality,
      });
    });
  } catch (e) {
    throw e;
  }
}

// // Rive Stream Fetcher
export async function getRiveStream(
  tmdId: string,
  episode: string,
  season: string,
  type: string,
  Streams: Stream[],
  providerContext: ProviderContext
) {
  if (!tmdId || tmdId === "undefined") {
    console.warn("autoEmbed/rive: missing tmdbId in link payload");
    return;
  }
  const secret = generateSecretKey(tmdId);
  const servers = [
    "flowcast",
    "asiacloud",
    "humpy",
    "primevids",
    "shadow",
    "hindicast",
    "animez",
    "aqua",
    "yggdrasil",
    "putafilme",
    "ophim",
  ];
  const baseUrl = await providerContext.getBaseUrl("rive");
  const cors = process.env.CORS_PRXY ? process.env.CORS_PRXY + "?url=" : "";
  console.log("CORS: " + cors);
  const route =
    type === "series"
      ? `/api/backendfetch?requestID=tvVideoProvider&id=${tmdId}&season=${season}&episode=${episode}&secretKey=${secret}&service=`
      : `/api/backendfetch?requestID=movieVideoProvider&id=${tmdId}&secretKey=${secret}&service=`;
  const url = cors
    ? cors + encodeURIComponent(baseUrl + route)
    : baseUrl + route;
  await Promise.all(
    servers.map(async (server) => {
      console.log("Rive: " + url + server);
      try {
        const res = await providerContext.axios.get(url + server, {
          timeout: 8000,
        });
        const subtitles: TextTracks = [];
        // if (res.data?.data?.captions) {
        //   res.data?.data?.captions.forEach((sub: any) => {
        //     subtitles.push({
        //       language: sub?.label?.slice(0, 2) || "Und",
        //       uri: sub?.file,
        //       title: sub?.label || "Undefined",
        //       type: sub?.file?.endsWith(".vtt")
        //         ? "text/vtt"
        //         : "application/x-subrip",
        //     });
        //   });
        // }
        res.data?.data?.sources.forEach((source: any) => {
          Streams.push({
            server: source?.source + "-" + source?.quality,
            link: source?.url,
            type: source?.format === "hls" ? "m3u8" : "mp4",
            quality: source?.quality,
            // subtitles: subtitles,
            headers: {
              referer: baseUrl,
            },
          });
        });
      } catch (e) {
        console.log(e);
      }
    })
  );
}

function generateSecretKey(id: number | string) {
  // Updated array from module 2873 in the provided source
  const c = [
    "4Z7lUo",
    "gwIVSMD",
    "PLmz2elE2v",
    "Z4OFV0",
    "SZ6RZq6Zc",
    "zhJEFYxrz8",
    "FOm7b0",
    "axHS3q4KDq",
    "o9zuXQ",
    "4Aebt",
    "wgjjWwKKx",
    "rY4VIxqSN",
    "kfjbnSo",
    "2DyrFA1M",
    "YUixDM9B",
    "JQvgEj0",
    "mcuFx6JIek",
    "eoTKe26gL",
    "qaI9EVO1rB",
    "0xl33btZL",
    "1fszuAU",
    "a7jnHzst6P",
    "wQuJkX",
    "cBNhTJlEOf",
    "KNcFWhDvgT",
    "XipDGjST",
    "PCZJlbHoyt",
    "2AYnMZkqd",
    "HIpJh",
    "KH0C3iztrG",
    "W81hjts92",
    "rJhAT",
    "NON7LKoMQ",
    "NMdY3nsKzI",
    "t4En5v",
    "Qq5cOQ9H",
    "Y9nwrp",
    "VX5FYVfsf",
    "cE5SJG",
    "x1vj1",
    "HegbLe",
    "zJ3nmt4OA",
    "gt7rxW57dq",
    "clIE9b",
    "jyJ9g",
    "B5jXjMCSx",
    "cOzZBZTV",
    "FTXGy",
    "Dfh1q1",
    "ny9jqZ2POI",
    "X2NnMn",
    "MBtoyD",
    "qz4Ilys7wB",
    "68lbOMye",
    "3YUJnmxp",
    "1fv5Imona",
    "PlfvvXD7mA",
    "ZarKfHCaPR",
    "owORnX",
    "dQP1YU",
    "dVdkx",
    "qgiK0E",
    "cx9wQ",
    "5F9bGa",
    "7UjkKrp",
    "Yvhrj",
    "wYXez5Dg3",
    "pG4GMU",
    "MwMAu",
    "rFRD5wlM",
  ];

  if (id === undefined) {
    return "rive";
  }

  try {
    let t: string, n: number;
    const r = String(id);

    if (isNaN(Number(id))) {
      const sum = r.split("").reduce((e, ch) => e + ch.charCodeAt(0), 0);
      t = c[sum % c.length] || btoa(r);
      n = Math.floor((sum % r.length) / 2);
    } else {
      const num = Number(id);
      t = c[num % c.length] || btoa(r);
      n = Math.floor((num % r.length) / 2);
    }

    const i = r.slice(0, n) + t + r.slice(n);

    /* eslint-disable no-bitwise */
    const innerHash = (e: string) => {
      e = String(e);
      let t = 0 >>> 0;
      for (let n = 0; n < e.length; n++) {
        const r = e.charCodeAt(n);
        const i =
          (((t = (r + (t << 6) + (t << 16) - t) >>> 0) << n % 5) |
            (t >>> (32 - (n % 5)))) >>>
          0;
        t = (t ^ (i ^ (((r << n % 7) | (r >>> (8 - (n % 7)))) >>> 0))) >>> 0;
        t = (t + ((t >>> 11) ^ (t << 3))) >>> 0;
      }
      t ^= t >>> 15;
      t = ((t & 65535) * 49842 + ((((t >>> 16) * 49842) & 65535) << 16)) >>> 0;
      t ^= t >>> 13;
      t = ((t & 65535) * 40503 + ((((t >>> 16) * 40503) & 65535) << 16)) >>> 0;
      t ^= t >>> 16;
      return t.toString(16).padStart(8, "0");
    };

    const outerHash = (e: string) => {
      const t = String(e);
      let n = (3735928559 ^ t.length) >>> 0;
      for (let idx = 0; idx < t.length; idx++) {
        let r = t.charCodeAt(idx);
        r ^= ((131 * idx + 89) ^ (r << idx % 5)) & 255;
        n = (((n << 7) | (n >>> 25)) >>> 0) ^ r;
        const i = ((n & 65535) * 60205) >>> 0;
        const o = (((n >>> 16) * 60205) << 16) >>> 0;
        n = (i + o) >>> 0;
        n ^= n >>> 11;
      }
      n ^= n >>> 15;
      n = (((n & 65535) * 49842 + (((n >>> 16) * 49842) << 16)) >>> 0) >>> 0;
      n ^= n >>> 13;
      n = (((n & 65535) * 40503 + (((n >>> 16) * 40503) << 16)) >>> 0) >>> 0;
      n ^= n >>> 16;
      n = (((n & 65535) * 10196 + (((n >>> 16) * 10196) << 16)) >>> 0) >>> 0;
      n ^= n >>> 15;
      return n.toString(16).padStart(8, "0");
    };
    /* eslint-enable no-bitwise */

    const o = outerHash(innerHash(i));
    return btoa(o);
  } catch (e) {
    return "topSecret";
  }
}
