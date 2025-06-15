"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flixhqGetStream = void 0;
const types_1 = require("../types");
const flixhqGetStream = async function ({ link: id, providerContext, }) {
    try {
        const { getBaseUrl } = providerContext;
        const episodeId = id.split('*')[0];
        const mediaId = id.split('*')[1];
        const baseUrl = await getBaseUrl('consumet');
        const serverUrl = `${baseUrl}/movies/flixhq/servers?episodeId=${episodeId}&mediaId=${mediaId}`;
        const res = await fetch(serverUrl);
        const servers = await res.json();
        const streamLinks = [];
        for (const server of servers) {
            const streamUrl = `${baseUrl}/movies/flixhq/watch?server=` +
                server.name +
                '&episodeId=' +
                episodeId +
                '&mediaId=' +
                mediaId;
            const streamRes = await fetch(streamUrl);
            const streamData = await streamRes.json();
            const subtitles = [];
            if (streamData?.sources?.length > 0) {
                if (streamData.subtitles) {
                    streamData.subtitles.forEach((sub) => {
                        subtitles.push({
                            language: sub?.lang?.slice(0, 2),
                            uri: sub?.url,
                            type: types_1.TextTrackType.VTT,
                            title: sub?.lang,
                        });
                    });
                }
                streamData.sources.forEach((source) => {
                    streamLinks.push({
                        server: server?.name +
                            '-' +
                            source?.quality?.replace('auto', 'MultiQuality'),
                        link: source.url,
                        type: source.isM3U8 ? 'm3u8' : 'mp4',
                        subtitles: subtitles,
                    });
                });
            }
        }
        return streamLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
};
exports.flixhqGetStream = flixhqGetStream;
