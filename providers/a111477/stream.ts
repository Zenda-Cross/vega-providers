import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link: url,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const stream: Stream[] = [];

    // Get file extension from URL
    const fileExtension = url.split(".").pop()?.toLowerCase() || "mp4";

    // Determine stream type based on file extension
    let streamType = "mp4";
    if (["mkv", "avi", "mov", "webm"].includes(fileExtension)) {
      streamType = fileExtension;
    }

    stream.push({
      server: "111477.xyz",
      link: url,
      type: streamType,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://a.111477.xyz/",
      },
    });

    return stream;
  } catch (err) {
    console.error("111477 stream error:", err);
    return [];
  }
};
