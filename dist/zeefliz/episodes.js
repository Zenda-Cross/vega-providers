"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = function ({ url, providerContext, }) {
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    console.log("getEpisodeLinks", url);
    return axios
        .get(url, {
        headers: {
            ...headers,
        },
    })
        .then(function (res) {
        const $ = cheerio.load(res.data);
        const episodes = [];
        // Directly parse all h4 tags
        $("h4").each(function (_, element) {
            const el = $(element);
            const text = el.text().trim();
            console.log("FOUND H4:", text);
            // Match:
            // -:Episodes: 1:-
            // -:Episodes: 01:-
            // Episodes 1
            const match = text.match(/Episodes?\s*:?\s*(\d+)/i);
            if (!match) {
                return;
            }
            const epNum = match[1];
            const title = "Episode " + epNum;
            // Episode links are inside next p tag
            const p = el.next("p");
            if (!p || p.length === 0) {
                return;
            }
            let link;
            p.find("a").each(function (_, aTag) {
                const anchor = $(aTag);
                const href = anchor.attr("href");
                const anchorText = anchor.text().toLowerCase();
                console.log("ANCHOR:", anchorText, href);
                // Prefer Zee-Cloud link
                if (anchorText.indexOf("zee-cloud") !== -1 ||
                    anchorText.indexOf("v-cloud") !== -1 ||
                    anchorText.indexOf("resumable") !== -1) {
                    link = href;
                }
            });
            // fallback first link
            if (!link) {
                link = p.find("a").first().attr("href");
            }
            if (title && link) {
                episodes.push({
                    title: title,
                    link: link,
                });
                console.log("ADDED:", title, link);
            }
        });
        console.log("FINAL EPISODES:", episodes);
        return episodes;
    })
        .catch(function (err) {
        console.log("getEpisodeLinks error:", err);
        return [];
    });
};
exports.getEpisodes = getEpisodes;
