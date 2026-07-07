import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getUploadDir } from './storage';

const originalUploadDir = process.env.FILE_UPLOAD_DIR;
const originalCwd = process.cwd();

describe('getUploadDir', () => {
  afterEach(() => {
    process.env.FILE_UPLOAD_DIR = originalUploadDir;
    process.chdir(originalCwd);
  });

  it('strips inline comments from FILE_UPLOAD_DIR', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
    const uploadDir = path.join(tempRoot, 'files');
    process.env.FILE_UPLOAD_DIR = `${uploadDir} # Directory for uploaded files`;

    expect(getUploadDir()).toBe(uploadDir);
    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  it('maps Docker /app uploads to the repo root during local dev', () => {
    if (fs.existsSync('/app')) {
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
    const apiDir = path.join(tempRoot, 'apps', 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    process.chdir(apiDir);
    process.env.FILE_UPLOAD_DIR = '/app/uploads';

    const uploadDir = getUploadDir();

    expect(fs.realpathSync(uploadDir)).toBe(fs.realpathSync(path.join(tempRoot, 'uploads')));
    expect(fs.existsSync(uploadDir)).toBe(true);
  });
});
