import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the local uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = [
    // Images — .svg, .webp, and .ico added: the organization logo/favicon
    // uploader's file picker (frontend/.../organization/settings/page.tsx)
    // explicitly advertises all three via its `accept` attribute (SVG is
    // the standard scalable-logo format, ICO the standard favicon format),
    // but they were missing here, so every one of those uploads failed
    // with "Unsupported file type" despite the UI inviting exactly that.
    '.png', '.jpeg', '.jpg', '.gif', '.heic', '.svg', '.webp', '.ico',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.zip', '.rar',
    '.mp3', '.wav',
    '.mp4', '.avi', '.mov'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});
