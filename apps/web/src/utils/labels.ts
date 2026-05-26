import type { TFunction } from 'i18next';

/** Localizes a backend job status value, falling back to the raw value. */
export function statusLabel(t: TFunction, status?: string | null): string {
  switch (status) {
    case 'success':
      return t('status.success');
    case 'failed':
      return t('status.failed');
    case 'running':
      return t('status.running');
    case 'pending':
      return t('status.pending');
    default:
      return status ?? '';
  }
}

/** Localizes a reasoning-effort value, falling back to the raw value. */
export function effortLabel(t: TFunction, effort?: string | null): string {
  switch (effort) {
    case 'none':
      return t('effort.none');
    case 'low':
      return t('effort.low');
    case 'medium':
      return t('effort.medium');
    case 'high':
      return t('effort.high');
    case 'xhigh':
      return t('effort.xhigh');
    default:
      return effort ?? '';
  }
}
