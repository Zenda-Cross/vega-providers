"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hiGetStream = void 0;
const types_1 = require("../types");
const hiGetStream = async function ({ link: id, providerContext, }) {
    try {
        const { getBaseUrl, axios } = providerContext;
        const baseUrl = await getBaseUrl('consumet');
        const servers = ['vidcloud', 'vidstreaming'];
        const url = `${baseUrl}/anime/zoro/watch?episodeId=${id}&server=`;
        const streamLinks = [];
        await Promise.all(servers.map(async (server) => {
            try {
                const res = await axios.get(url + server);
                if (res.data) {
                    const subtitles = [];
                    res.data?.subtitles.forEach((sub) => {
                        if (sub?.lang === 'Thumbnails')
                            return;
                        subtitles.push({
                            language: sub?.lang?.slice(0, 2) || 'Und',
                            uri: sub?.url,
                            title: sub?.lang || 'Undefined',
                            type: sub?.url?.endsWith('.vtt')
                                ? types_1.TextTrackType.VTT
                                : types_1.TextTrackType.SUBRIP,
                        });
                    });
                    res.data?.sources.forEach((source) => {
                        streamLinks.push({
                            server: server,
                            link: source?.url,
                            type: source?.isM3U8 ? 'm3u8' : 'mp4',
                            headers: {
                                Referer: 'https://megacloud.club/',
                                Origin: 'https://megacloud.club',
                            },
                            subtitles: subtitles,
                        });
                    });
                }
            }
            catch (e) {
                console.log(e);
            }
        }));
        return streamLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
};
exports.hiGetStream = hiGetStream;
