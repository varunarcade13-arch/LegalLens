import path from 'path';
import { IFileValidator, FileValidationResult } from '../../core/ports';

export class FileValidator implements IFileValidator {
  private maxSizeBytes: number;

  constructor(maxSizeBytes: number = 15 * 1024 * 1024) {
    // Default 15 MB
    this.maxSizeBytes = maxSizeBytes;
  }

  public validate(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): FileValidationResult {
    if (!file || !file.buffer) {
      return { valid: false, safeFilename: '', mimeType: '', error: 'No file provided' };
    }

    if (file.size > this.maxSizeBytes) {
      return {
        valid: false,
        safeFilename: '',
        mimeType: '',
        error: `File size exceeds the maximum limit of ${Math.round(this.maxSizeBytes / (1024 * 1024))}MB`,
      };
    }

    // Path traversal and dangerous character sanitation
    const baseName = path.basename(file.originalname);
    const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = sanitized.toLowerCase().split('.').pop() || '';

    // Check extension
    const allowedExtensions = ['pdf', 'docx', 'txt'];
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        safeFilename: '',
        mimeType: '',
        error: `Unsupported file format (.${ext}). Only PDF, DOCX, and TXT are supported.`,
      };
    }

    // Magic bytes validation
    const buffer = file.buffer;
    if (ext === 'pdf') {
      const isPdf =
        buffer.length >= 5 &&
        buffer[0] === 0x25 && // %
        buffer[1] === 0x50 && // P
        buffer[2] === 0x44 && // D
        buffer[3] === 0x46 && // F
        buffer[4] === 0x2d; // -
      if (!isPdf) {
        return { valid: false, safeFilename: '', mimeType: '', error: 'Corrupt or invalid PDF file header' };
      }
      return { valid: true, safeFilename: sanitized, mimeType: 'application/pdf' };
    }

    if (ext === 'docx') {
      const isZip =
        buffer.length >= 4 &&
        buffer[0] === 0x50 && // P
        buffer[1] === 0x4b && // K
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;
      if (!isZip) {
        return { valid: false, safeFilename: '', mimeType: '', error: 'Corrupt or invalid Word document structure' };
      }
      return {
        valid: true,
        safeFilename: sanitized,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }

    // ext === 'txt'
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      if (buffer[i] === 0x00) {
        return { valid: false, safeFilename: '', mimeType: '', error: 'Binary or null bytes detected in text file' };
      }
    }
    return { valid: true, safeFilename: sanitized, mimeType: 'text/plain' };
  }
}
