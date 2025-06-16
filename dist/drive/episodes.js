"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = async function ({ url, providerContext, }) {
    try {
        const { axios, cheerio } = providerContext;
        const res = await axios.get(url);
        const html = res.data;
        let $ = cheerio.load(html);
        const episodeLinks = [];
        $('a:contains("HubCloud")').map((i, element) => {
            const title = $(element).parent().prev().text();
            const link = $(element).attr("href");
            if (link && (title.includes("Ep") || title.includes("Download"))) {
                episodeLinks.push({
                    title: title.includes("Download") ? "Play" : title,
                    link,
                });
            }
        });
        // console.log(episodeLinks);
        return episodeLinks;
    }
    catch (err) {
        console.error(err);
        return [
            {
                title: "Server 1",
                link: url,
            },
        ];
    }
};
exports.getEpisodes = getEpisodes;
