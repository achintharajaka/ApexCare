import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

export function sanitizeRichText(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br", "span"],
    ALLOWED_ATTR: ["class"],
  });
}

export const CreateConsultationSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional(),
  diagnosis: z.string().min(3).max(500),
  clinicalNotes: z.string().min(5).max(10000),
  icdCode: z.string().optional(),
  treatmentHistory: z.string().optional(),
  prescriptions: z.array(
    z.object({
      medicineId: z.string().min(1),
      dosage: z.string().min(1),
      frequency: z.string().min(1),
      duration: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).optional(),
});
