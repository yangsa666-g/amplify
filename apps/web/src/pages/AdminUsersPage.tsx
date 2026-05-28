import React, { useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
  deleteAdminUser,
} from '../api/adminUsers';
import { useAuthStore } from '../stores/authStore';
import { message } from '../utils/message';
import { formatDate } from '../utils/format';
import type { User, ApiError } from '../types';

type ModalMode = 'create' | 'edit';

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const roleLabel = (role: string) =>
    role === 'admin' ? t('admin.users.roleAdmin') : t('admin.users.roleUser');
  const userStatusLabel = (status: string) =>
    status === 'active' ? t('admin.users.statusActive') : t('admin.users.statusDisabled');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers().then((r) => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      message.success(t('admin.users.userCreated'));
      setModalOpen(false);
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; email?: string } }) =>
      updateAdminUser(id, data),
    onSuccess: () => {
      message.success(t('admin.users.userUpdated'));
      setModalOpen(false);
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.updateFailed')),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'admin' | 'user' }) =>
      updateAdminUserRole(id, role),
    onSuccess: () => {
      message.success(t('admin.users.roleUpdated'));
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.roleFailed')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      updateAdminUserStatus(id, status),
    onSuccess: () => {
      message.success(t('admin.users.statusUpdated'));
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.statusFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      message.success(t('admin.users.userDeleted'));
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.deleteFailed')),
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
      updateMutation.mutate({
        id: editingUser.id,
        data: { name: values.name, email: values.email },
      });
    }
  };

  const isSelf = (u: User) => u.id === currentUser?.id;

  const columns: TableColumnsType<User> = [
    {
      title: t('admin.users.colName'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a: User, b: User) => a.name.localeCompare(b.name),
    },
    {
      title: t('admin.users.colEmail'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('admin.users.colRole'),
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: t('admin.users.roleAdmin'), value: 'admin' },
        { text: t('admin.users.roleUser'), value: 'user' },
      ],
      onFilter: (v: React.Key | boolean, r: User) => r.role === v,
      render: (role: string, record: User) =>
        isSelf(record) ? (
          <Tag color={role === 'admin' ? 'volcano' : 'default'}>{roleLabel(role)}</Tag>
        ) : (
          <Select
            value={role}
            size="small"
            style={{ width: 100 }}
            options={[
              { value: 'admin', label: t('admin.users.roleAdmin') },
              { value: 'user', label: t('admin.users.roleUser') },
            ]}
            onChange={(val) =>
              roleMutation.mutate({ id: record.id, role: val as 'admin' | 'user' })
            }
          />
        ),
    },
    {
      title: t('admin.users.colStatus'),
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: t('admin.users.statusActive'), value: 'active' },
        { text: t('admin.users.statusDisabled'), value: 'disabled' },
      ],
      onFilter: (v: React.Key | boolean, r: User) => r.status === v,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{userStatusLabel(status)}</Tag>
      ),
    },
    {
      title: t('admin.users.colAuth'),
      dataIndex: 'authProvider',
      key: 'auth',
      render: (p: string) => <Tag>{p}</Tag>,
    },
    {
      title: t('admin.users.colJoined'),
      dataIndex: 'createdAt',
      key: 'joined',
      render: (d: string) => formatDate(d, i18n.language),
      sorter: (a: User, b: User) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: t('admin.users.colActions'),
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title={t('admin.users.editNameEmail')}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              disabled={isSelf(record)}
            />
          </Tooltip>
          <Tooltip
            title={
              record.status === 'active'
                ? t('admin.users.disableAccount')
                : t('admin.users.enableAccount')
            }
          >
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
            title={t('admin.users.deleteConfirmTitle')}
            description={t('admin.users.deleteConfirmDesc')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t('common.delete')}
            okType="danger"
            disabled={isSelf(record)}
          >
            <Tooltip title={t('admin.users.deleteUser')}>
              <Button size="small" icon={<DeleteOutlined />} danger disabled={isSelf(record)} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('admin.users.title')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('admin.users.createUser')}
        </Button>
      </div>

      <Table
        loading={isLoading}
        dataSource={users}
        columns={columns}
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={modalMode === 'create' ? t('admin.users.createUser') : t('admin.users.editUser')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={modalMode === 'create' ? t('common.create') : t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('admin.users.colName')}
            rules={[{ required: true, message: t('admin.users.nameRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('admin.users.colEmail')}
            rules={[
              { required: true, message: t('admin.users.emailRequired') },
              { type: 'email', message: t('admin.users.validEmail') },
            ]}
          >
            <Input />
          </Form.Item>
          {modalMode === 'create' && (
            <>
              <Form.Item
                name="password"
                label={t('admin.users.password')}
                rules={[
                  { required: true, message: t('admin.users.passwordRequired') },
                  { min: 8, message: t('admin.users.minChars') },
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item name="role" label={t('admin.users.colRole')} initialValue="user">
                <Select
                  options={[
                    { value: 'user', label: t('admin.users.roleUser') },
                    { value: 'admin', label: t('admin.users.roleAdmin') },
                  ]}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
