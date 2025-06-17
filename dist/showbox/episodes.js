"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = async function ({ url: id, providerContext, }) {
    const { axios } = providerContext;
    try {
        const [fileId, febboxId] = id.split("&");
        const febLink = febboxId
            ? `https://www.febbox.com/file/file_share_list?share_key=${fileId}&pwd=&parent_id=${febboxId}&is_html=0`
            : `https://www.febbox.com/file/file_share_list?share_key=${fileId}&pwd=&is_html=0`;
        const res = await axios.get(febLink);
        const data = res.data;
        const fileList = data.data.file_list;
        const episodeLinks = [];
        fileList?.map((file) => {
            const fileName = formatEpisodeName(file.file_name);
            const epId = file?.fid;
            if (!file.is_dir && fileName && epId) {
                episodeLinks.push({
                    title: fileName,
                    link: `${fileId}&${epId}`,
                });
            }
        });
        return episodeLinks;
    }
    catch (err) {
        return [];
    }
};
exports.getEpisodes = getEpisodes;
function formatEpisodeName(title) {
    const regex = /[sS](\d+)\s*[eE](\d+)/;
    const match = title.match(regex);
    if (match) {
        const season = match[1].padStart(2, "0");
        const episode = match[2].padStart(2, "0");
        return `Season${season} Episode${episode}`;
    }
    else {
        return title;
    }
}
