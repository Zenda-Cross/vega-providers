"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ringzGetStream = void 0;
const ringzGetStream = async function ({ link: data, }) {
    const streamLinks = [];
    const dataJson = JSON.parse(data);
    streamLinks.push({
        link: dataJson.url,
        server: dataJson.server,
        type: 'mkv',
    });
    return streamLinks;
};
exports.ringzGetStream = ringzGetStream;
