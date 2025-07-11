"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url: id, providerContext, }) {
        const { axios } = providerContext;
        try {
            const [fileId, febboxId] = id.split("&");
            const febLink = febboxId
                ? `https://www.febbox.com/file/file_share_list?share_key=${fileId}&pwd=&parent_id=${febboxId}&is_html=0`
                : `https://www.febbox.com/file/file_share_list?share_key=${fileId}&pwd=&is_html=0`;
            const res = yield axios.get(febLink);
            const data = res.data;
            const fileList = data.data.file_list;
            const episodeLinks = [];
            fileList === null || fileList === void 0 ? void 0 : fileList.map((file) => {
                const fileName = formatEpisodeName(file.file_name);
                const epId = file === null || file === void 0 ? void 0 : file.fid;
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
    });
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
