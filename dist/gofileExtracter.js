"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gofileExtracter = gofileExtracter;
const axios_1 = __importDefault(require("axios"));
async function gofileExtracter(id) {
    try {
        const gofileRes = await axios_1.default.get('https://gofile.io/d/' + id);
        const genAccountres = await axios_1.default.post('https://api.gofile.io/accounts');
        const token = genAccountres.data.data.token;
        console.log('gofile token', token);
        const wtRes = await axios_1.default.get('https://gofile.io/dist/js/global.js');
        const wt = wtRes.data.match(/appdata\.wt\s*=\s*["']([^"']+)["']/)[1];
        console.log('gofile wt', wt);
        const res = await axios_1.default.get(`https://api.gofile.io/contents/${id}?wt=${wt}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const oId = Object.keys(res.data.data.children)[0];
        console.log('gofile extracter', res.data.data.children[oId].link);
        const link = res.data.data.children[oId].link;
        return {
            link,
            token,
        };
    }
    catch (e) {
        console.log('gofile extracter err', e);
        return {
            link: '',
            token: '',
        };
    }
}
