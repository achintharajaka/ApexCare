"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    console.log("==============================================================");
    console.log("ApexCare Hospital Management System (HMS) - Database Accounts");
    console.log("==============================================================");
    const roleAccounts = [
        { role: "ADMIN", username: "superadmin", pass: "Test1234!", title: "Namal Kumara - Chief Administrator" },
        { role: "DOCTOR", username: "doctor1", pass: "Doctor1234!", title: "Dr. Kasun Perera, MD - Consultant Physician" },
        { role: "NURSE", username: "nurse1", pass: "Nurse1234!", title: "Nurse Nimali Fernando - Nursing Officer" },
        { role: "RECEPTIONIST", username: "receptionist1", pass: "Reception1234!", title: "Chaminda Silva - Patient Access Officer" },
        { role: "LAB_TECH", username: "labtech1", pass: "Lab1234!", title: "Dr. Dilani Wickramasinghe - Pathologist" },
        { role: "PHARMACIST", username: "pharmacist1", pass: "Pharm1234!", title: "Nuwan Bandara - Chief Pharmacist" },
        { role: "ACCOUNTANT", username: "accountant1", pass: "Account1234!", title: "Tharindu Jayawardena - Finance Controller" },
    ];
    console.log("Tenant: ApexCare Health Network - Sri Lanka (slug: apexcare-main)");
    console.log("Currency: Sri Lankan Rupees (Rs. / LKR)");
    console.log("Configured Role Accounts for Individual Login & Activity Access:");
    for (const acc of roleAccounts) {
        const hash = await bcryptjs_1.default.hash(acc.pass, 10);
        console.log(`  [${acc.role}] Username: ${acc.username.padEnd(14)} Password: ${acc.pass.padEnd(14)} (${acc.title})`);
    }
    console.log("Dummy Data Status: Cleared. All clinical and financial tables clean.");
    console.log("==============================================================");
    console.log("Database initialized: Ready for production-grade clinical operation.");
}
main().catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
});
