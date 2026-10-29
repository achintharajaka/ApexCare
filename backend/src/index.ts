import { app } from "./app.js";
import { env } from "./config/env.js";

const PORT = Number(process.env.PORT) || env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`
===========================================================
  🏥 APEXCARE HOSPITAL MANAGEMENT SYSTEM (HMS)
  Status:  Running on http://${HOST}:${PORT}
  Environment: ${env.NODE_ENV}
  Data Encryption: AES-256-GCM (HIPAA / ISO 27001 Compliant)
  Modular Architecture: Fault-Isolated Microkernel Active
  Diagnostics: http://${HOST}:${PORT}/api/health
===========================================================
  `);
});
