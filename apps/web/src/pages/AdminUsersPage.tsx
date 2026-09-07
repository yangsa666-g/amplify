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
  Tabs,
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
import {
  createOrganization,
  getOrganizations,
  updateOrganization,
  updateOrganizationStatus,
} from '../api/organizations';
import { useAuthStore } from '../stores/authStore';
import { message } from '../utils/message';
import { formatDate } from '../utils/format';
import type { User, ApiError, Organization } from '../types';
import { getAuthenticationConfiguration } from '../api/auth';

type ModalMode = 'create' | 'edit';
type OrganizationModalMode = 'create' | 'edit';

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const [form] = Form.useForm();
  const [organizationForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false);
  const [organizationModalMode, setOrganizationModalMode] =
    useState<OrganizationModalMode>('create');
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const selectedAuthProvider = Form.useWatch('authProvider', form);
  const selectedFirstAdminAuthProvider = Form.useWatch('adminAuthProvider', organizationForm);

  const roleLabel = (role: string) =>
    role === 'super_admin'
      ? t('admin.users.roleSuperAdmin')
      : role === 'admin'
        ? t('admin.users.roleAdmin')
        : t('admin.users.roleUser');
  const userStatusLabel = (status: string) =>
    status === 'active' ? t('admin.users.statusActive') : t('admin.users.statusDisabled');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', selectedOrganizationId],
    queryFn: () =>
      getAdminUsers({ organizationId: isSuperAdmin ? selectedOrganizationId : undefined }).then(
        (r) => r.data,
      ),
  });

  const { data: organizations = [], isLoading: organizationsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations().then((r) => r.data),
    enabled: isSuperAdmin,
  });

  const { data: authenticationConfiguration } = useQuery({
    queryKey: ['authentication-configuration'],
    queryFn: () => getAuthenticationConfiguration().then((response) => response.data),
    staleTime: 30_000,
  });
  const localAuthEnabled = authenticationConfiguration?.localAuthEnabled ?? true;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  };

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
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; email?: string; organizationId?: string };
    }) => updateAdminUser(id, data),
    onSuccess: () => {
      message.success(t('admin.users.userUpdated'));
      setModalOpen(false);
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.updateFailed')),
  });

  const roleMutation = useMutation({
    mutationFn: ({
      id,
      role,
      organizationId,
    }: {
      id: string;
      role: User['role'];
      organizationId?: string | null;
    }) => updateAdminUserRole(id, role, organizationId),
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

  const createOrganizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      message.success(t('admin.users.organizationCreated'));
      setOrganizationModalOpen(false);
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.createOrganizationFailed')),
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string } }) =>
      updateOrganization(id, data),
    onSuccess: () => {
      message.success(t('admin.users.organizationUpdated'));
      setOrganizationModalOpen(false);
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.updateOrganizationFailed')),
  });

  const organizationStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      updateOrganizationStatus(id, status),
    onSuccess: () => {
      message.success(t('admin.users.organizationStatusUpdated'));
      invalidate();
    },
    onError: (e: ApiError) =>
      message.error(e?.response?.data?.message ?? t('admin.users.updateOrganizationStatusFailed')),
  });

  const openCreate = () => {
    setModalMode('create');
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'user',
      authProvider: localAuthEnabled ? 'local' : 'entra',
    });
    setModalOpen(true);
  };

  const openCreateOrganization = () => {
    setOrganizationModalMode('create');
    setEditingOrganization(null);
    organizationForm.resetFields();
    organizationForm.setFieldsValue({
      adminAuthProvider: localAuthEnabled ? 'local' : 'entra',
    });
    setOrganizationModalOpen(true);
  };

  const openEditOrganization = (organization: Organization) => {
    setOrganizationModalMode('edit');
    setEditingOrganization(organization);
    organizationForm.setFieldsValue({ name: organization.name });
    setOrganizationModalOpen(true);
  };

  const openEdit = (u: User) => {
    setModalMode('edit');
    setEditingUser(u);
    form.setFieldsValue({ name: u.name, email: u.email, organizationId: u.organizationId });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalMode === 'create') {
      createMutation.mutate(values);
    } else if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          name: values.name,
          email: values.email,
          ...(isSuperAdmin && editingUser.role !== 'super_admin'
            ? { organizationId: values.organizationId }
            : {}),
        },
      });
    }
  };

  const handleOrganizationSubmit = async () => {
    const values = await organizationForm.validateFields();
    if (organizationModalMode === 'create') {
      createOrganizationMutation.mutate({
        name: values.name,
        firstAdmin: {
          name: values.adminName,
          email: values.adminEmail,
          password: values.adminPassword,
          authProvider: values.adminAuthProvider,
        },
      });
    } else if (editingOrganization) {
      updateOrganizationMutation.mutate({
        id: editingOrganization.id,
        data: { name: values.name },
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
        ...(isSuperAdmin ? [{ text: t('admin.users.roleSuperAdmin'), value: 'super_admin' }] : []),
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
              ...(isSuperAdmin
                ? [{ value: 'super_admin', label: t('admin.users.roleSuperAdmin') }]
                : []),
            ]}
            onChange={(val) =>
              roleMutation.mutate({
                id: record.id,
                role: val as User['role'],
                organizationId: record.organizationId,
              })
            }
          />
        ),
    },
    ...(isSuperAdmin
      ? ([
          {
            title: t('admin.users.colOrganization'),
            dataIndex: ['organization', 'name'],
            key: 'organization',
            filters: [
              { text: t('admin.users.platform'), value: '__platform__' },
              ...organizations.map((organization) => ({
                text: organization.name,
                value: organization.id,
              })),
            ],
            filterSearch: true,
            onFilter: (value: React.Key | boolean, record: User) =>
              value === '__platform__'
                ? record.role === 'super_admin'
                : record.organizationId === value,
            render: (_: unknown, record: User) =>
              record.role === 'super_admin' ? (
                <Tag>{t('admin.users.platform')}</Tag>
              ) : (
                record.organization?.name
              ),
          },
        ] satisfies TableColumnsType<User>)
      : []),
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
      render: (provider: User['authProvider']) => (
        <Tag>{provider === 'local' ? t('admin.users.authLocal') : t('admin.users.authSso')}</Tag>
      ),
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
          <Tooltip
            title={
              isSuperAdmin
                ? t('admin.users.editNameEmailOrganization')
                : t('admin.users.editNameEmail')
            }
          >
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

  const organizationColumns: TableColumnsType<Organization> = [
    { title: t('admin.users.organization'), dataIndex: 'name', key: 'name' },
    {
      title: t('admin.users.colStatus'),
      dataIndex: 'status',
      key: 'status',
      render: (status: Organization['status']) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{userStatusLabel(status)}</Tag>
      ),
    },
    {
      title: t('admin.users.tabUsers'),
      key: 'users',
      render: (_: unknown, record: Organization) => record._count?.users ?? 0,
    },
    {
      title: t('analysis.columns.created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date, i18n.language),
    },
    {
      title: t('admin.users.colActions'),
      key: 'actions',
      render: (_: unknown, record: Organization) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditOrganization(record)}
          />
          <Button
            size="small"
            icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
            danger={record.status === 'active'}
            onClick={() =>
              organizationStatusMutation.mutate({
                id: record.id,
                status: record.status === 'active' ? 'disabled' : 'active',
              })
            }
          />
        </Space>
      ),
    },
  ];

  const usersTable = (
    <>
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
    </>
  );

  const organizationsTable = (
    <>
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
          {t('admin.users.organizations')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateOrganization}>
          {t('admin.users.createOrganization')}
        </Button>
      </div>
      <Table
        loading={organizationsLoading}
        dataSource={organizations}
        columns={organizationColumns}
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />
    </>
  );

  return (
    <div>
      {isSuperAdmin ? (
        <Tabs
          items={[
            { key: 'users', label: t('admin.users.tabUsers'), children: usersTable },
            {
              key: 'organizations',
              label: t('admin.users.tabOrganizations'),
              children: organizationsTable,
            },
          ]}
        />
      ) : (
        usersTable
      )}

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
                name="authProvider"
                label={t('admin.users.authenticationMethod')}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    ...(localAuthEnabled
                      ? [{ value: 'local', label: t('admin.users.authLocal') }]
                      : []),
                    { value: 'entra', label: t('admin.users.authSso') },
                  ]}
                />
              </Form.Item>
              {selectedAuthProvider === 'local' && (
                <Form.Item
                  name="password"
                  label={t('admin.users.initialPassword')}
                  preserve={false}
                  rules={[
                    { required: true, message: t('admin.users.passwordRequired') },
                    { min: 8, message: t('admin.users.minChars') },
                  ]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              )}
              <Form.Item name="role" label={t('admin.users.colRole')} initialValue="user">
                <Select
                  options={[
                    { value: 'user', label: t('admin.users.roleUser') },
                    { value: 'admin', label: t('admin.users.roleAdmin') },
                    ...(isSuperAdmin
                      ? [{ value: 'super_admin', label: t('admin.users.roleSuperAdmin') }]
                      : []),
                  ]}
                />
              </Form.Item>
            </>
          )}
          {isSuperAdmin && (modalMode === 'create' || editingUser?.role !== 'super_admin') && (
            <Form.Item
              name="organizationId"
              label={t('admin.users.organization')}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    (modalMode === 'create' && getFieldValue('role') === 'super_admin') || value
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('admin.users.organizationRequired'))),
                }),
              ]}
            >
              <Select
                allowClear={modalMode === 'create'}
                showSearch
                optionFilterProp="label"
                options={organizations.map((org) => ({ value: org.id, label: org.name }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={
          organizationModalMode === 'create'
            ? t('admin.users.createOrganization')
            : t('admin.users.editOrganization')
        }
        open={organizationModalOpen}
        onOk={handleOrganizationSubmit}
        onCancel={() => setOrganizationModalOpen(false)}
        confirmLoading={
          createOrganizationMutation.isPending || updateOrganizationMutation.isPending
        }
        okText={organizationModalMode === 'create' ? t('common.create') : t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Form form={organizationForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('admin.users.organizationName')}
            rules={[{ required: true, message: t('admin.users.organizationNameRequired') }]}
          >
            <Input />
          </Form.Item>
          {organizationModalMode === 'create' && (
            <>
              <Form.Item
                name="adminName"
                label={t('admin.users.firstAdminName')}
                rules={[{ required: true, message: t('admin.users.firstAdminNameRequired') }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="adminEmail"
                label={t('admin.users.firstAdminEmail')}
                rules={[
                  { required: true, message: t('admin.users.firstAdminEmailRequired') },
                  { type: 'email', message: t('admin.users.validEmail') },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="adminAuthProvider"
                label={t('admin.users.authenticationMethod')}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    ...(localAuthEnabled
                      ? [{ value: 'local', label: t('admin.users.authLocal') }]
                      : []),
                    { value: 'entra', label: t('admin.users.authSso') },
                  ]}
                />
              </Form.Item>
              {selectedFirstAdminAuthProvider === 'local' && (
                <Form.Item
                  name="adminPassword"
                  label={t('admin.users.initialPassword')}
                  preserve={false}
                  rules={[
                    { required: true, message: t('admin.users.passwordRequired') },
                    { min: 8, message: t('admin.users.minChars') },
                  ]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
