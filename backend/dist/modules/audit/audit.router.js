"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const store_js_1 = require("../../db/store.js");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.get("/", (_req, res) => {
    return res.json(store_js_1.auditLogs);
});
