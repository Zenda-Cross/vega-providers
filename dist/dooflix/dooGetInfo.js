"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dooGetInfo = void 0;
const headers = {
    'Accept-Encoding': 'gzip',
    'API-KEY': '2pm95lc6prpdbk0ppji9rsqo',
    Connection: 'Keep-Alive',
    'If-Modified-Since': 'Wed, 14 Aug 2024 13:00:04 GMT',
    'User-Agent': 'okhttp/3.14.9',
};
const dooGetInfo = async function ({ link, providerContext, }) {
    try {
        const { axios } = providerContext;
        const res = await axios.get(link, { headers });
        const resData = res.data;
        const jsonStart = resData?.indexOf('{');
        const jsonEnd = resData?.lastIndexOf('}') + 1;
        const data = JSON?.parse(resData?.substring(jsonStart, jsonEnd))?.title
            ? JSON?.parse(resData?.substring(jsonStart, jsonEnd))
            : resData;
        const title = data?.title || '';
        const synopsis = data?.description || '';
        const image = data?.poster_url || '';
        const cast = data?.cast || [];
        const rating = data?.imdb_rating || '';
        const type = Number(data?.is_tvseries) ? 'series' : 'movie';
        const tags = data?.genre?.map((genre) => genre?.name) || [];
        const links = [];
        if (type === 'series') {
            data?.season?.map((season) => {
                const title = season?.seasons_name || '';
                const directLinks = season?.episodes?.map((episode) => ({
                    title: episode?.episodes_name,
                    link: episode?.file_url,
                })) || [];
                links.push({
                    title: title,
                    directLinks: directLinks,
                });
            });
        }
        else {
            data?.videos?.map((video) => {
                links.push({
                    title: title + ' ' + video?.label,
                    directLinks: [
                        {
                            title: 'Play',
                            link: video?.file_url,
                        },
                    ],
                });
            });
        }
        return {
            image: image?.includes('https') ? image : image?.replace('http', 'https'),
            synopsis: synopsis,
            title: title,
            rating: rating,
            imdbId: '',
            cast: cast,
            tags: tags,
            type: type,
            linkList: links,
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
exports.dooGetInfo = dooGetInfo;
