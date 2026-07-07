import * as fs from 'fs';

export function getUploadDir(): string {
  const dir = process.env.FILE_UPLOAD_DIR || './uploads';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
