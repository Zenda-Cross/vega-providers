"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeta = void 0;
const getMeta = async function ({ link, providerContext, }) {
    try {
        const { getBaseUrl, axios } = providerContext;
        const baseUrl = await getBaseUrl("consumet");
        const url = `${baseUrl}/anime/zoro/info?id=` + link;
        const res = await axios.get(url);
        const data = res.data;
        const meta = {
            title: data.title,
            synopsis: data.description,
            image: data.image,
            tags: [
                data?.type,
                data?.subOrDub === "both" ? "Sub And Dub" : data?.subOrDub,
            ],
            imdbId: "",
            type: data.episodes.length > 0 ? "series" : "movie",
        };
        const linkList = [];
        const subLinks = [];
        data.episodes.forEach((episode) => {
            if (!episode?.isSubbed) {
                return;
            }
            const title = "Episode " + episode.number + (episode?.isFiller ? " (Filler)" : "");
            const link = episode.id + "$sub";
            if (link && title) {
                subLinks.push({
                    title,
                    link,
                });
            }
        });
        linkList.push({
            title: meta.title + " (Sub)",
            directLinks: subLinks,
        });
        if (data?.subOrDub === "both") {
            const dubLinks = [];
            data.episodes.forEach((episode) => {
                if (!episode?.isDubbed) {
                    return;
                }
                const title = "Episode " + episode.number + (episode?.isFiller ? " (Filler)" : "");
                const link = episode.id + "$dub";
                if (link && title) {
                    dubLinks.push({
                        title,
                        link,
                    });
                }
            });
            linkList.push({
                title: meta.title + " (Dub)",
                directLinks: dubLinks,
            });
        }
        return {
            ...meta,
            linkList: linkList,
        };
    }
    catch (err) {
        console.error(err);
        return {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };
    }
};
exports.getMeta = getMeta;
