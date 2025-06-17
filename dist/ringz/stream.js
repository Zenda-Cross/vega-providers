"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = void 0;
const getStream = async function ({ link: data, }) {
    const streamLinks = [];
    const dataJson = JSON.parse(data);
    streamLinks.push({
        link: dataJson.url,
        server: dataJson.server,
        type: "mkv",
    });
    return streamLinks;
};
exports.getStream = getStream;
