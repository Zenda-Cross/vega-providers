"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokyoGetInfo = void 0;
const tokyoGetInfo = async function ({ link, providerContext, }) {
    try {
        const { cheerio } = providerContext;
        const url = link;
        const res = await fetch(url);
        const data = await res.text();
        const $ = cheerio.load(data);
        const meta = {
            title: $('.c_h2:contains("Title(s):")')
                .text()
                .replace('Title(s):', '')
                .trim()
                .split('\n')[0],
            synopsis: $('.c_h2b:contains("Summary:"),.c_h2:contains("Summary:")')
                .text()
                .replace('Summary:', '')
                .trim(),
            image: $('.a_img').attr('src') || '',
            imdbId: '',
            type: 'series',
        };
        const episodesList = [];
        $('.episode').map((i, element) => {
            const link = 'https://www.tokyoinsider.com' + $(element).find('a').attr('href') ||
                $('.download-link').attr('href');
            let title = $(element).find('a').find('em').text() +
                ' ' +
                $(element).find('a').find('strong').text();
            if (!title.trim()) {
                title = $('.download-link').text();
            }
            if (link && title.trim()) {
                episodesList.push({ title, link });
            }
        });
        return {
            ...meta,
            linkList: [
                {
                    title: meta.title,
                    directLinks: episodesList,
                },
            ],
        };
    }
    catch (err) {
        return {
            title: '',
            synopsis: '',
            image: '',
            imdbId: '',
            type: 'series',
            linkList: [],
        };
    }
};
exports.tokyoGetInfo = tokyoGetInfo;
