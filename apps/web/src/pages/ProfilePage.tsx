import React from 'react';
import { Card, Descriptions, Button, Form, Input, Typography, Space, Tag, Divider } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { changePassword, logout } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { message } from '../utils/message';
import type { ApiError } from '../types';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, clearAuth, refreshToken } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: () => logout(refreshToken),
    onSuccess: () => {
      clearAuth();
      navigate('/login');
    },
  });

  const changePwMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      changePassword(oldPassword, newPassword),
    onSuccess: () => message.success(t('profile.passwordChanged')),
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('profile.changePasswordFailed')),
  });

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 600 }}>
      <Typography.Title level={4}>{t('profile.title')}</Typography.Title>
      <Card>
        <Descriptions column={1}>
          <Descriptions.Item label={t('profile.name')}>{user?.name}</Descriptions.Item>
          <Descriptions.Item label={t('profile.email')}>{user?.email}</Descriptions.Item>
          <Descriptions.Item label={t('profile.role')}>
            <Tag
              color={
                user?.role === 'super_admin' ? 'purple' : user?.role === 'admin' ? 'gold' : 'blue'
              }
            >
              {user?.role}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('profile.authProvider')}>
            <Tag>{user?.authProvider}</Tag>
          </Descriptions.Item>
        </Descriptions>
        <Divider />
        <Button danger loading={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>
          {t('profile.logout')}
        </Button>
      </Card>

      {user?.authProvider === 'local' && (
        <Card title={t('profile.changePassword')}>
          <Form layout="vertical" onFinish={(v) => changePwMutation.mutate(v)}>
            <Form.Item
              label={t('profile.currentPassword')}
              name="oldPassword"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              label={t('profile.newPassword')}
              name="newPassword"
              rules={[{ required: true, min: 8 }]}
            >
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={changePwMutation.isPending}>
              {t('profile.changePassword')}
            </Button>
          </Form>
        </Card>
      )}
    </Space>
  );
}
