"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = async function ({ url, providerContext, }) {
    const { axios, cheerio } = providerContext;
    try {
        const res = await axios.get(url);
        const html = res.data;
        let $ = cheerio.load(html);
        const episodeLinks = [];
        $('strong:contains("Episode"),strong:contains("1080"),strong:contains("720"),strong:contains("480")').map((i, element) => {
            const title = $(element).text();
            const link = $(element)
                .parent()
                .parent()
                .next("h4")
                .find("a")
                .attr("href");
            if (link && !title.includes("zip")) {
                episodeLinks.push({
                    title: title,
                    link,
                });
            }
        });
        return episodeLinks;
    }
    catch (err) {
        return [
            {
                title: "Server 1",
                link: url,
            },
        ];
    }
};
exports.getEpisodes = getEpisodes;
