"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flixhqGetInfo = void 0;
const flixhqGetInfo = async function ({ link: id, providerContext, }) {
    try {
        const { axios, getBaseUrl } = providerContext;
        const baseUrl = await getBaseUrl('consumet');
        const url = `${baseUrl}/movies/flixhq/info?id=` + id;
        const res = await axios.get(url);
        const data = res.data;
        const meta = {
            title: data.title,
            synopsis: data.description.replace(/<[^>]*>?/gm, '').trim(),
            image: data.cover,
            cast: data.casts,
            rating: data.rating,
            tags: [data?.type, data?.duration, data.releaseDate.split('-')[0]],
            imdbId: '',
            type: data.episodes.length > 1 ? 'series' : 'movie',
        };
        const links = [];
        data.episodes.forEach((episode) => {
            const title = episode?.number
                ? 'Season-' + episode?.season + ' Ep-' + episode.number
                : episode.title;
            const link = episode.id + '*' + data.id;
            if (link && title) {
                links.push({
                    title,
                    link,
                });
            }
        });
        return {
            ...meta,
            linkList: [
                {
                    title: meta.title,
                    directLinks: links,
                },
            ],
        };
    }
    catch (err) {
        console.error(err);
        return {
            title: '',
            synopsis: '',
            image: '',
            imdbId: '',
            type: 'movie',
            linkList: [],
        };
    }
};
exports.flixhqGetInfo = flixhqGetInfo;
