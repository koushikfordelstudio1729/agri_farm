"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.services = exports.ImageService = void 0;
// Service exports
var imageService_1 = require("./imageService");
Object.defineProperty(exports, "ImageService", { enumerable: true, get: function () { return imageService_1.ImageService; } });
// Service registry for dependency injection (if needed)
exports.services = {
    image: 'ImageService',
};
//# sourceMappingURL=index.js.map