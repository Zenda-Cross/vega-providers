"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nfGetStream = void 0;
const nfGetStream = async ({ link: id, providerContext, }) => {
    const { getBaseUrl } = providerContext;
    try {
        let providerValue = 'netflixMirror';
        const baseUrl = await getBaseUrl('nfMirror');
        const url = `https://netmirror.8man.me/api/net-proxy?url=${baseUrl}${providerValue === 'netflixMirror'
            ? '/mobile/playlist.php?id='
            : '/pv/playlist.php?id='}${id}&t=${Math.round(new Date().getTime() / 1000)}`;
        console.log('nfGetStream, url:', url);
        const res = await fetch(url, {
            credentials: 'omit',
        });
        const resJson = await res.json();
        const data = resJson?.[0];
        const streamLinks = [];
        data?.sources.forEach((source) => {
            streamLinks.push({
                server: source.label,
                link: (baseUrl + source.file)?.replace(':su', ':ni'),
                type: 'm3u8',
                headers: {
                    Referer: baseUrl,
                    origin: baseUrl,
                    Cookie: 'hd=on',
                },
            });
        });
        console.log(streamLinks);
        return streamLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
};
exports.nfGetStream = nfGetStream;
