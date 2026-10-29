"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateConsultationSchema = void 0;
exports.sanitizeRichText = sanitizeRichText;
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
const zod_1 = require("zod");
function sanitizeRichText(dirtyHtml) {
    if (!dirtyHtml)
        return "";
    return isomorphic_dompurify_1.default.sanitize(dirtyHtml, {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br", "span"],
        ALLOWED_ATTR: ["class"],
    });
}
exports.CreateConsultationSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1),
    doctorId: zod_1.z.string().optional(),
    diagnosis: zod_1.z.string().min(3).max(500),
    clinicalNotes: zod_1.z.string().min(5).max(10000),
    icdCode: zod_1.z.string().optional(),
    treatmentHistory: zod_1.z.string().optional(),
    prescriptions: zod_1.z.array(zod_1.z.object({
        medicineId: zod_1.z.string().min(1),
        dosage: zod_1.z.string().min(1),
        frequency: zod_1.z.string().min(1),
        duration: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().positive(),
    })).optional(),
});
