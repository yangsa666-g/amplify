import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { decodeModelCredentialsKey } from './model-credentials-key';

const PREFIX = 'v1';

@Injectable()
export class ModelCredentialsService {
  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return this.encryptionKey() !== null;
  }

  encrypt(value: string): string {
    const key = this.requireEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      PREFIX,
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(value: string): string {
    const key = this.requireEncryptionKey();
    const [version, ivRaw, tagRaw, encryptedRaw, ...extra] = value.split(':');
    if (version !== PREFIX || !ivRaw || !tagRaw || !encryptedRaw || extra.length > 0) {
      throw new ServiceUnavailableException('Stored model credentials are invalid');
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64'));
      decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('Stored model credentials cannot be decrypted');
    }
  }

  private requireEncryptionKey(): Buffer {
    const key = this.encryptionKey();
    if (!key) {
      throw new ServiceUnavailableException(
        'MODEL_CREDENTIALS_ENCRYPTION_KEY is required for custom models',
      );
    }
    return key;
  }

  private encryptionKey(): Buffer | null {
    return decodeModelCredentialsKey(
      this.config.get<string>('MODEL_CREDENTIALS_ENCRYPTION_KEY', ''),
    );
  }
}
