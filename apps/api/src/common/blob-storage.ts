import { BlobServiceClient } from '@azure/storage-blob';
import * as crypto from 'crypto';
import * as path from 'path';

function getContainerClient() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'uploads';
  return BlobServiceClient.fromConnectionString(connStr).getContainerClient(containerName);
}

export function isAzureStorageConfigured(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}

/**
 * Upload a buffer to Azure Blob Storage.
 * Returns the blob name (used as storagePath in the database).
 */
export async function uploadBlob(
  organizationId: string,
  userId: string,
  originalName: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const containerClient = getContainerClient();
  await containerClient.createIfNotExists();

  const ext = path.extname(originalName);
  const blobName = `${organizationId}/${userId}/${crypto.randomBytes(12).toString('hex')}${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobName;
}

/** Download a blob and return it as a Buffer. */
export async function downloadBlobAsBuffer(blobName: string): Promise<Buffer> {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);
  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Stream a blob directly into an Express response (for file download). */
export async function streamBlobToResponse(
  blobName: string,
  fileName: string,
  res: any,
): Promise<void> {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const props = await blockBlobClient.getProperties();
  const downloadResponse = await blockBlobClient.download(0);

  // RFC 5987/6266: keep an ASCII fallback in `filename` and the real UTF-8
  // name in `filename*` so non-English names (e.g. Chinese) download intact.
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  res.setHeader('Content-Type', props.contentType || 'application/octet-stream');
  if (props.contentLength !== undefined) {
    res.setHeader('Content-Length', props.contentLength);
  }

  (downloadResponse.readableStreamBody as NodeJS.ReadableStream).pipe(res);
}
