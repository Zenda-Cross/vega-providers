import { Stream, ProviderContext } from "../types";

export const getStream = async ({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type?: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> => {
  try {
    let newLink = link;
    const log = (...args: any[]) => console.log("[cinemalux:getStream]", ...args);

    log("initial link", link);

    // Normalize relative links
    const base = (await providerContext.getBaseUrl?.("cinemalux")) || "https://cinemalux.run";
    if (newLink.startsWith("/")) newLink = base.replace(/\/$/, "") + newLink;

    // Fetch the page
    const res = await providerContext.axios.get(newLink, { signal });
    const html = res.data || "";

    // Detect hubcloud / gdflix / drive links
    const hubMatch = html.match(
      /https?:\/\/[^'"\s]+(?:hubcloud|hubdrive|luxedrive|drive|gdflix|gdrv|googleapis|drive\.google\.com)[^'"\s]*/i
    );

    if (hubMatch) {
      const hubLink = hubMatch[0];
      log("found hub-like link", hubLink);

      if (hubLink.includes("gdflix") && providerContext.extractors?.gdFlixExtracter) {
        return await providerContext.extractors.gdFlixExtracter(hubLink, signal);
      }
      if (providerContext.extractors?.hubcloudExtracter) {
        return await providerContext.extractors.hubcloudExtracter(hubLink, signal);
      }
    }

    // ✅ Generic extractor
    if (providerContext.extractors && "genericExtractor" in providerContext.extractors) {
      const extractor = (providerContext.extractors as any).genericExtractor;
      if (typeof extractor === "function") {
        const generic: Stream[] = await extractor(newLink, signal);
        if (generic && generic.length) return generic;
      }
    }

    // ✅ Last fallback
    log("No extractor matched, fallback to direct link:", newLink);

    const fallbackStream = {
      link: newLink, // 👈 name adjust karenge jab types.ts mil जाएगा
      quality: (["360", "480", "720", "1080", "2160", "auto"].includes(type || "auto")
        ? type
        : "auto"),
      type: "url",
    } as Stream; // 👈 force cast so TS stops error

    return [fallbackStream];
  } catch (err) {
    console.error("cinemalux getStream error", err);
    return [];
  }
};
