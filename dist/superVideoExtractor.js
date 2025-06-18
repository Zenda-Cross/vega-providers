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
exports.superVideoExtractor = superVideoExtractor;
function superVideoExtractor(data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Step 1: Extract the function parameters and the encoded string
            var functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
            var match = functionRegex.exec(data);
            let p = '';
            if (match) {
                // var params = match[1].split(',').map(param => param.trim());
                var encodedString = match[2];
                // console.log('Parameters:', params);
                // console.log('Encoded String:', encodedString.split("',36,")[0], '🔥🔥');
                p = (_a = encodedString.split("',36,")) === null || _a === void 0 ? void 0 : _a[0].trim();
                let a = 36;
                let c = encodedString.split("',36,")[1].slice(2).split('|').length;
                let k = encodedString.split("',36,")[1].slice(2).split('|');
                while (c--) {
                    if (k[c]) {
                        var regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
                        p = p.replace(regex, k[c]);
                    }
                }
                // console.log('Decoded String:', p);
            }
            else {
                console.log('No match found');
            }
            const streamUrl = (_b = p === null || p === void 0 ? void 0 : p.match(/file:\s*"([^"]+\.m3u8[^"]*)"/)) === null || _b === void 0 ? void 0 : _b[1];
            console.log('streamUrl:', streamUrl);
            return streamUrl || '';
        }
        catch (err) {
            console.error('SuperVideoExtractor Error:', err);
            return '';
        }
    });
}
