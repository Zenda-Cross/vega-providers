"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffEpisodeLinks = void 0;
const ffEpisodeLinks = async function ({ url, providerContext, }) {
    try {
        const headers = providerContext.commonHeaders;
        const { axios, cheerio } = providerContext;
        const res = await axios.get(url, { headers });
        const data = res.data;
        const $ = cheerio.load(data);
        const episodeLinks = [];
        $('.dlink.dl').map((i, element) => {
            const title = $(element)
                .find('a')
                .text()
                ?.replace('Download', '')
                ?.trim();
            const link = $(element).find('a').attr('href');
            if (title && link) {
                episodeLinks.push({
                    title,
                    link,
                });
            }
        });
        return episodeLinks;
    }
    catch (err) {
        console.error('cl episode links', err);
        return [];
    }
};
exports.ffEpisodeLinks = ffEpisodeLinks;
