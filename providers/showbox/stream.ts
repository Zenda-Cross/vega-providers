import { Stream, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

export const getStream = async function ({
  link: id,
  // type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio, kvStore } = providerContext;
    const stream: Stream[] = [];
    const [, epId] = id.split("&");
    if (!epId) return [];

    let html = "";
    const febboxCookie = await kvStore?.get<string>("febboxCookie");
    if (febboxCookie) {
      try {
        const febRes = await axios.get(
          `https://www.febbox.com/console/video_quality_list?fid=${epId}`,
          {
            headers: {
              Cookie: febboxCookie,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
              "X-Requested-With": "XMLHttpRequest",
              Referer: "https://www.febbox.com/",
            },
            signal,
          }
        );
        if (febRes.data?.html && typeof febRes.data.html === "string") {
          html = febRes.data.html;
        } else if (
          febRes.data?.code === -1 ||
          febRes.data?.login_required ||
          (typeof febRes.data?.msg === "string" &&
            febRes.data.msg.toLowerCase().includes("login"))
        ) {
          throw new Error("Please set cookies in ShowBox provider settings");
        }
      } catch (e: any) {
        if (e.message?.includes("ShowBox provider settings")) {
          throw e;
        }
        // fallback to worker
      }
    }

    if (!html) {
      const url = `https://feb.8man.workers.dev/?fid=${epId}`;
      const res = await axios.get(url, { signal });
      const data = res.data;
      if (data?.html && typeof data.html === "string") {
        html = data.html;
      } else if (
        data?.code === -1 ||
        data?.login_required ||
        (typeof data?.msg === "string" &&
          data.msg.toLowerCase().includes("login"))
      ) {
        throw new Error("Please set cookies in ShowBox provider settings");
      }
    }

    if (!html) {
      return [];
    }

    const $ = cheerio.load(html);
    $(".file_quality").each((i, el) => {
      const server =
        $(el).find("p.name").text() +
        " - " +
        $(el).find("p.size").text() +
        " - " +
        $(el).find("p.speed").text();
      const link = $(el).attr("data-url");
      if (link) {
        stream.push({
          server: server,
          type: "mkv",
          link: link,
        });
      }
    });
    return stream;
  } catch (err) {
    throwProviderError("ShowBox", "stream", err);
  }
};
