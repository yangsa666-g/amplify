import React from 'react';
import { Form, Input, Button, Card, Typography, Alert, Divider, theme } from 'antd';
import Icon, { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { login, getEntraEnabled } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import HeaderControls from '../components/HeaderControls';
import Logo from '../components/Logo';
import { ssoErrorMessage } from '../utils/ssoErrors';
import type { ApiError } from '../types';

// Official Microsoft four-square logo (not the Windows glyph).
const MicrosoftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 23 23" width="1em" height="1em" {...props}>
    <path fill="#F25022" d="M1 1h10v10H1z" />
    <path fill="#7FBA00" d="M12 1h10v10H12z" />
    <path fill="#00A4EF" d="M1 12h10v10H1z" />
    <path fill="#FFB900" d="M12 12h10v10H12z" />
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { setAuth } = useAuthStore();
  const mocksEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true';

  const ssoError = ssoErrorMessage(t, params.get('sso_error'));

  const entraEnabled = useQuery({
    queryKey: ['entra-enabled'],
    queryFn: () => getEntraEnabled().then((r) => r.data.enabled),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/analysis');
    },
  });

  const signInWithMicrosoft = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    window.location.href = `${apiBase}/auth/entra/login`;
  };

  const devSignIn = () => {
    setAuth(
      {
        id: 'mock-user-admin',
        email: 'dev@example.com',
        name: 'Dev Admin',
        role: 'admin',
        authProvider: 'local',
        status: 'active',
      },
      'mock-access-token',
      'mock-refresh-token',
    );
    navigate('/history?jobId=mock-analysis-success');
  };

  const pageStyle = {
    '--login-bg': token.colorBgLayout,
    '--login-card-bg': `${token.colorBgContainer}e6`,
    '--login-card-border': token.colorBorderSecondary,
    '--login-primary': token.colorPrimary,
    '--login-primary-soft': token.colorPrimaryBg,
    '--login-info-soft': token.colorInfoBg,
    '--login-success-soft': token.colorSuccessBg,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: token.colorBgLayout,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  } as React.CSSProperties;

  return (
    <div className="login-page" style={pageStyle}>
      <div className="login-page__background" aria-hidden="true">
        <div className="login-page__aurora" />
        <div className="login-page__grid" />
        <div className="login-page__scanline login-page__scanline--one" />
        <div className="login-page__scanline login-page__scanline--two" />
        <div className="login-page__chevron login-page__chevron--1" />
        <div className="login-page__chevron login-page__chevron--2" />
        <div className="login-page__chevron login-page__chevron--3" />
        <div className="login-page__chevron login-page__chevron--4" />
        <div className="login-page__chevron login-page__chevron--5" />
        <div className="login-page__chevron login-page__chevron--6" />
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
        <HeaderControls />
      </div>
      <Card className="login-page__card" style={{ width: '100%', maxWidth: 380 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Logo size={44} />
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('common.appName')}
          </Typography.Title>
        </div>
        {ssoError && <Alert message={ssoError} type="error" style={{ marginBottom: 16 }} />}
        {mutation.isError && (
          <Alert
            message={
              (mutation.error as ApiError)?.response?.data?.message || t('login.loginFailed')
            }
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}
        <Form onFinish={(v) => mutation.mutate(v)} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder={t('login.email')} size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.password')}
              size="large"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block size="large">
            {t('login.signIn')}
          </Button>
        </Form>
        {mocksEnabled && (
          <Button onClick={devSignIn} block size="large" style={{ marginTop: 12 }}>
            {t('login.devSignIn')}
          </Button>
        )}
        {entraEnabled.data && (
          <>
            <Divider plain style={{ color: token.colorTextTertiary }}>
              {t('common.or')}
            </Divider>
            <Button
              icon={<Icon component={MicrosoftIcon} />}
              onClick={signInWithMicrosoft}
              block
              size="large"
            >
              {t('login.ssoEntra')}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
