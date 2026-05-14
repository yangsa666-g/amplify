import React from 'react';
import { Card, Descriptions, Button, Form, Input, Typography, Space, Tag, message, Divider } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { changePassword, logout } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import type { ApiError } from '../types';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: () => logout(refreshToken),
    onSuccess: () => { clearAuth(); navigate('/login'); },
  });

  const changePwMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      changePassword(oldPassword, newPassword),
    onSuccess: () => message.success('Password changed successfully'),
    onError: (e: ApiError) => message.error(e.response?.data?.message || 'Failed to change password'),
  });

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 600 }}>
      <Typography.Title level={4}>Profile</Typography.Title>
      <Card>
        <Descriptions column={1}>
          <Descriptions.Item label="Name">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Role"><Tag color={user?.role === 'admin' ? 'gold' : 'blue'}>{user?.role}</Tag></Descriptions.Item>
          <Descriptions.Item label="Auth Provider"><Tag>{user?.authProvider}</Tag></Descriptions.Item>
        </Descriptions>
        <Divider />
        <Button danger loading={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>Logout</Button>
      </Card>

      {user?.authProvider === 'local' && (
        <Card title="Change Password">
          <Form layout="vertical" onFinish={(v) => changePwMutation.mutate(v)}>
            <Form.Item label="Current Password" name="oldPassword" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item label="New Password" name="newPassword" rules={[{ required: true, min: 8 }]}>
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={changePwMutation.isPending}>Change Password</Button>
          </Form>
        </Card>
      )}
    </Space>
  );
}
