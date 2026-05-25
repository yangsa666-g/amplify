import React from 'react';
import { Spin, Result, Button } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeEntraCode } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

const ERROR_MESSAGES: Record<string, string> = {
  state: 'The sign-in request could not be verified. Please try again.',
  exchange: 'We could not complete sign-in with Microsoft. Please try again.',
  disabled: 'Your account is disabled. Please contact an administrator.',
  provider: 'Microsoft reported a sign-in error. Please try again.',
};

// Lands here after the backend Entra callback redirects with a one-time `code`
// (or an `sso_error`). Exchanges the code for app tokens, then enters the app.
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return; // guard against React 18 StrictMode double-invoke (code is single-use)
    ran.current = true;

    const ssoError = params.get('sso_error');
    if (ssoError) {
      setError(ERROR_MESSAGES[ssoError] || 'Sign-in failed. Please try again.');
      return;
    }

    const code = params.get('code');
    if (!code) {
      setError('Missing sign-in code. Please try again.');
      return;
    }

    const returnTo = params.get('returnTo');
    const target = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/analysis';

    exchangeEntraCode(code)
      .then((r) => {
        setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
        navigate(target, { replace: true });
      })
      .catch(() => setError(ERROR_MESSAGES.exchange));
  }, [params, navigate, setAuth]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Result
          status="error"
          title="Sign-in failed"
          subTitle={error}
          extra={<Button type="primary" onClick={() => navigate('/login', { replace: true })}>Back to login</Button>}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Spin size="large" tip="Signing you in…" />
    </div>
  );
}
