import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";



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
}) {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    let processLink = link;
    if (processLink.includes("oxxfile")) {
      try {
        const urlObj = new URL(processLink);
        const id = processLink.split("/").filter(Boolean).pop();
        const apiUrl = `${urlObj.origin}/api/s/${id}/hubcloud`;
        const res = await fetch(apiUrl, { headers: commonHeaders, redirect: "follow", signal });
        if (res.url && res.url.includes("hubcloud")) {
          processLink = res.url;
        }
      } catch (e) {
        console.log("Error resolving oxxfile link", e);
      }
    }

    const hubcloudLink = await hubcloudExtractor(
      processLink,
      signal,
      axios,
      cheerio,
      commonHeaders,
    );

    return hubcloudLink;
  } catch (error: any) {
    console.log("getStream error: ", error);
    if (error.message.includes("Aborted")) {
    } else {
    }
    return [];
  }
}
