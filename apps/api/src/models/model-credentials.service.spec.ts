import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ModelCredentialsService } from './model-credentials.service';

function createService(key = Buffer.alloc(32, 3).toString('base64')) {
  return new ModelCredentialsService({
    get: (_name: string, fallback: string) => key || fallback,
  } as ConfigService);
}

describe('ModelCredentialsService', () => {
  it('encrypts with a random IV and decrypts the original value', () => {
    const service = createService();
    const first = service.encrypt('secret-api-key');
    const second = service.encrypt('secret-api-key');

    expect(first).not.toBe(second);
    expect(first).not.toContain('secret-api-key');
    expect(service.decrypt(first)).toBe('secret-api-key');
    expect(service.decrypt(second)).toBe('secret-api-key');
  });

  it('rejects ciphertext encrypted with another key', () => {
    const encrypted = createService(Buffer.alloc(32, 1).toString('base64')).encrypt('secret');
    expect(() => createService(Buffer.alloc(32, 2).toString('base64')).decrypt(encrypted)).toThrow(
      /cannot be decrypted/,
    );
  });

  it('does not enable custom models without a valid key', () => {
    expect(createService('').isConfigured()).toBe(false);
    expect(createService('not-base64').isConfigured()).toBe(false);
    expect(() => createService('').encrypt('secret')).toThrow(/MODEL_CREDENTIALS_ENCRYPTION_KEY/);
  });
});
