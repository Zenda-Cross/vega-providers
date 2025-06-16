"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = async function ({ url: link, providerContext, }) {
    const { getBaseUrl, axios } = providerContext;
    let providerValue = "netflixMirror";
    try {
        const baseUrl = await getBaseUrl("nfMirror");
        const url = `${baseUrl}${providerValue === "netflixMirror"
            ? "/episodes.php?s="
            : "/pv/episodes.php?s="}` +
            link +
            "&t=" +
            Math.round(new Date().getTime() / 1000);
        console.log("nfEpisodesUrl", url);
        const res = await axios.get(url, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        const data = res.data;
        console.log("nfEpisodes", data);
        const episodeList = [];
        data?.episodes?.map((episode) => {
            episodeList.push({
                title: "Episode " + episode?.ep.replace("E", ""),
                link: episode?.id,
            });
        });
        return episodeList;
    }
    catch (err) {
        console.error("nfGetEpisodes error", err);
        return [];
    }
};
exports.getEpisodes = getEpisodes;
