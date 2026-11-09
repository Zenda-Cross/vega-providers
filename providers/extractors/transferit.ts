import { AxiosInstance } from "axios";

export async function transferitExtractor(
  transferId: string,
  axios: AxiosInstance,
  userAgent?: string
): Promise<string | null> {
  try {
    const megaApiUrl = `https://g.api.mega.co.nz/cs?x=${transferId}&bc=1`;
    const headers = {
      "Content-Type": "application/json",
      "User-Agent":
        userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    const fileListRes = await axios.post(
      megaApiUrl,
      [{ a: "f", c: 1, r: 1 }],
      {
        headers,
        timeout: 10000,
      }
    );

    const fileNode = fileListRes.data?.[0]?.f?.find((f: any) => f.t === 0);
    if (!fileNode?.h) return null;

    const dlRes = await axios.post(
      megaApiUrl,
      [{ a: "g", n: fileNode.h, pt: 1, g: 1, ssl: 1 }],
      {
        headers,
        timeout: 10000,
      }
    );

    const gUrl = dlRes.data?.[0]?.g;
    if (!gUrl) return null;

    return `${gUrl}/video.mp4`;
  } catch (err: any) {
    return null;
  }
}