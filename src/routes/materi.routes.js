const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/materi.controller');
const { authenticateToken } = require('../middlewares/auth');
const response = require('../utils/response');

const router = express.Router();

const TEMP_DIR = process.env.MATERI_TEMP_DIR || '/var/www/data/elearning/temp';
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.mp4', '.mkv', '.avi']);
const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/x-matroska',
  'video/avi',
  'video/msvideo',
  'video/x-msvideo',
]);

const sanitizeBaseName = (fileName) => fileName
  .replace(/\s+/g, '_')
  .replace(/[^a-zA-Z0-9._-]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(TEMP_DIR, { recursive: true }, (err) => cb(err, TEMP_DIR));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeBaseName(path.basename(file.originalname, ext)) || 'video';
    const timestamp = Date.now();
    cb(null, `${base}-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error('Only mp4, mkv, avi video files are allowed'));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});
router.get('/', authenticateToken, controller.getAllMateri);
router.post('/upload', authenticateToken, upload.single('file'), controller.uploadVideo);
router.post('/progress', authenticateToken, controller.updateProgress);
router.get('/status/:id', authenticateToken, controller.getMateriStatus);

// Retry processing untuk video yang stuck/failed (mis. setelah server restart)
router.post('/retry/:id', authenticateToken, controller.retryVideoProcessing);

// Monitoring: lihat berapa worker FFmpeg sedang aktif (khusus admin)
router.get('/worker-stats', authenticateToken, controller.getWorkerStats);

router.use((err, req, res, next) => {
  if (err) {
    return response.badRequest(res, err.message || 'Upload failed');
  }

  return next();
});

module.exports = router;
