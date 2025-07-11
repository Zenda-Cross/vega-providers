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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gofileExtracter = gofileExtracter;
const axios_1 = __importDefault(require("axios"));
function gofileExtracter(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const gofileRes = yield axios_1.default.get('https://gofile.io/d/' + id);
            const genAccountres = yield axios_1.default.post('https://api.gofile.io/accounts');
            const token = genAccountres.data.data.token;
            console.log('gofile token', token);
            const wtRes = yield axios_1.default.get('https://gofile.io/dist/js/global.js');
            const wt = wtRes.data.match(/appdata\.wt\s*=\s*["']([^"']+)["']/)[1];
            console.log('gofile wt', wt);
            const res = yield axios_1.default.get(`https://api.gofile.io/contents/${id}?wt=${wt}`, {
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
    });
}
