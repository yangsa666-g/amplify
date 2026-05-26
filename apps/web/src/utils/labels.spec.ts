import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { statusLabel, effortLabel } from './labels';
import { ssoErrorMessage } from './ssoErrors';

// Identity stub: returns the i18n key so we can assert which branch was taken.
const t = ((key: string) => key) as unknown as TFunction;

describe('statusLabel', () => {
  it('maps known statuses to their i18n keys', () => {
    expect(statusLabel(t, 'success')).toBe('status.success');
    expect(statusLabel(t, 'failed')).toBe('status.failed');
    expect(statusLabel(t, 'running')).toBe('status.running');
    expect(statusLabel(t, 'pending')).toBe('status.pending');
  });

  it('falls back to the raw value for unknown/empty input', () => {
    expect(statusLabel(t, 'weird')).toBe('weird');
    expect(statusLabel(t, undefined)).toBe('');
  });
});

describe('effortLabel', () => {
  it('maps known efforts and falls back otherwise', () => {
    expect(effortLabel(t, 'xhigh')).toBe('effort.xhigh');
    expect(effortLabel(t, 'unknown')).toBe('unknown');
  });
});

describe('ssoErrorMessage', () => {
  it('returns null when no code is given', () => {
    expect(ssoErrorMessage(t, null)).toBeNull();
    expect(ssoErrorMessage(t, undefined)).toBeNull();
  });

  it('maps known codes to specific messages', () => {
    expect(ssoErrorMessage(t, 'state')).toBe('login.errors.state');
    expect(ssoErrorMessage(t, 'disabled')).toBe('login.errors.disabled');
  });

  it('maps unknown codes to the generic failure message', () => {
    expect(ssoErrorMessage(t, 'something-else')).toBe('login.signInFailedGeneric');
  });
});
