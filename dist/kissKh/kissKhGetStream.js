"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kissKhGetStream = void 0;
const types_1 = require("../types");
const kissKhGetStream = async function ({ link: id, providerContext, }) {
    try {
        const { axios, getBaseUrl } = providerContext;
        const streamLinks = [];
        const subtitles = [];
        const baseUrl = await getBaseUrl('kissKh');
        const streamUrl = 'https://adorable-salamander-ecbb21.netlify.app/api/kisskh/video?id=' +
            id;
        const res = await axios.get(streamUrl);
        const stream = res.data?.source?.Video;
        const subData = res.data?.subtitles;
        subData?.map((sub) => {
            subtitles.push({
                title: sub?.label,
                language: sub?.land,
                type: sub?.src?.includes('.vtt')
                    ? types_1.TextTrackType.VTT
                    : types_1.TextTrackType.SUBRIP,
                uri: sub?.src,
            });
        });
        streamLinks.push({
            server: 'kissKh',
            link: stream,
            type: 'm3u8',
            subtitles,
            headers: {
                referer: baseUrl,
            },
        });
        return streamLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
};
exports.kissKhGetStream = kissKhGetStream;
