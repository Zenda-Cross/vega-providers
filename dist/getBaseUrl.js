"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseUrl = void 0;
const storage_1 = require("../storage");
// 1 hour
const expireTime = 60 * 60 * 1000;
const getBaseUrl = async (providerValue) => {
    try {
        let baseUrl = '';
        const cacheKey = 'CacheBaseUrl' + providerValue;
        const timeKey = 'baseUrlTime' + providerValue;
        const cachedUrl = storage_1.cacheStorageService.getString(cacheKey);
        const cachedTime = storage_1.cacheStorageService.getObject(timeKey);
        if (cachedUrl &&
            cachedTime &&
            Date.now() - cachedTime < expireTime) {
            baseUrl = cachedUrl;
        }
        else {
            const baseUrlRes = await fetch('https://himanshu8443.github.io/providers/modflix.json');
            const baseUrlData = await baseUrlRes.json();
            baseUrl = baseUrlData[providerValue].url;
            storage_1.cacheStorageService.setString(cacheKey, baseUrl);
            storage_1.cacheStorageService.setObject(timeKey, Date.now());
        }
        return baseUrl;
    }
    catch (error) {
        console.error(`Error fetching baseUrl: ${providerValue}`, error);
        return '';
    }
};
exports.getBaseUrl = getBaseUrl;
