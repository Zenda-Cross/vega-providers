"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeta = void 0;
const getMeta = async function ({ link, providerContext, }) {
    try {
        const { axios } = providerContext;
        const res = await axios.get(link);
        const data = res.data;
        const meta = {
            title: data.title,
            synopsis: data.description,
            image: data.thumbnail,
            tags: [data?.releaseDate?.split("-")[0], data?.status, data?.type],
            imdbId: "",
            type: data.episodesCount > 1 ? "series" : "movie",
        };
        const linkList = [];
        const subLinks = [];
        data?.episodes?.reverse().map((episode) => {
            const title = "Episode " + episode?.number;
            const link = episode?.id?.toString();
            if (link && title) {
                subLinks.push({
                    title,
                    link,
                });
            }
        });
        linkList.push({
            title: meta.title,
            directLinks: subLinks,
        });
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
