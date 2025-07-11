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
exports.getBaseUrl = void 0;
// 1 hour
const expireTime = 60 * 60 * 1000;
const getBaseUrl = (providerValue) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let baseUrl = "";
        const cacheKey = "CacheBaseUrl" + providerValue;
        const timeKey = "baseUrlTime" + providerValue;
        // const cachedUrl = cacheStorageService.getString(cacheKey);
        // const cachedTime = cacheStorageService.getObject<number>(timeKey);
        // if (cachedUrl && cachedTime && Date.now() - cachedTime < expireTime) {
        //   baseUrl = cachedUrl;
        // } else {
        const baseUrlRes = yield fetch("https://himanshu8443.github.io/providers/modflix.json");
        const baseUrlData = yield baseUrlRes.json();
        baseUrl = baseUrlData[providerValue].url;
        // cacheStorageService.setString(cacheKey, baseUrl);
        // cacheStorageService.setObject(timeKey, Date.now());
        // }
        return baseUrl;
    }
    catch (error) {
        console.error(`Error fetching baseUrl: ${providerValue}`, error);
        return "";
    }
});
exports.getBaseUrl = getBaseUrl;
