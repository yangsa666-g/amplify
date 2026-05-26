import type { TFunction } from 'i18next';

/** Maps a backend `sso_error` code to a localized, user-facing message. */
export function ssoErrorMessage(t: TFunction, code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case 'state':
      return t('login.errors.state');
    case 'exchange':
      return t('login.errors.exchange');
    case 'disabled':
      return t('login.errors.disabled');
    case 'provider':
      return t('login.errors.provider');
    default:
      return t('login.signInFailedGeneric');
  }
}
