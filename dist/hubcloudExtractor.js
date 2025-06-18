"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.hubcloudExtracter = hubcloudExtracter;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const headers_1 = require("./headers");
const decode = function (value) {
    if (value === undefined) {
        return '';
    }
    return atob(value.toString());
};
function hubcloudExtracter(link, signal) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            console.log('hubcloudExtracter', link);
            const baseUrl = link.split('/').slice(0, 3).join('/');
            const streamLinks = [];
            const vLinkRes = yield (0, axios_1.default)(`${link}`, { headers: headers_1.headers, signal });
            const vLinkText = vLinkRes.data;
            const $vLink = cheerio.load(vLinkText);
            const vLinkRedirect = vLinkText.match(/var\s+url\s*=\s*'([^']+)';/) || [];
            let vcloudLink = decode((_b = (_a = vLinkRedirect[1]) === null || _a === void 0 ? void 0 : _a.split('r=')) === null || _b === void 0 ? void 0 : _b[1]) ||
                vLinkRedirect[1] ||
                $vLink('.fa-file-download.fa-lg').parent().attr('href') ||
                link;
            console.log('vcloudLink', vcloudLink);
            if (vcloudLink === null || vcloudLink === void 0 ? void 0 : vcloudLink.startsWith('/')) {
                vcloudLink = `${baseUrl}${vcloudLink}`;
                console.log('New vcloudLink', vcloudLink);
            }
            const vcloudRes = yield fetch(vcloudLink, {
                headers: headers_1.headers,
                signal,
                redirect: 'follow',
            });
            const $ = cheerio.load(yield vcloudRes.text());
            // console.log('vcloudRes', $.text());
            const linkClass = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary');
            for (const element of linkClass) {
                const itm = $(element);
                let link = itm.attr('href') || '';
                if ((link === null || link === void 0 ? void 0 : link.includes('.dev')) && !(link === null || link === void 0 ? void 0 : link.includes('/?id='))) {
                    streamLinks.push({ server: 'Cf Worker', link: link, type: 'mkv' });
                }
                if (link === null || link === void 0 ? void 0 : link.includes('pixeld')) {
                    if (!(link === null || link === void 0 ? void 0 : link.includes('api'))) {
                        const token = link.split('/').pop();
                        const baseUrl = link.split('/').slice(0, -2).join('/');
                        link = `${baseUrl}/api/file/${token}?download`;
                    }
                    streamLinks.push({ server: 'Pixeldrain', link: link, type: 'mkv' });
                }
                if ((link === null || link === void 0 ? void 0 : link.includes('hubcloud')) || (link === null || link === void 0 ? void 0 : link.includes('/?id='))) {
                    try {
                        const newLinkRes = yield axios_1.default.head(link, { headers: headers_1.headers, signal });
                        const newLink = ((_e = (_d = (_c = newLinkRes.request) === null || _c === void 0 ? void 0 : _c.responseURL) === null || _d === void 0 ? void 0 : _d.split('link=')) === null || _e === void 0 ? void 0 : _e[1]) || link;
                        streamLinks.push({ server: 'hubcloud', link: newLink, type: 'mkv' });
                    }
                    catch (error) {
                        console.log('hubcloudExtracter error in hubcloud link: ', error);
                    }
                }
                if (link === null || link === void 0 ? void 0 : link.includes('cloudflarestorage')) {
                    streamLinks.push({ server: 'CfStorage', link: link, type: 'mkv' });
                }
                if (link === null || link === void 0 ? void 0 : link.includes('fastdl')) {
                    streamLinks.push({ server: 'FastDl', link: link, type: 'mkv' });
                }
                if (link.includes('hubcdn')) {
                    streamLinks.push({
                        server: 'HubCdn',
                        link: link,
                        type: 'mkv',
                    });
                }
            }
            console.log('streamLinks', streamLinks);
            return streamLinks;
        }
        catch (error) {
            console.log('hubcloudExtracter error: ', error);
            return [];
        }
    });
}
