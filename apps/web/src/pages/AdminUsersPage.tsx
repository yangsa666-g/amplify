import React, { useState } from 'react';
import {
  Typography, Table, Tag, Button, Space, Modal, Form, Input, Select,
  Popconfirm, message, Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  LockOutlined, UnlockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers, createAdminUser, updateAdminUser,
  updateAdminUserRole, updateAdminUserStatus, deleteAdminUser,
} from '../api/adminUsers';
import { useAuthStore } from '../stores/authStore';
import type { User, ApiError } from '../types';

type ModalMode = 'create' | 'edit';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers().then((r) => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => { message.success('User created'); setModalOpen(false); invalidate(); },
    onError: (e: ApiError) => message.error(e?.response?.data?.message ?? 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; email?: string } }) =>
      updateAdminUser(id, data),
    onSuccess: () => { message.success('User updated'); setModalOpen(false); invalidate(); },
    onError: (e: ApiError) => message.error(e?.response?.data?.message ?? 'Failed to update user'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'admin' | 'user' }) => updateAdminUserRole(id, role),
    onSuccess: () => { message.success('Role updated'); invalidate(); },
    onError: (e: ApiError) => message.error(e?.response?.data?.message ?? 'Failed to update role'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      updateAdminUserStatus(id, status),
    onSuccess: () => { message.success('Status updated'); invalidate(); },
    onError: (e: ApiError) => message.error(e?.response?.data?.message ?? 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => { message.success('User deleted'); invalidate(); },
    onError: (e: ApiError) => message.error(e?.response?.data?.message ?? 'Failed to delete user'),
  });

  const openCreate = () => {
    setModalMode('create');
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setModalMode('edit');
    setEditingUser(u);
    form.setFieldsValue({ name: u.name, email: u.email });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalMode === 'create') {
      createMutation.mutate(values);
    } else if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: { name: values.name, email: values.email } });
    }
  };

  const isSelf = (u: User) => u.id === currentUser?.id;

  const columns: TableColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: User, b: User) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      filters: [{ text: 'Admin', value: 'admin' }, { text: 'User', value: 'user' }],
      onFilter: (v: React.Key | boolean, r: User) => r.role === v,
      render: (role: string, record: User) =>
        isSelf(record) ? (
          <Tag color={role === 'admin' ? 'volcano' : 'default'}>{role}</Tag>
        ) : (
          <Select
            value={role}
            size="small"
            style={{ width: 90 }}
            options={[{ value: 'admin', label: 'admin' }, { value: 'user', label: 'user' }]}
            onChange={(val) => roleMutation.mutate({ id: record.id, role: val as 'admin' | 'user' })}
          />
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [{ text: 'Active', value: 'active' }, { text: 'Disabled', value: 'disabled' }],
      onFilter: (v: React.Key | boolean, r: User) => r.status === v,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Auth',
      dataIndex: 'authProvider',
      key: 'auth',
      render: (p: string) => <Tag>{p}</Tag>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'joined',
      render: (d: string) => new Date(d).toLocaleDateString(),
      sorter: (a: User, b: User) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title="Edit name / email">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              disabled={isSelf(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'active' ? 'Disable account' : 'Enable account'}>
            <Button
              size="small"
              icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
              danger={record.status === 'active'}
              onClick={() =>
                statusMutation.mutate({
                  id: record.id,
                  status: record.status === 'active' ? 'disabled' : 'active',
                })
              }
              disabled={isSelf(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this user?"
            description="This cannot be undone. All their data will be deleted."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okType="danger"
            disabled={isSelf(record)}
          >
            <Tooltip title="Delete user">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
                disabled={isSelf(record)}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>User Management</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Create User
        </Button>
      </div>

      <Table
        loading={isLoading}
        dataSource={users}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={modalMode === 'create' ? 'Create User' : 'Edit User'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={modalMode === 'create' ? 'Create' : 'Save'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input />
          </Form.Item>
          {modalMode === 'create' && (
            <>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 8, message: 'Minimum 8 characters' },
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item name="role" label="Role" initialValue="user">
                <Select options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
