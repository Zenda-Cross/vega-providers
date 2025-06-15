"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardahdGetStream = void 0;
const GuardahdGetStream = async function ({ link: id, type, providerContext, }) {
    try {
        const { axios, cheerio, extractors } = providerContext;
        const { superVideoExtractor } = extractors;
        async function ExtractGuardahd({ imdb, // type,
        // episode,
         } // season,
        ) {
            try {
                const baseUrl = 'https://guardahd.stream';
                const path = '/set-movie-a/' + imdb;
                const url = baseUrl + path;
                console.log('url:', url);
                const res = await axios.get(url, { timeout: 4000 });
                const html = res.data;
                const $ = cheerio.load(html);
                const superVideoUrl = $('li:contains("supervideo")').attr('data-link');
                console.log('superVideoUrl:', superVideoUrl);
                if (!superVideoUrl) {
                    return null;
                }
                const controller2 = new AbortController();
                const signal2 = controller2.signal;
                setTimeout(() => controller2.abort(), 4000);
                const res2 = await fetch('https:' + superVideoUrl, { signal: signal2 });
                const data = await res2.text();
                //   console.log('mostraguarda data:', data);
                const streamUrl = await superVideoExtractor(data);
                return streamUrl;
            }
            catch (err) {
                console.error('Error in GetMostraguardaStram:', err);
            }
        }
        async function GetMostraguardaStream({ imdb, type, season, episode, }) {
            try {
                const baseUrl = 'https://mostraguarda.stream';
                const path = type === 'tv'
                    ? `/serie/${imdb}/${season}/${episode}`
                    : `/movie/${imdb}`;
                const url = baseUrl + path;
                console.log('url:', url);
                const res = await axios(url, { timeout: 4000 });
                const html = res.data;
                const $ = cheerio.load(html);
                const superVideoUrl = $('li:contains("supervideo")').attr('data-link');
                console.log('superVideoUrl:', superVideoUrl);
                if (!superVideoUrl) {
                    return null;
                }
                const controller2 = new AbortController();
                const signal2 = controller2.signal;
                setTimeout(() => controller2.abort(), 4000);
                const res2 = await fetch('https:' + superVideoUrl, { signal: signal2 });
                const data = await res2.text();
                //   console.log('mostraguarda data:', data);
                const streamUrl = await superVideoExtractor(data);
                return streamUrl;
            }
            catch (err) {
                console.error('Error in GetMostraguardaStram:', err);
            }
        }
        console.log(id);
        const streams = [];
        const { imdbId, season, episode } = JSON.parse(id);
        ///// mostraguarda
        const mostraguardaStream = await GetMostraguardaStream({
            imdb: imdbId,
            type: type,
            season: season,
            episode: episode,
        });
        if (mostraguardaStream) {
            streams.push({
                server: 'Supervideo 1',
                link: mostraguardaStream,
                type: 'm3u8',
            });
        }
        const guardahdStream = await ExtractGuardahd({
            imdb: imdbId,
            type: type,
            season: season,
            episode: episode,
        });
        if (guardahdStream) {
            streams.push({
                server: 'Supervideo 2',
                link: guardahdStream,
                type: 'm3u8',
            });
        }
        return streams;
    }
    catch (err) {
        console.error(err);
        return [];
    }
};
exports.GuardahdGetStream = GuardahdGetStream;
