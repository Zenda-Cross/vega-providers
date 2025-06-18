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
exports.getMeta = void 0;
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: data, }) {
        var _b, _c;
        try {
            const dataJson = JSON.parse(data);
            const title = (dataJson === null || dataJson === void 0 ? void 0 : dataJson.kn) || (dataJson === null || dataJson === void 0 ? void 0 : dataJson.mn);
            const image = (dataJson === null || dataJson === void 0 ? void 0 : dataJson.IH) || (dataJson === null || dataJson === void 0 ? void 0 : dataJson.IV);
            const tags = dataJson === null || dataJson === void 0 ? void 0 : dataJson.gn.split(",").slice(0, 3).map((tag) => tag.trim());
            const type = (dataJson === null || dataJson === void 0 ? void 0 : dataJson.cg) === "webSeries" ? "series" : "movie";
            const linkList = [];
            if ((dataJson === null || dataJson === void 0 ? void 0 : dataJson.cg) === "webSeries") {
                (_b = ["1", "2", "3", "4"]) === null || _b === void 0 ? void 0 : _b.forEach((item) => {
                    var _a;
                    const directLinks = [];
                    if (typeof (dataJson === null || dataJson === void 0 ? void 0 : dataJson["eServer" + item]) === "object" &&
                        ((_a = Object === null || Object === void 0 ? void 0 : Object.keys(dataJson === null || dataJson === void 0 ? void 0 : dataJson["eServer" + item])) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                        Object.keys(dataJson === null || dataJson === void 0 ? void 0 : dataJson["eServer" + item]).forEach((key) => {
                            directLinks.push({
                                title: "Episode " + key,
                                link: JSON.stringify({
                                    url: dataJson === null || dataJson === void 0 ? void 0 : dataJson["eServer" + item][key],
                                    server: "Server " + item,
                                }),
                            });
                        });
                        linkList.push({
                            title: (dataJson === null || dataJson === void 0 ? void 0 : dataJson.pn) + " (Server " + item + ")",
                            directLinks,
                        });
                    }
                });
            }
            else {
                const directLinks = [];
                (_c = ["1", "2", "3", "4"]) === null || _c === void 0 ? void 0 : _c.forEach((item) => {
                    if (dataJson === null || dataJson === void 0 ? void 0 : dataJson["s" + item]) {
                        directLinks.push({
                            title: "Server " + item + " (HD)",
                            link: JSON.stringify({
                                url: dataJson === null || dataJson === void 0 ? void 0 : dataJson.s1,
                                server: "Server " + item,
                            }),
                        });
                    }
                    if (dataJson === null || dataJson === void 0 ? void 0 : dataJson["4s" + item]) {
                        directLinks.push({
                            title: "Server " + item + " (480p)",
                            link: JSON.stringify({
                                url: dataJson === null || dataJson === void 0 ? void 0 : dataJson["4s" + item],
                                server: "Server " + item,
                            }),
                        });
                    }
                });
                linkList.push({
                    title: dataJson === null || dataJson === void 0 ? void 0 : dataJson.pn,
                    directLinks,
                });
            }
            return {
                title,
                image,
                imdbId: "",
                synopsis: "",
                type,
                linkList,
                tags,
            };
        }
        catch (err) {
            return {
                title: "",
                image: "",
                imdbId: "",
                synopsis: "",
                type: "movie",
                linkList: [],
                tags: [],
            };
        }
    });
};
exports.getMeta = getMeta;
