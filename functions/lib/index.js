"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtp = exports.verifyOtp = exports.sendOtp = void 0;
const sendOtp_1 = require("./auth/sendOtp");
Object.defineProperty(exports, "sendOtp", { enumerable: true, get: function () { return sendOtp_1.sendOtp; } });
const verifyOtp_1 = require("./auth/verifyOtp");
Object.defineProperty(exports, "verifyOtp", { enumerable: true, get: function () { return verifyOtp_1.verifyOtp; } });
const resendOtp_1 = require("./auth/resendOtp");
Object.defineProperty(exports, "resendOtp", { enumerable: true, get: function () { return resendOtp_1.resendOtp; } });
//# sourceMappingURL=index.js.map