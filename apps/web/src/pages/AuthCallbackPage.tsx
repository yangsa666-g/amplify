import React from 'react';
import { Spin, Result, Button, theme } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { exchangeEntraCode } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { ssoErrorMessage } from '../utils/ssoErrors';

// Lands here after the backend Entra callback redirects with a one-time `code`
// (or an `sso_error`). Exchanges the code for app tokens, then enters the app.
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { setAuth } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return; // guard against React 18 StrictMode double-invoke (code is single-use)
    ran.current = true;

    const ssoError = params.get('sso_error');
    if (ssoError) {
      setError(ssoErrorMessage(t, ssoError));
      return;
    }

    const code = params.get('code');
    if (!code) {
      setError(t('authCallback.missingCode'));
      return;
    }

    const returnTo = params.get('returnTo');
    const target = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/analysis';

    exchangeEntraCode(code)
      .then((r) => {
        setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
        navigate(target, { replace: true });
      })
      .catch(() => setError(t('login.errors.exchange')));
  }, [params, navigate, setAuth, t]);

  const centered: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: token.colorBgLayout, padding: 16,
  };

  if (error) {
    return (
      <div style={centered}>
        <Result
          status="error"
          title={t('authCallback.signInFailed')}
          subTitle={error}
          extra={<Button type="primary" onClick={() => navigate('/login', { replace: true })}>{t('authCallback.backToLogin')}</Button>}
        />
      </div>
    );
  }

  return (
    <div style={centered}>
      <Spin size="large" tip={t('authCallback.signingIn')} />
    </div>
  );
}
