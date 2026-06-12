require('dotenv').config();

const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getStorageRoot() {
  const configured = process.env.STORAGE_ROOT;
  if (configured && typeof configured === 'string' && configured.trim()) {
    return path.resolve(configured.trim());
  }
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const root = path.resolve(projectRoot, 'storage');
  return root;
}

function getStoragePaths() {
  const storageRoot = getStorageRoot();

  const dirs = {
    root: storageRoot,
    reports: path.join(storageRoot, 'reports'),
    audits: path.join(storageRoot, 'audits'),
    findings: path.join(storageRoot, 'findings'),
    evidence: path.join(storageRoot, 'evidence'),
    temp: path.join(storageRoot, 'temp'),
    avatars: path.join(storageRoot, 'avatars'),
    exports: path.join(storageRoot, 'exports'),
    backups: path.join(storageRoot, 'backups'),
    support: path.join(storageRoot, 'support')
  };

  Object.values(dirs).forEach(ensureDir);

  return dirs;
}

function getUploadServePath() {
  return getStorageRoot();
}

function buildFileUrl(subDir, filename) {
  return `/uploads/${subDir}/${filename}`;
}

module.exports = {
  getStorageRoot,
  getStoragePaths,
  getUploadServePath,
  buildFileUrl
};