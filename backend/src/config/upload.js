const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getStoragePaths } = require('./storage');

const storagePaths = getStoragePaths();

const ALLOWED_MIMES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.csv',
  'text/csv': '.csv',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/json': '.json',
  'text/plain': '.txt',
  'text/html': '.html',
  'application/octet-stream': '.log',
};

const ALLOWED_EXTENSIONS = /\.(pdf|docx|xlsx|csv|png|jpg|jpeg|zip|json|txt|html?|log)$/i;

function createUploader(subDir, options = {}) {
  const dest = storagePaths[subDir];
  if (!dest) {
    throw new Error(`Unknown storage subdirectory: ${subDir}. Valid: ${Object.keys(storagePaths).join(', ')}`);
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const sanitized = file.originalname
        .replace(ext, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
      const safeBase = sanitized || 'upload';
      const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeBase}${ext}`;
      cb(null, unique);
    },
  });

  const maxSize = options.maxFileSize || Number(process.env.MAX_FILE_SIZE) || 52428800;

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const mimeOk = !!ALLOWED_MIMES[file.mimetype];
      const extOk = ALLOWED_EXTENSIONS.test(ext);
      if (mimeOk || extOk) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, XLSX, CSV, PNG, JPG, ZIP, JSON, TXT, HTML, LOG`));
      }
    },
  });
}

function createMemoryUploader(options = {}) {
  const maxSize = options.maxFileSize || Number(process.env.MAX_FILE_SIZE) || 52428800;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
  });
}

module.exports = { createUploader, createMemoryUploader, ALLOWED_MIMES, ALLOWED_EXTENSIONS };
