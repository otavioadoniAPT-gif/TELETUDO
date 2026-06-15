const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_PATH = process.env.UPLOADS_PATH || './uploads';
const absoluteUploadsPath = path.resolve(process.cwd(), UPLOADS_PATH);

if (!fs.existsSync(absoluteUploadsPath)) {
  fs.mkdirSync(absoluteUploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, absoluteUploadsPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = { upload, absoluteUploadsPath };
