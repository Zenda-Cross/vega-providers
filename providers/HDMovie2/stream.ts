// providers/HDMovie2/stream.ts
import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
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
  try {
    const { extractors, commonHeaders } = providerContext;

    // For HDMovie2, we use hubcloudExtracter for all playable links
    const streams = await extractors.hubcloudExtracter(link, signal);

    if (!streams.length) throw new Error("No streams available");
    return streams.map((s) => ({
      ...s,
      quality: s.quality || "auto",
      type,
    }));
  } catch (err) {
    console.error("HDMovie2 getStream error:", err);
    return [];
  }
};


