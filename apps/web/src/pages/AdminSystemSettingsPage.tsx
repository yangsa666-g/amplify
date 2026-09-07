import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Typography,
  Tabs,
  Button,
  Card,
  Space,
  Tag,
  Popconfirm,
  Modal,
  Input,
  Spin,
  Empty,
  Select,
  Alert,
  Tooltip,
  Table,
  Switch,
  Form,
  theme,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  KeyOutlined,
  CopyOutlined,
  EyeOutlined,
  SaveOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type {
  FieldTemplate,
  FieldTemplateItem,
  PromptTemplate,
  PromptTemplateType,
  ApiError,
  Model,
  ReasoningEffort,
} from '../types';
import {
  adminListFieldTemplates,
  adminCreateFieldTemplate,
  adminUpdateFieldTemplate,
  adminDeleteFieldTemplate,
  adminSetDefaultFieldTemplate,
} from '../api/fieldTemplates';
import {
  adminListPromptTemplates,
  adminCreatePromptTemplate,
  adminUpdatePromptTemplate,
  adminDeletePromptTemplate,
  adminSetDefaultPromptTemplate,
} from '../api/promptTemplates';
import { getAdminRequests, approveRequest, rejectRequest } from '../api/templateRequests';
import { FieldTemplateEditorModal, PromptEditorModal } from '../components/TemplateEditorModals';
import { ModelProviderIcon } from '../components/ModelProviderIcon';
import type { ExpiryOption, ApiKeyInfo } from '../api/apiKeys';
import { getApiKey, createApiKey, deleteApiKey } from '../api/apiKeys';
import {
  createAdminModel,
  deleteAdminModel,
  getAdminModels,
  getModelConfigurationStatus,
  reorderAdminModels,
  testModelConnection,
  updateAdminModel,
  type CustomModelInput,
} from '../api/models';
import { message } from '../utils/message';
import { formatDate, formatDateTime } from '../utils/format';
import { templateDisplayName } from '../utils/templateLabels';
import { modelIconName } from '../utils/modelIcons';
import { useAuthStore } from '../stores/authStore';
import {
  getAdminAuthenticationSettings,
  updateAdminAuthenticationSettings,
} from '../api/authenticationSettings';

// ─── Authentication Tab ─────────────────────────────────────────────────────

function AuthenticationSettingsTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-authentication-settings'],
    queryFn: () => getAdminAuthenticationSettings().then((response) => response.data),
  });
  const updateMutation = useMutation({
    mutationFn: updateAdminAuthenticationSettings,
    onSuccess: (response) => {
      queryClient.setQueryData(['admin-authentication-settings'], response.data);
      queryClient.invalidateQueries({ queryKey: ['authentication-configuration'] });
      message.success(t('admin.system.authentication.saved'));
    },
    onError: (error: ApiError) =>
      message.error(error.response?.data?.message || t('admin.system.authentication.saveFailed')),
  });

  if (isLoading) return <Spin />;

  const localAuthEnabled = data?.localAuthEnabled ?? true;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 760 }}>
      <Card
        title={
          <Space>
            {t('admin.system.authentication.localTitle')}
            <Tag color={canEdit ? 'blue' : 'default'}>
              {canEdit
                ? t('admin.system.authentication.platformSetting')
                : t('admin.system.authentication.inherited')}
            </Tag>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            {t('admin.system.authentication.localDescription')}
          </Typography.Text>
          <Space>
            <Switch
              checked={localAuthEnabled}
              loading={updateMutation.isPending}
              disabled={!canEdit}
              onChange={(enabled) => updateMutation.mutate(enabled)}
            />
            <Typography.Text>
              {localAuthEnabled
                ? t('admin.system.authentication.enabled')
                : t('admin.system.authentication.disabled')}
            </Typography.Text>
          </Space>
        </Space>
      </Card>
      {!canEdit && (
        <Alert
          type="info"
          showIcon
          message={t('admin.system.authentication.inheritedDescription')}
        />
      )}
      {!localAuthEnabled && (
        <Alert type="warning" showIcon message={t('admin.system.authentication.disabledWarning')} />
      )}
    </Space>
  );
}

type ModelDraft = Partial<Pick<Model, 'label' | 'enabled' | 'defaultReasoningEffort'>>;
type CustomModelFormValues = CustomModelInput;

// ─── System Field Templates Tab ───────────────────────────────────────────────

function SystemFieldTemplatesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const isPlatformContext =
    useAuthStore((s) => s.user?.role) === 'super_admin' && !selectedOrganizationId;
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-field-templates', selectedOrganizationId],
    queryFn: () => adminListFieldTemplates().then((r) => r.data),
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FieldTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: ({ name, items }: { name: string; items: FieldTemplateItem[] }) =>
      adminCreateFieldTemplate(name, items).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-field-templates'] });
      setEditorOpen(false);
      message.success(t('admin.system.templateCreated'));
    },
    onError: () => message.error(t('admin.system.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, items }: { id: string; name: string; items: FieldTemplateItem[] }) =>
      adminUpdateFieldTemplate(id, name, items).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-field-templates'] });
      setEditorOpen(false);
      message.success(t('admin.system.templateSaved'));
    },
    onError: () => message.error(t('admin.system.saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteFieldTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-field-templates'] });
      message.success(t('admin.system.templateDeleted'));
    },
    onError: () => message.error(t('admin.system.deleteFailed')),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => adminSetDefaultFieldTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-field-templates'] });
      message.success(t('admin.system.defaultUpdated'));
    },
    onError: () => message.error(t('admin.system.failed')),
  });

  const handleSave = (name: string, items: FieldTemplateItem[]) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, name, items });
    } else {
      createMutation.mutate({ name, items });
    }
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditingTemplate(null);
          setEditorOpen(true);
        }}
      >
        {t('admin.system.createNewSystem')}
      </Button>
      {templates.length === 0 ? (
        <Empty description={t('admin.system.noSystemFields')} />
      ) : (
        templates.map((tmpl) => {
          const platformTemplate = tmpl.templateScope === 'platform';
          const readOnly = platformTemplate && !isPlatformContext;
          return (
            <Card
              key={tmpl.id}
              size="small"
              title={
                <Space>
                  {templateDisplayName(t, tmpl.name)}
                  {platformTemplate && <Tag>{t('admin.system.platformTemplate')}</Tag>}
                  {tmpl.isDefault && <Tag color="blue">{t('common.default')}</Tag>}
                </Space>
              }
              extra={
                <Space wrap>
                  {!readOnly && !tmpl.isDefault && (
                    <Popconfirm
                      title={t('admin.system.setDefaultConfirm')}
                      onConfirm={() => setDefaultMutation.mutate(tmpl.id)}
                    >
                      <Button icon={<StarOutlined />} size="small">
                        {t('admin.system.setDefault')}
                      </Button>
                    </Popconfirm>
                  )}
                  {tmpl.isDefault && (
                    <Button icon={<StarFilled />} size="small" disabled>
                      {t('common.default')}
                    </Button>
                  )}
                  {!readOnly && (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => {
                          setEditingTemplate(tmpl);
                          setEditorOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Popconfirm
                        title={t('admin.system.deleteConfirm')}
                        onConfirm={() => deleteMutation.mutate(tmpl.id)}
                      >
                        <Button icon={<DeleteOutlined />} size="small" danger>
                          {t('common.delete')}
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                </Space>
              }
            >
              <Typography.Text type="secondary">
                {t('settings.fieldsCount', { count: tmpl.items?.length ?? 0 })}
              </Typography.Text>
            </Card>
          );
        })
      )}
      <FieldTemplateEditorModal
        open={editorOpen}
        title={t('templateEditor.systemField')}
        initialData={
          editingTemplate ? { name: editingTemplate.name, items: editingTemplate.items } : null
        }
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </Space>
  );
}

// ─── System Prompt Templates Tab ──────────────────────────────────────────────

function SystemPromptTemplatesTab({ type }: { type: PromptTemplateType }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const isPlatformContext =
    useAuthStore((s) => s.user?.role) === 'super_admin' && !selectedOrganizationId;
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-prompt-templates', type, selectedOrganizationId],
    queryFn: () => adminListPromptTemplates(type).then((r) => r.data),
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      adminCreatePromptTemplate(name, content, type).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates', type] });
      setEditorOpen(false);
      message.success(t('admin.system.templateCreated'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('admin.system.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, content }: { id: string; name: string; content: string }) =>
      adminUpdatePromptTemplate(id, name, content).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates', type] });
      setEditorOpen(false);
      message.success(t('admin.system.templateSaved'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('admin.system.saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeletePromptTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates', type] });
      message.success(t('admin.system.templateDeleted'));
    },
    onError: () => message.error(t('admin.system.deleteFailed')),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => adminSetDefaultPromptTemplate(id, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates', type] });
      message.success(t('admin.system.defaultUpdated'));
    },
    onError: () => message.error(t('admin.system.failed')),
  });

  const handleSave = (name: string, content: string) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, name, content });
    } else {
      createMutation.mutate({ name, content });
    }
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditingTemplate(null);
          setEditorOpen(true);
        }}
      >
        {t('admin.system.createNewSystem')}
      </Button>
      {templates.length === 0 ? (
        <Empty description={t('admin.system.noSystemPrompts')} />
      ) : (
        templates.map((tmpl) => {
          const platformTemplate = tmpl.templateScope === 'platform';
          const readOnly = platformTemplate && !isPlatformContext;
          return (
            <Card
              key={tmpl.id}
              size="small"
              title={
                <Space>
                  {templateDisplayName(t, tmpl.name)}
                  {platformTemplate && <Tag>{t('admin.system.platformTemplate')}</Tag>}
                  {tmpl.isDefault && <Tag color="blue">{t('common.default')}</Tag>}
                </Space>
              }
              extra={
                <Space wrap>
                  {!readOnly && !tmpl.isDefault && (
                    <Popconfirm
                      title={t('admin.system.setDefaultConfirm')}
                      onConfirm={() => setDefaultMutation.mutate(tmpl.id)}
                    >
                      <Button icon={<StarOutlined />} size="small">
                        {t('admin.system.setDefault')}
                      </Button>
                    </Popconfirm>
                  )}
                  {tmpl.isDefault && (
                    <Button icon={<StarFilled />} size="small" disabled>
                      {t('common.default')}
                    </Button>
                  )}
                  {!readOnly && (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => {
                          setEditingTemplate(tmpl);
                          setEditorOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Popconfirm
                        title={t('admin.system.deleteConfirm')}
                        onConfirm={() => deleteMutation.mutate(tmpl.id)}
                      >
                        <Button icon={<DeleteOutlined />} size="small" danger>
                          {t('common.delete')}
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                </Space>
              }
            >
              <Typography.Text
                type="secondary"
                ellipsis
                style={{ display: 'block', maxWidth: 500 }}
              >
                {tmpl.content.substring(0, 120)}
                {tmpl.content.length > 120 ? '…' : ''}
              </Typography.Text>
            </Card>
          );
        })
      )}
      <PromptEditorModal
        open={editorOpen}
        title={t('templateEditor.systemPrompt')}
        initialData={
          editingTemplate ? { name: editingTemplate.name, content: editingTemplate.content } : null
        }
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </Space>
  );
}

// ─── Pending Requests Tab ─────────────────────────────────────────────────────

function PendingRequestsTab() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-template-requests', selectedOrganizationId],
    queryFn: getAdminRequests,
    refetchInterval: 30_000,
  });

  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({
    open: false,
    id: '',
    name: '',
  });
  const [rejectNote, setRejectNote] = useState('');
  const [viewingReq, setViewingReq] = useState<(typeof requests)[0] | null>(null);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-template-requests'] });
      message.success(t('admin.system.requests.approved'));
    },
    onError: () => message.error(t('admin.system.requests.approveFailed')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      rejectRequest(id, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-template-requests'] });
      setRejectModal({ open: false, id: '', name: '' });
      setRejectNote('');
      message.success(t('admin.system.requests.declined'));
    },
    onError: () => message.error(t('admin.system.requests.rejectFailed')),
  });

  if (isLoading) return <Spin />;

  if (requests.length === 0) {
    return <Empty description={t('admin.system.requests.empty')} />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {requests.map((req) => {
        const isField = req.templateKind === 'field';
        const tmplName = isField ? req.fieldTemplate?.name : req.promptTemplate?.name;
        const displayName = tmplName ? templateDisplayName(t, tmplName) : '';
        const userName = req.user?.name || req.user?.email || t('common.unknown');

        return (
          <Card
            key={req.id}
            size="small"
            title={
              <Space>
                <Tag color={isField ? 'blue' : 'purple'}>
                  {isField
                    ? t('admin.system.requests.fieldTemplate')
                    : t('admin.system.requests.promptTemplate')}
                </Tag>
                {!isField && req.promptTemplate?.templateType && (
                  <Tag>
                    {req.promptTemplate.templateType === 'contract_comparison'
                      ? t('settings.comparisonPrompts')
                      : t('settings.riskAnalysisPrompts')}
                  </Tag>
                )}
                <span>{displayName}</span>
              </Space>
            }
            extra={
              <Space wrap>
                <Button icon={<EyeOutlined />} size="small" onClick={() => setViewingReq(req)}>
                  {t('common.view')}
                </Button>
                <Popconfirm
                  title={t('admin.system.requests.approveConfirm', {
                    name: displayName,
                  })}
                  onConfirm={() => approveMutation.mutate(req.id)}
                  okText={t('admin.system.requests.approve')}
                >
                  <Button icon={<CheckCircleOutlined />} size="small" type="primary">
                    {t('admin.system.requests.approve')}
                  </Button>
                </Popconfirm>
                <Button
                  icon={<CloseCircleOutlined />}
                  size="small"
                  danger
                  onClick={() => {
                    setRejectModal({
                      open: true,
                      id: req.id,
                      name: displayName,
                    });
                    setRejectNote('');
                  }}
                >
                  {t('admin.system.requests.decline')}
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">
                {t('admin.system.requests.requestedBy')}
                <strong>{userName}</strong> ({req.user?.email})
              </Typography.Text>
              <Typography.Text type="secondary">
                {t('admin.system.requests.submitted', {
                  date: formatDateTime(req.createdAt, i18n.language),
                })}
              </Typography.Text>
              {isField && req.fieldTemplate?.items && (
                <Typography.Text type="secondary">
                  {t('admin.system.requests.fields', {
                    fields: req.fieldTemplate.items.map((i) => i.fieldName).join(', '),
                  })}
                </Typography.Text>
              )}
              {!isField && req.promptTemplate?.content && (
                <Typography.Text
                  type="secondary"
                  ellipsis
                  style={{ display: 'block', maxWidth: 600 }}
                >
                  {req.promptTemplate.content.substring(0, 200)}
                  {req.promptTemplate.content.length > 200 ? '…' : ''}
                </Typography.Text>
              )}
            </Space>
          </Card>
        );
      })}

      <Modal
        open={!!viewingReq}
        title={
          <Space>
            <Tag color={viewingReq?.templateKind === 'field' ? 'blue' : 'purple'}>
              {viewingReq?.templateKind === 'field'
                ? t('admin.system.requests.fieldTemplate')
                : t('admin.system.requests.promptTemplate')}
            </Tag>
            {templateDisplayName(
              t,
              viewingReq?.templateKind === 'field'
                ? (viewingReq?.fieldTemplate?.name ?? '')
                : (viewingReq?.promptTemplate?.name ?? ''),
            )}
          </Space>
        }
        onCancel={() => setViewingReq(null)}
        footer={<Button onClick={() => setViewingReq(null)}>{t('common.close')}</Button>}
        width={700}
      >
        {viewingReq && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space>
              <Typography.Text type="secondary">
                {t('admin.system.requests.requestedByLabel')}
              </Typography.Text>
              <Typography.Text strong>
                {viewingReq.user?.name || viewingReq.user?.email}
              </Typography.Text>
              <Typography.Text type="secondary">({viewingReq.user?.email})</Typography.Text>
            </Space>
            <Space>
              <Typography.Text type="secondary">
                {t('admin.system.requests.submittedLabel')}
              </Typography.Text>
              <Typography.Text>
                {formatDateTime(viewingReq.createdAt, i18n.language)}
              </Typography.Text>
            </Space>
            {viewingReq.templateKind === 'field' && viewingReq.fieldTemplate?.items && (
              <Table
                size="small"
                pagination={false}
                scroll={{ x: 'max-content' }}
                dataSource={viewingReq.fieldTemplate.items}
                rowKey={(_, i) => String(i)}
                columns={[
                  {
                    title: t('admin.system.requests.fieldName'),
                    dataIndex: 'fieldName',
                    key: 'fieldName',
                    width: 200,
                  },
                  {
                    title: t('admin.system.requests.description'),
                    dataIndex: 'fieldDescription',
                    key: 'fieldDescription',
                  },
                ]}
              />
            )}
            {viewingReq.templateKind === 'prompt' && viewingReq.promptTemplate?.content && (
              <Input.TextArea
                readOnly
                rows={14}
                value={viewingReq.promptTemplate.content}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            )}
          </Space>
        )}
      </Modal>

      <Modal
        open={rejectModal.open}
        title={t('admin.system.requests.declineTitle', {
          name: rejectModal.name,
        })}
        onCancel={() => setRejectModal({ open: false, id: '', name: '' })}
        onOk={() => rejectMutation.mutate({ id: rejectModal.id, note: rejectNote })}
        okText={t('admin.system.requests.decline')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        confirmLoading={rejectMutation.isPending}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>{t('admin.system.requests.declineNotePrompt')}</Typography.Text>
          <Input.TextArea
            rows={3}
            placeholder={t('admin.system.requests.declinePlaceholder')}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </Space>
      </Modal>
    </Space>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const qc = useQueryClient();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const [expiry, setExpiry] = useState<ExpiryOption>('1m');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);

  const expiryOptions: { value: ExpiryOption; label: string }[] = [
    { value: '1m', label: t('admin.system.apiKey.expiry1m') },
    { value: '3m', label: t('admin.system.apiKey.expiry3m') },
    { value: '6m', label: t('admin.system.apiKey.expiry6m') },
    { value: '1y', label: t('admin.system.apiKey.expiry1y') },
    { value: 'never', label: t('admin.system.apiKey.expiryNever') },
  ];

  const { data: keyInfo, isLoading } = useQuery<ApiKeyInfo | null>({
    queryKey: ['admin-api-key', selectedOrganizationId],
    queryFn: () => getApiKey().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => createApiKey(expiry).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-api-key'] });
      setNewKey(data.rawKey);
      setKeyVisible(true);
      message.success(t('admin.system.apiKey.keyCreated'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('admin.system.apiKey.createFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-api-key'] });
      setNewKey(null);
      message.success(t('admin.system.apiKey.keyDeleted'));
    },
    onError: () => message.error(t('admin.system.apiKey.deleteFailed')),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success(t('common.copied')));
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return <Tag color="purple">{t('admin.system.apiKey.neverExpires')}</Tag>;
    const d = new Date(expiresAt);
    const now = new Date();
    if (d < now) return <Tag color="red">{t('admin.system.apiKey.expired')}</Tag>;
    return <Tag color="green">{formatDate(d, i18n.language)}</Tag>;
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Text type="secondary">
        <Trans i18nKey="admin.system.apiKey.intro" components={{ 1: <code /> }} />
      </Typography.Text>

      {newKey && (
        <Alert
          type="success"
          showIcon
          message={t('admin.system.apiKey.createdCopyNow')}
          description={
            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
              <Typography.Text type="secondary">
                {t('admin.system.apiKey.shownOnce')}
              </Typography.Text>
              <Input.Password
                value={newKey}
                visibilityToggle={{
                  visible: keyVisible,
                  onVisibleChange: setKeyVisible,
                }}
                readOnly
                addonAfter={
                  <Tooltip title={t('common.copy')}>
                    <CopyOutlined
                      style={{ cursor: 'pointer' }}
                      onClick={() => copyToClipboard(newKey)}
                    />
                  </Tooltip>
                }
                style={{ fontFamily: 'monospace' }}
              />
            </Space>
          }
          closable
          onClose={() => setNewKey(null)}
        />
      )}

      {keyInfo ? (
        <Card
          title={
            <Space>
              <KeyOutlined />
              <span>{t('admin.system.apiKey.active')}</span>
            </Space>
          }
          extra={
            <Popconfirm
              title={t('admin.system.apiKey.deleteConfirm')}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(keyInfo.id)}
            >
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                loading={deleteMutation.isPending}
              >
                {t('common.delete')}
              </Button>
            </Popconfirm>
          }
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space>
              <Typography.Text type="secondary">
                {t('admin.system.apiKey.keyPrefix')}
              </Typography.Text>
              <Typography.Text code>{keyInfo.keyPrefix}…</Typography.Text>
              <Typography.Text type="secondary">
                {t('admin.system.apiKey.fullKeyOnce')}
              </Typography.Text>
            </Space>
            <Space>
              <Typography.Text type="secondary">{t('admin.system.apiKey.expires')}</Typography.Text>
              {formatExpiry(keyInfo.expiresAt)}
            </Space>
            <Space>
              <Typography.Text type="secondary">{t('admin.system.apiKey.created')}</Typography.Text>
              <Typography.Text>{formatDateTime(keyInfo.createdAt, i18n.language)}</Typography.Text>
            </Space>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {t('admin.system.apiKey.usageExample')}
            </Typography.Text>
            <Typography.Text
              code
              style={{
                display: 'block',
                background: token.colorFillTertiary,
                padding: '8px 12px',
                borderRadius: 4,
                overflowX: 'auto',
              }}
            >
              {`curl -X POST /v1/analysis/run \\
  -H "X-API-Key: <your-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"documentId":"...","model":"..."}'`}
            </Typography.Text>
          </Space>
        </Card>
      ) : (
        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Empty description={t('admin.system.apiKey.noKey')} />
            <Space wrap>
              <Select
                value={expiry}
                onChange={setExpiry}
                options={expiryOptions}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
              >
                {t('admin.system.apiKey.createKey')}
              </Button>
            </Space>
          </Space>
        </Card>
      )}
    </Space>
  );
}

// ─── Models Tab ───────────────────────────────────────────────────────────────

function ModelsTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const [drafts, setDrafts] = useState<Record<string, ModelDraft>>({});
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [draggedModelName, setDraggedModelName] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null | 'new'>(null);
  const [modelForm] = Form.useForm<CustomModelFormValues>();
  const activeDragModelRef = useRef<string | null>(null);
  const dragStartOrderRef = useRef<string[]>([]);
  const dragCurrentOrderRef = useRef<string[]>([]);

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['admin-models', selectedOrganizationId],
    queryFn: () => getAdminModels().then((r) => r.data),
  });
  const { data: configurationStatus } = useQuery({
    queryKey: ['admin-model-configuration-status', selectedOrganizationId],
    queryFn: () => getModelConfigurationStatus().then((response) => response.data),
  });
  const customModelsEnabled = configurationStatus?.customModelsEnabled === true;

  useEffect(() => {
    if (activeDragModelRef.current) return;
    const modelNames = models.map((model) => model.name);
    setLocalOrder(modelNames);
    dragCurrentOrderRef.current = modelNames;
  }, [models]);

  const orderedModels = useMemo(() => {
    if (localOrder.length === 0) return models;
    const modelsByName = new Map(models.map((model) => [model.name, model]));
    return [
      ...localOrder.flatMap((modelName) => {
        const model = modelsByName.get(modelName);
        return model ? [model] : [];
      }),
      ...models.filter((model) => !localOrder.includes(model.name)),
    ];
  }, [localOrder, models]);

  const saveMutation = useMutation({
    mutationFn: ({ modelName, data }: { modelName: string; data: ModelDraft }) =>
      updateAdminModel(modelName, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-models'] });
      qc.invalidateQueries({ queryKey: ['models'] });
      setDrafts((current) => {
        const next = { ...current };
        delete next[variables.modelName];
        return next;
      });
      message.success(t('admin.system.models.saved'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('admin.system.models.saveFailed')),
  });

  const reorderMutation = useMutation({
    mutationFn: (modelNames: string[]) =>
      reorderAdminModels(
        modelNames.map((modelName, index) => ({ modelName, sortOrder: (index + 1) * 10 })),
      ).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['admin-models'], data);
      qc.invalidateQueries({ queryKey: ['models'] });
      message.success(t('admin.system.models.orderSaved'));
    },
    onError: (e: ApiError) => {
      setLocalOrder(models.map((model) => model.name));
      message.error(e.response?.data?.message || t('admin.system.models.orderFailed'));
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (modelName: string) =>
      updateAdminModel(modelName, { isDefault: true, enabled: true }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-models'] });
      qc.invalidateQueries({ queryKey: ['models'] });
      message.success(t('admin.system.models.defaultUpdated'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('admin.system.models.saveFailed')),
  });

  const customModelMutation = useMutation({
    mutationFn: (values: CustomModelFormValues) => {
      if (editingModel && editingModel !== 'new') {
        const { apiKey } = values;
        return updateAdminModel(editingModel.name, {
          label: values.label,
          endpoint: values.endpoint,
          upstreamModelName: values.upstreamModelName,
          apiProtocol: values.apiProtocol,
          supportsReasoning: values.supportsReasoning,
          enabled: values.enabled,
          apiKey: apiKey?.trim() || undefined,
        }).then((response) => response.data);
      }
      return createAdminModel({ ...values, apiKey: values.apiKey.trim() }).then(
        (response) => response.data,
      );
    },
    onSuccess: (_data, values) => {
      setEditingModel(null);
      modelForm.resetFields();
      setDrafts((current) => {
        const next = { ...current };
        delete next[values.name];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['admin-models'] });
      qc.invalidateQueries({ queryKey: ['models'] });
      message.success(t('admin.system.models.saved'));
    },
    onError: (error: ApiError) =>
      message.error(error.response?.data?.message || t('admin.system.models.saveFailed')),
  });

  const testConnectionMutation = useMutation({
    mutationFn: (values: CustomModelFormValues) =>
      testModelConnection({
        ...values,
        name: editingModel && editingModel !== 'new' ? editingModel.name : values.name,
        apiKey: values.apiKey?.trim() || undefined,
      }).then((response) => response.data),
    onSuccess: (result) =>
      message.success(t('admin.system.models.testSucceeded', { latency: result.latencyMs })),
    onError: (error: ApiError) =>
      message.error(error.response?.data?.message || t('admin.system.models.testFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (modelName: string) => deleteAdminModel(modelName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-models'] });
      qc.invalidateQueries({ queryKey: ['models'] });
      message.success(t('admin.system.models.deleted'));
    },
    onError: (error: ApiError) =>
      message.error(error.response?.data?.message || t('admin.system.models.deleteFailed')),
  });

  const openCreateModel = () => {
    modelForm.setFieldsValue({
      name: '',
      label: '',
      endpoint: '',
      upstreamModelName: '',
      apiProtocol: 'chat_completions',
      apiKey: '',
      supportsReasoning: false,
      enabled: true,
    });
    setEditingModel('new');
  };

  const openEditModel = (model: Model) => {
    modelForm.setFieldsValue({
      name: model.name,
      label: model.label,
      endpoint: model.endpoint ?? '',
      upstreamModelName: model.upstreamModelName ?? '',
      apiProtocol: model.apiProtocol ?? 'chat_completions',
      apiKey: '',
      supportsReasoning: model.supportsReasoning ?? false,
      enabled: model.enabled ?? true,
    });
    setEditingModel(model);
  };

  const testCurrentConnection = async () => {
    try {
      const values = await modelForm.validateFields();
      testConnectionMutation.mutate(values);
    } catch {
      // Ant Design displays field-level validation errors.
    }
  };

  const patchDraft = (modelName: string, patch: ModelDraft) => {
    setDrafts((current) => ({
      ...current,
      [modelName]: { ...current[modelName], ...patch },
    }));
  };

  const valueFor = <K extends keyof ModelDraft>(record: Model, key: K) =>
    drafts[record.name]?.[key] ?? record[key];

  const beginDrag = useCallback(
    (modelName: string) => {
      const currentOrder = localOrder.length ? localOrder : models.map((model) => model.name);
      activeDragModelRef.current = modelName;
      dragStartOrderRef.current = currentOrder;
      dragCurrentOrderRef.current = currentOrder;
      setDraggedModelName(modelName);
    },
    [localOrder, models],
  );

  const previewMoveModel = useCallback(
    (targetModelName: string) => {
      const draggedModel = activeDragModelRef.current;
      if (!draggedModel || draggedModel === targetModelName) return;

      setLocalOrder((current) => {
        const currentOrder = current.length ? current : models.map((model) => model.name);
        const fromIndex = currentOrder.indexOf(draggedModel);
        const toIndex = currentOrder.indexOf(targetModelName);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;

        const nextOrder = [...currentOrder];
        const [moved] = nextOrder.splice(fromIndex, 1);
        nextOrder.splice(toIndex, 0, moved);
        dragCurrentOrderRef.current = nextOrder;
        return nextOrder;
      });
    },
    [models],
  );

  const finishDrag = useCallback(() => {
    if (!activeDragModelRef.current) return;
    const nextOrder = dragCurrentOrderRef.current.length
      ? dragCurrentOrderRef.current
      : models.map((model) => model.name);
    const originalOrder = dragStartOrderRef.current;
    const orderChanged =
      nextOrder.length !== originalOrder.length ||
      nextOrder.some((modelName, index) => modelName !== originalOrder[index]);

    activeDragModelRef.current = null;
    dragStartOrderRef.current = [];
    dragCurrentOrderRef.current = [];
    setDraggedModelName(null);

    if (orderChanged) {
      reorderMutation.mutate(nextOrder);
    }
  }, [models, reorderMutation]);

  useEffect(() => {
    if (!draggedModelName) return;

    const handleMouseMove = (event: MouseEvent) => {
      const row = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('tr[data-row-key]');
      const targetModelName = row?.getAttribute('data-row-key');
      if (targetModelName) previewMoveModel(targetModelName);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishDrag);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishDrag);
    };
  }, [draggedModelName, finishDrag, previewMoveModel]);

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert type="info" showIcon message={t('admin.system.models.intro')} />
      {configurationStatus && !customModelsEnabled && (
        <Alert type="warning" showIcon message={t('admin.system.models.encryptionMissing')} />
      )}
      <div>
        <Tooltip
          title={customModelsEnabled ? undefined : t('admin.system.models.encryptionMissing')}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!customModelsEnabled}
            onClick={openCreateModel}
          >
            {t('admin.system.models.add')}
          </Button>
        </Tooltip>
      </div>
      <Table
        size="small"
        rowKey="name"
        dataSource={orderedModels}
        pagination={false}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          style: {
            opacity: record.name === draggedModelName ? 0.48 : 1,
            transition: 'opacity 120ms ease',
          },
          onDragOver: (event) => {
            event.preventDefault();
            previewMoveModel(record.name);
          },
          onDragEnter: () => previewMoveModel(record.name),
          onDrop: (event) => {
            event.preventDefault();
            finishDrag();
          },
        })}
        columns={[
          {
            title: '',
            key: 'drag',
            width: 48,
            render: (_: unknown, record: Model) => (
              <Tooltip title={t('admin.system.models.dragToReorder')}>
                <Button
                  type="text"
                  size="small"
                  icon={<HolderOutlined />}
                  draggable
                  style={{ cursor: 'grab' }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    beginDrag(record.name);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', record.name);
                    const row = event.currentTarget.closest('tr');
                    if (row) {
                      const { height } = row.getBoundingClientRect();
                      event.dataTransfer.setDragImage(row, 24, height / 2);
                    }
                    beginDrag(record.name);
                  }}
                  onDragEnd={finishDrag}
                />
              </Tooltip>
            ),
          },
          {
            title: t('admin.system.models.model'),
            dataIndex: 'name',
            key: 'name',
            width: 220,
            render: (_: string, record: Model) => (
              <Space direction="vertical" size={0}>
                <Space>
                  <ModelProviderIcon modelName={modelIconName(record)} />
                  <Typography.Text strong>{record.name}</Typography.Text>
                  {record.isDefault && <Tag color="blue">{t('common.default')}</Tag>}
                </Space>
                <Space size={4}>
                  <Tag>{record.provider}</Tag>
                  <Tag color={record.source === 'custom' ? 'purple' : 'default'}>
                    {t(`admin.system.models.source.${record.source ?? 'environment'}`)}
                  </Tag>
                  {record.supportsReasoning && (
                    <Tag color="green">{t('admin.system.models.reasoning')}</Tag>
                  )}
                  {record.source === 'custom' && record.credentialStatus !== 'ready' && (
                    <Tag color="red">
                      {record.credentialStatus === 'decrypt_failed'
                        ? t('admin.system.models.credentials.decrypt_failed')
                        : t('admin.system.models.credentials.master_key_missing')}
                    </Tag>
                  )}
                </Space>
              </Space>
            ),
          },
          {
            title: t('admin.system.models.displayName'),
            key: 'label',
            width: 220,
            render: (_: unknown, record: Model) => (
              <Input
                value={valueFor(record, 'label')}
                onChange={(e) => patchDraft(record.name, { label: e.target.value })}
              />
            ),
          },
          {
            title: t('admin.system.models.enabled'),
            key: 'enabled',
            width: 100,
            render: (_: unknown, record: Model) => (
              <Switch
                checked={valueFor(record, 'enabled') !== false}
                disabled={record.isDefault}
                onChange={(enabled) => patchDraft(record.name, { enabled })}
              />
            ),
          },
          {
            title: t('admin.system.models.defaultEffort'),
            key: 'defaultReasoningEffort',
            width: 180,
            render: (_: unknown, record: Model) => (
              <Select
                style={{ width: 150 }}
                value={valueFor(record, 'defaultReasoningEffort')}
                disabled={record.supportsReasoning === false}
                options={(record.reasoningEfforts ?? []).map((effort) => ({
                  value: effort,
                  label: t(`effort.${effort}`),
                }))}
                onChange={(defaultReasoningEffort: ReasoningEffort) =>
                  patchDraft(record.name, { defaultReasoningEffort })
                }
              />
            ),
          },
          {
            title: t('admin.system.models.actions'),
            key: 'actions',
            width: 380,
            render: (_: unknown, record: Model) => (
              <Space>
                <Button
                  icon={<SaveOutlined />}
                  size="small"
                  type={drafts[record.name] ? 'primary' : 'default'}
                  disabled={!drafts[record.name]}
                  loading={saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      modelName: record.name,
                      data: drafts[record.name],
                    })
                  }
                >
                  {t('common.save')}
                </Button>
                <Button
                  size="small"
                  disabled={
                    record.isDefault ||
                    (record.source === 'custom' && record.credentialStatus !== 'ready')
                  }
                  loading={defaultMutation.isPending}
                  onClick={() => defaultMutation.mutate(record.name)}
                >
                  {t('admin.system.models.setDefault')}
                </Button>
                {record.source === 'custom' && (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    disabled={!customModelsEnabled}
                    onClick={() => openEditModel(record)}
                  >
                    {t('common.edit')}
                  </Button>
                )}
                {record.source === 'custom' && (
                  <Popconfirm
                    title={t('admin.system.models.deleteConfirm')}
                    onConfirm={() => deleteMutation.mutate(record.name)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      {t('common.delete')}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={editingModel !== null}
        title={
          editingModel === 'new'
            ? t('admin.system.models.addTitle')
            : t('admin.system.models.editTitle')
        }
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={customModelMutation.isPending}
        onOk={() => modelForm.submit()}
        onCancel={() => {
          setEditingModel(null);
          modelForm.resetFields();
        }}
        destroyOnClose
      >
        <Form
          form={modelForm}
          layout="vertical"
          onFinish={(values) => customModelMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label={t('admin.system.models.modelId')}
            extra={t('admin.system.models.modelIdHint')}
            rules={[
              { required: true },
              {
                pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/,
                message: t('admin.system.models.modelIdInvalid'),
              },
            ]}
          >
            <Input disabled={editingModel !== 'new'} />
          </Form.Item>
          <Form.Item
            name="label"
            label={t('admin.system.models.displayName')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="endpoint"
            label={t('admin.system.models.endpoint')}
            extra={t('admin.system.models.endpointHint')}
            rules={[{ required: true }, { type: 'url' }]}
          >
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>
          <Form.Item
            name="upstreamModelName"
            label={t('admin.system.models.upstreamModel')}
            rules={[{ required: true }]}
          >
            <Input placeholder="gpt-4.1-mini" />
          </Form.Item>
          <Form.Item
            name="apiProtocol"
            label={t('admin.system.models.protocol')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'chat_completions', label: 'Chat Completions' },
                { value: 'responses', label: 'Responses' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label={t('admin.system.models.apiKey')}
            extra={editingModel === 'new' ? undefined : t('admin.system.models.apiKeyKeepHint')}
            rules={[{ required: editingModel === 'new' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Space size="large">
            <Form.Item
              name="supportsReasoning"
              valuePropName="checked"
              label={t('admin.system.models.supportsReasoning')}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="enabled"
              valuePropName="checked"
              label={t('admin.system.models.enabled')}
            >
              <Switch />
            </Form.Item>
          </Space>
          <Button
            onClick={testCurrentConnection}
            loading={testConnectionMutation.isPending}
            disabled={!customModelsEnabled}
          >
            {t('admin.system.models.testConnection')}
          </Button>
        </Form>
      </Modal>
    </Space>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSystemSettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrganizationId = useAuthStore((s) => s.selectedOrganizationId);
  const isSuperAdmin = useAuthStore((s) => s.user?.role) === 'super_admin';
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['admin-template-requests', selectedOrganizationId],
    queryFn: getAdminRequests,
    refetchInterval: 30_000,
  });
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'authentication'
      ? 'admin-authentication'
      : tabParam === 'prompts'
        ? 'admin-prompt'
        : tabParam === 'requests'
          ? 'admin-requests'
          : tabParam === 'api-keys'
            ? 'admin-api-keys'
            : tabParam === 'models'
              ? 'admin-models'
              : 'admin-fields';
  const tabParams: Record<string, string> = {
    'admin-fields': 'fields',
    'admin-prompt': 'prompts',
    'admin-requests': 'requests',
    'admin-api-keys': 'api-keys',
    'admin-models': 'models',
    'admin-authentication': 'authentication',
  };

  const tabItems = [
    {
      key: 'admin-authentication',
      label: t('admin.system.authentication.title'),
      children: <AuthenticationSettingsTab canEdit={isSuperAdmin && !selectedOrganizationId} />,
    },
    {
      key: 'admin-fields',
      label: t('admin.system.systemFieldTemplates'),
      children: <SystemFieldTemplatesTab />,
    },
    {
      key: 'admin-prompt',
      label: t('admin.system.systemPromptTemplates'),
      children: (
        <Tabs
          items={[
            {
              key: 'risk_analysis',
              label: t('settings.riskAnalysisPrompts'),
              children: <SystemPromptTemplatesTab type="risk_analysis" />,
            },
            {
              key: 'contract_comparison',
              label: t('settings.comparisonPrompts'),
              children: <SystemPromptTemplatesTab type="contract_comparison" />,
            },
          ]}
        />
      ),
    },
    {
      key: 'admin-requests',
      label: (
        <Space>
          {t('admin.system.pendingRequests')}
          {pendingRequests.length > 0 && (
            <Tag color="red" style={{ margin: 0 }}>
              {pendingRequests.length}
            </Tag>
          )}
        </Space>
      ),
      children: <PendingRequestsTab />,
    },
    {
      key: 'admin-models',
      label: t('admin.system.models.title'),
      children: <ModelsTab />,
    },
    {
      key: 'admin-api-keys',
      label: (
        <Space>
          <KeyOutlined />
          {t('admin.system.apiKeys')}
        </Space>
      ),
      children: <ApiKeysTab />,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{t('admin.system.title')}</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        <Trans i18nKey="admin.system.subtitle" components={{ 1: <strong /> }} />
      </Typography.Text>
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={(key) => setSearchParams({ tab: tabParams[key] ?? 'fields' })}
      />
    </div>
  );
}
