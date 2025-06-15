"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokyoGetStream = void 0;
const tokyoGetStream = async function ({ link, providerContext, }) {
    try {
        const { cheerio } = providerContext;
        const url = link;
        const res = await fetch(url);
        const data = await res.text();
        const $ = cheerio.load(data);
        const streamLinks = [];
        $('.c_h1,.c_h2').map((i, element) => {
            $(element).find('span').remove();
            const title = $(element).find('a').text() || '';
            const link = $(element).find('a').attr('href') || '';
            if (title && link.includes('media')) {
                streamLinks.push({
                    server: title,
                    link,
                    type: link.split('.').pop() || 'mkv',
                });
            }
        });
        return streamLinks;
    }
    catch (err) {
        return [];
    }
};
exports.tokyoGetStream = tokyoGetStream;
