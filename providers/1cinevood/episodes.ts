import { EpisodeLink, ProviderContext } from "../types";

const formatEpisodeTitle = (fileName: string): string => {
  try {
    // Match patterns like S03E01, S03E1, s03e01, etc.
    const match = fileName.match(/S(\d+)E(\d+)/i);
    if (match) {
      const season = match[1].padStart(2, "0");
      const episode = match[2].padStart(2, "0");
      return `S${season} E${episode}`;
    }
    return fileName;
  } catch {
    return fileName;
  }
};

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);
  try {
    const baseUrl = url.split("/").slice(0, 3).join("/");
    const id = url.split("/").filter(Boolean).pop() || "";
    const apiUrl = `${baseUrl}/api/packs/${id}`;
    console.log("apiUrl:", apiUrl);

    let res;
    try {
      res = await axios.get(apiUrl, {
        headers: headers,
      });
    } catch (error: any) {
      // If 404, try alternative API endpoint
      if (error.response?.status === 404) {
        const alternativeUrl = `${baseUrl}/api/s/${id}/`;
        console.log("Trying alternative URL:", alternativeUrl);

        const altRes = await axios.get(alternativeUrl, {
          headers: headers,
        });

        // Check if hubcloud is available
        if (altRes.data?.hasHubcloud) {
          const hubcloudUrl = `${baseUrl}/api/s/${id}/hubcloud`;
          return [
            {
              title: formatEpisodeTitle(altRes.data.fileName || "Movie"),
              link: hubcloudUrl,
            },
          ];
        }

        return [];
      }
      throw error;
    }

    const episodes: EpisodeLink[] = [];

    const items = res.data?.pack?.items || [];

    for (const item of items) {
      if (item.file_name && item.hubcloud_link) {
        episodes.push({
          title: formatEpisodeTitle(item.file_name),
          link: item.hubcloud_link,
        });
      }
    }

    return episodes;
  } catch (err) {
    throw err;
  }
};
