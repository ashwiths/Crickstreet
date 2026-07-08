"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// Initialize Firebase Admin SDK
firebase_admin_1.default.initializeApp();
exports.db = firebase_admin_1.default.firestore();
exports.auth = firebase_admin_1.default.auth();
//# sourceMappingURL=firebase.js.map