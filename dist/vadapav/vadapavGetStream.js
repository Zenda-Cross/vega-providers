"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vadapavGetStream = void 0;
const vadapavGetStream = async function ({ link: url, // type,
 } // providerContext,
) {
    try {
        const stream = [];
        stream.push({
            server: 'vadapav',
            link: url,
            type: url?.split('.').pop() || 'mkv',
        });
        return stream;
    }
    catch (err) {
        return [];
    }
};
exports.vadapavGetStream = vadapavGetStream;
