const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  reportProblem,
  analyzeText,
  getProblems,
  getMyProblems,
  getStats,
  getProblemById,
  updateStatus,
  supportProblem
} = require('../controllers/problemController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const valid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    if (valid) return cb(null, true);
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

// Routes
router.post('/report', protect, upload.single('image'), reportProblem);
router.post('/analyze', protect, analyzeText);
router.get('/', protect, getProblems);
router.get('/my', protect, getMyProblems);
router.get('/stats', protect, getStats);
router.get('/:id', protect, getProblemById);
router.put('/:id/status', protect, adminOnly, updateStatus);
router.post('/:id/support', protect, supportProblem);

module.exports = router;
