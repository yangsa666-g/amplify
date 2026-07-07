import * as fs from 'fs';
import * as path from 'path';

function normalizeConfiguredDir(value: string): string {
  return value.replace(/\s+#.*$/, '').trim();
}

function isLocalDevContainerPath(dir: string): boolean {
  return path.isAbsolute(dir) && dir.startsWith('/app/') && !fs.existsSync('/app');
}

export function getUploadDir(): string {
  const configuredDir = normalizeConfiguredDir(process.env.FILE_UPLOAD_DIR || './uploads');
  const dir = isLocalDevContainerPath(configuredDir)
    ? path.resolve(process.cwd(), '..', '..', configuredDir.slice('/app/'.length))
    : configuredDir;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
