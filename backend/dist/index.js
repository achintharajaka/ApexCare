"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const PORT = Number(process.env.PORT) || env_js_1.env.PORT || 5000;
const HOST = "0.0.0.0";
app_js_1.app.listen(PORT, HOST, () => {
    console.log(`
===========================================================
  🏥 APEXCARE HOSPITAL MANAGEMENT SYSTEM (HMS)
  Status:  Running on http://${HOST}:${PORT}
  Environment: ${env_js_1.env.NODE_ENV}
  Data Encryption: AES-256-GCM (HIPAA / ISO 27001 Compliant)
  Modular Architecture: Fault-Isolated Microkernel Active
  Diagnostics: http://${HOST}:${PORT}/api/health
===========================================================
  `);
});
