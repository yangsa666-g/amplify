import React, { useState } from 'react';
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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { FieldTemplate, FieldTemplateItem, PromptTemplate, ApiError } from '../types';
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
import type { ExpiryOption, ApiKeyInfo } from '../api/apiKeys';
import { getApiKey, createApiKey, deleteApiKey } from '../api/apiKeys';
import { message } from '../utils/message';
import { formatDate, formatDateTime } from '../utils/format';
import { templateDisplayName } from '../utils/templateLabels';

// ─── System Field Templates Tab ───────────────────────────────────────────────

function SystemFieldTemplatesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-field-templates'],
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
        templates.map((tmpl) => (
          <Card
            key={tmpl.id}
            size="small"
            title={
              <Space>
                {templateDisplayName(t, tmpl.name)}
                {tmpl.isDefault && <Tag color="blue">{t('common.default')}</Tag>}
              </Space>
            }
            extra={
              <Space wrap>
                {!tmpl.isDefault && (
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
              </Space>
            }
          >
            <Typography.Text type="secondary">
              {t('settings.fieldsCount', { count: tmpl.items?.length ?? 0 })}
            </Typography.Text>
          </Card>
        ))
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

function SystemPromptTemplatesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-prompt-templates'],
    queryFn: () => adminListPromptTemplates().then((r) => r.data),
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      adminCreatePromptTemplate(name, content).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] });
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
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] });
      setEditorOpen(false);
      message.success(t('admin.system.templateSaved'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('admin.system.saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeletePromptTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] });
      message.success(t('admin.system.templateDeleted'));
    },
    onError: () => message.error(t('admin.system.deleteFailed')),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => adminSetDefaultPromptTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] });
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
        templates.map((tmpl) => (
          <Card
            key={tmpl.id}
            size="small"
            title={
              <Space>
                {templateDisplayName(t, tmpl.name)}
                {tmpl.isDefault && <Tag color="blue">{t('common.default')}</Tag>}
              </Space>
            }
            extra={
              <Space wrap>
                {!tmpl.isDefault && (
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
              </Space>
            }
          >
            <Typography.Text type="secondary" ellipsis style={{ display: 'block', maxWidth: 500 }}>
              {tmpl.content.substring(0, 120)}
              {tmpl.content.length > 120 ? '…' : ''}
            </Typography.Text>
          </Card>
        ))
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
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-template-requests'],
    queryFn: getAdminRequests,
    refetchInterval: 30_000,
  });

  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; name: string }>({
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
                <span>{displayName}</span>
              </Space>
            }
            extra={
              <Space wrap>
                <Button icon={<EyeOutlined />} size="small" onClick={() => setViewingReq(req)}>
                  {t('common.view')}
                </Button>
                <Popconfirm
                  title={t('admin.system.requests.approveConfirm', { name: displayName })}
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
                    setRejectModal({ open: true, id: req.id, name: displayName });
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
        title={t('admin.system.requests.declineTitle', { name: rejectModal.name })}
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
    queryKey: ['admin-api-key'],
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
                visibilityToggle={{ visible: keyVisible, onVisibleChange: setKeyVisible }}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSystemSettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['admin-template-requests'],
    queryFn: getAdminRequests,
    refetchInterval: 30_000,
  });
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'prompts'
      ? 'admin-prompt'
      : tabParam === 'requests'
        ? 'admin-requests'
        : tabParam === 'api-keys'
          ? 'admin-api-keys'
          : 'admin-fields';
  const tabParams: Record<string, string> = {
    'admin-fields': 'fields',
    'admin-prompt': 'prompts',
    'admin-requests': 'requests',
    'admin-api-keys': 'api-keys',
  };

  const tabItems = [
    {
      key: 'admin-fields',
      label: t('admin.system.systemFieldTemplates'),
      children: <SystemFieldTemplatesTab />,
    },
    {
      key: 'admin-prompt',
      label: t('admin.system.systemPromptTemplates'),
      children: <SystemPromptTemplatesTab />,
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
