import multer from "multer";
import { Request, Response, NextFunction } from "express";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  limits: { fileSize: MAX_SIZE },
  storage: multer.memoryStorage(),
});

function detectMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }

  // PDF: 25 50 44 46 (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }

  return null;
}

export const processMedicalFileUpload = [
  upload.single("medicalDocument"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    try {
      const detectedMime = detectMagicBytes(req.file.buffer);
      if (!detectedMime) {
        return res.status(400).json({
          error: "Invalid file payload. Only authenticated JPEG, PNG, and PDF files are allowed.",
        });
      }

      req.file.mimetype = detectedMime;
      next();
    } catch {
      return res.status(400).json({ error: "File inspection failed" });
    }
  },
];
