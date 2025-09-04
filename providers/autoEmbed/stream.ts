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
    const season: string = payload.season ?? "";
    const episode: string = payload.episode ?? "";
    const effectiveType: string = payload.type ?? type ?? "movie";

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
    "primevids",
    "humpy",
    "loki",
    "asiacloud",
    "shadow",
    "hindicast",
    "animez",
    "aqua",
    "voyager",
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
          timeout: 4000,
          headers: providerContext.commonHeaders,
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
  // Array of secret key fragments from the provided implementation
  const c = [
    "oYRu3JJ5g1C",
    "TRlWJIJXT",
    "RuoyGA0udvsFVXr",
    "Y4s2LNM4y",
    "wHzuSgl0fD",
    "MGLTaSGs",
    "rr0rSBIYfwutV7E",
    "ABJXC9c",
    "W2BuY0yDB9CcK",
    "3yvZP1OJuTM",
    "YDoqbu6zdN0zT",
    "rnNQ2a5OBaMu",
    "eSKa1Uy",
    "QsIV8J472Xa",
    "cPfTgu27",
    "j4mzadQCou9",
    "qHLZbLrZQfB",
    "8U9YP6hrTz4cJNQ",
    "xbAbu4pzFEXz",
    "dhuA9zvdw",
    "k3A1JGmb",
    "eVC3z4COdUNvvzA",
    "dwMmuXnrb",
    "AqpWzY9I1ZmGPR",
    "VGXWUm0JTetmXs",
    "gD4sH3CISTanpTs",
    "d6w8dntV",
    "iL6dvSNqEab4kd",
    "mIB8NFtmPjnX1kM",
    "F4PXdP0Hx3",
    "5Fijua4Z7C",
    "wPGnHJrkYa1Tu4P",
    "pjrfBfTf",
    "vswQDEbM0y64io",
    "LAnpQuk6hR2bEWs",
    "kX8orxNnkK",
    "mRsZ5fjHbC8YuT",
    "JnBr1jr",
    "2twFGU5PgvDmKdP",
    "3wCg6zYtHFjy",
    "gaQSJhixHiy1pa8",
    "pE2cXTP0GPX",
    "xr0ONW3sOnCRdt",
    "QZu43flHFsebX",
    "yrvtqRTOnHo",
    "kvXEs16lgj",
    "AGwT2zpQVHCMb09",
    "M4BxOh3z2JgC",
    "5hbV7briYC7",
    "YfHMsm0",
    "jC9PAPfz34Vgc",
    "ExoJ1tgEXpK",
    "eD8WPA4Lmsyf4W",
    "h7WSlhT7iNOj",
    "RRP61kk",
    "QtY0f1aN",
    "TlatGjcOQjup",
    "MfpeEGbjouYSOa",
    "Zz0Qh8B0pwUkdRT",
    "Y4SkLSQNU",
    "hOk01KFeEVbNRZx",
    "fyf4H8MXazm3oY",
    "Z116B9F2p",
    "GdxNJOnvdz",
    "kqVNNHfP",
    "IO3hhNu",
    "qDdC9Lcllce",
    "Et7lLOg",
    "6ZlQrvfgZu",
    "YXHLeZBF",
    "NH6nAd7y",
    "ARsut59gfK6j0v",
    "jPE2KXiJjnSsjn",
    "qYcG5HOJc3TtxM",
    "C2w06YGj5C",
    "kHx1pT7",
    "2enXfHXw",
    "koFHBiR054aizN",
    "Uj53XTQ92Ntbq7K",
    "QjC5euFYi2AuxWb",
    "njLwvdMejA",
    "NWMzrwTAVZEb",
    "s4sVqC0AyTM5h",
    "pu01jeZ6AoH",
    "SgiOfwx9qkR",
    "grjsLtBNn9eTQg",
    "XABTTaYgihZk2mq",
    "2vlSCZQc3HT27F4",
    "kQZ7VQfEL3TC7P",
    "MEzqVne021W",
    "BLYPZp2SIO",
    "5zDMVoqw4nH",
    "t14S9uLuGKX7Lb5",
    "4McODHAYTyp",
    "EAoxL5UKvMPqjH3",
    "hJpAbqp",
    "tcj63Wpz",
    "hGqEu0LxKkMv46P",
    "u2wNvb8ou19N3",
    "wUKY6Opi1kH",
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
