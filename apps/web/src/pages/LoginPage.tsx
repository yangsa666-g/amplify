import React from 'react';
import { Form, Input, Button, Card, Typography, Alert, Divider } from 'antd';
import { UserOutlined, LockOutlined, WindowsOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { login, getEntraEnabled } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import type { ApiError } from '../types';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  state: 'The sign-in request could not be verified. Please try again.',
  exchange: 'We could not complete sign-in with Microsoft. Please try again.',
  disabled: 'Your account is disabled. Please contact an administrator.',
  provider: 'Microsoft reported a sign-in error. Please try again.',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();

  const ssoError = params.get('sso_error');

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Amplify - Document Intelligent Platform
        </Typography.Title>
        {ssoError && (
          <Alert message={SSO_ERROR_MESSAGES[ssoError] || 'Sign-in failed. Please try again.'} type="error" style={{ marginBottom: 16 }} />
        )}
        {mutation.isError && (
          <Alert message={(mutation.error as ApiError)?.response?.data?.message || 'Login failed'} type="error" style={{ marginBottom: 16 }} />
        )}
        <Form onFinish={(v) => mutation.mutate(v)} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block size="large">
            Sign In
          </Button>
        </Form>
        {entraEnabled.data && (
          <>
            <Divider plain style={{ color: '#999' }}>or</Divider>
            <Button icon={<WindowsOutlined />} onClick={signInWithMicrosoft} block size="large">
              Sign in with Microsoft
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
