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
exports.getStream = void 0;
const getStream = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link, signal, providerContext, }) {
    var _b;
    try {
        let newLink = link;
        if (link.includes("luxedrive")) {
            const res = yield providerContext.axios.get(link);
            const $ = providerContext.cheerio.load(res.data);
            const hubcloudLink = $("a.btn.hubcloud").attr("href");
            if (hubcloudLink) {
                newLink = hubcloudLink;
            }
            else {
                const gdFlixLink = $("a.btn.gdflix").attr("href");
                if (gdFlixLink) {
                    newLink = gdFlixLink;
                }
            }
        }
        if (newLink.includes("gdflix")) {
            const sreams = yield providerContext.extractors.gdFlixExtracter(newLink, signal);
            return sreams;
        }
        const res2 = yield providerContext.axios.get(newLink, { signal });
        const data2 = res2.data;
        const hcLink = ((_b = data2.match(/location\.replace\('([^']+)'/)) === null || _b === void 0 ? void 0 : _b[1]) || newLink;
        const hubCloudLinks = yield providerContext.extractors.hubcloudExtracter(hcLink.includes("https://hubcloud") ? hcLink : newLink, signal);
        return hubCloudLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getStream = getStream;
