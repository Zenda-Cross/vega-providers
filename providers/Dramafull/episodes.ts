import { EpisodeLink, ProviderContext } from "../types";

// Standard headers
const defaultHeaders = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://dramafull.cc/",
};

/**
 * Fetch episode list using Dramafull API
 */
export const getEpisodes = async function ({
    url,
    providerContext,
}: {
    url: string;
    providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
    const { axios } = providerContext;

    try {
        /**
         * Example watch URL:
         * https://dramafull.cc/watch/41507-luban-mysteries-2025-504815
         */
        const match = url.match(/\/watch\/(\d+)-/);
        if (!match) return [];

        const filmId = match[1];
        const apiUrl = `https://dramafull.cc/api/films/${filmId}/seasons/1/episodes`;

        const res = await axios.get(apiUrl, {
            headers: defaultHeaders,
        });

        const data = res.data?.data;
        if (!Array.isArray(data)) return [];

        const episodes: EpisodeLink[] = data.map((ep: any) => ({
            title: `Episode ${ep.episode}`,
            link: ep.url,
        }));

        return episodes;
    } catch (err) {
        console.error(
            "getEpisodes API error:",
            err instanceof Error ? err.message : String(err)
        );
        return [];
    }
};
