import React, { useState } from 'react';
import {
  Typography, Tabs, Button, Card, Space, Tag, Popconfirm, Modal, Input, Table, message, Spin, Empty,
  Select, Alert, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, StarFilled,
  CheckCircleOutlined, CloseCircleOutlined, KeyOutlined, CopyOutlined, EyeOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FieldTemplate, FieldTemplateItem, PromptTemplate } from '../types';
import {
  adminListFieldTemplates, adminCreateFieldTemplate, adminUpdateFieldTemplate,
  adminDeleteFieldTemplate, adminSetDefaultFieldTemplate,
} from '../api/fieldTemplates';
import {
  adminListPromptTemplates, adminCreatePromptTemplate, adminUpdatePromptTemplate,
  adminDeletePromptTemplate, adminSetDefaultPromptTemplate,
} from '../api/promptTemplates';
import { getAdminRequests, approveRequest, rejectRequest } from '../api/templateRequests';
import { getApiKey, createApiKey, deleteApiKey, ExpiryOption, ApiKeyInfo } from '../api/apiKeys';

// ─── Field Template Editor Modal ─────────────────────────────────────────────

function FieldTemplateEditorModal({
  open, initialData, onSave, onCancel, saving,
}: {
  open: boolean;
  initialData: { name: string; items: FieldTemplateItem[] } | null;
  onSave: (name: string, items: FieldTemplateItem[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = React.useState('');
  const [items, setItems] = React.useState<FieldTemplateItem[]>([]);

  React.useEffect(() => {
    if (open && initialData) { setName(initialData.name); setItems(initialData.items.map((it) => ({ ...it }))); }
    else if (open) { setName(''); setItems([]); }
  }, [open, initialData]);

  const columns = [
    {
      title: 'Field Name', key: 'name', width: 180,
      render: (_: any, _r: FieldTemplateItem, i: number) => (
        <Input value={items[i]?.fieldName} onChange={(e) => {
          const next = [...items]; next[i] = { ...next[i], fieldName: e.target.value }; setItems(next);
        }} />
      ),
    },
    {
      title: 'Description', key: 'desc',
      render: (_: any, _r: FieldTemplateItem, i: number) => (
        <Input value={items[i]?.fieldDescription} onChange={(e) => {
          const next = [...items]; next[i] = { ...next[i], fieldDescription: e.target.value }; setItems(next);
        }} />
      ),
    },
    {
      title: '', key: 'del', width: 48,
      render: (_: any, __: any, i: number) => (
        <Button icon={<DeleteOutlined />} type="text" danger onClick={() => setItems(items.filter((_, j) => j !== i))} />
      ),
    },
  ];

  return (
    <Modal open={open} title="System Field Template" onCancel={onCancel} onOk={() => onSave(name, items.map((it, i) => ({ ...it, sortOrder: i })))} okText="Save" confirmLoading={saving} width={700}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input addonBefore="Template Name" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 400 }} />
        <Table dataSource={items} columns={columns} rowKey={(_, i) => String(i)} pagination={false} size="small" />
        <Button icon={<PlusOutlined />} onClick={() => setItems([...items, { fieldName: '', fieldDescription: '', sortOrder: items.length }])}>Add Field</Button>
      </Space>
    </Modal>
  );
}

// ─── Prompt Editor Modal ──────────────────────────────────────────────────────

function PromptEditorModal({
  open, initialData, onSave, onCancel, saving,
}: {
  open: boolean;
  initialData: { name: string; content: string } | null;
  onSave: (name: string, content: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = React.useState('');
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    if (open && initialData) { setName(initialData.name); setContent(initialData.content); }
    else if (open) { setName(''); setContent(''); }
  }, [open, initialData]);

  return (
    <Modal open={open} title="System Prompt Template" onCancel={onCancel} onOk={() => onSave(name, content)} okText="Save" confirmLoading={saving} width={700}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input addonBefore="Template Name" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 400 }} />
        <Typography.Text type="secondary">Must contain <code>{'{contract_text}'}</code></Typography.Text>
        <Input.TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
      </Space>
    </Modal>
  );
}

// ─── System Field Templates Tab ───────────────────────────────────────────────

function SystemFieldTemplatesTab() {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-field-templates'] }); setEditorOpen(false); message.success('Template created'); },
    onError: () => message.error('Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, items }: { id: string; name: string; items: FieldTemplateItem[] }) =>
      adminUpdateFieldTemplate(id, name, items).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-field-templates'] }); setEditorOpen(false); message.success('Template saved'); },
    onError: () => message.error('Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteFieldTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-field-templates'] }); message.success('Template deleted'); },
    onError: () => message.error('Delete failed'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => adminSetDefaultFieldTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-field-templates'] }); message.success('Default updated'); },
    onError: () => message.error('Failed'),
  });

  const handleSave = (name: string, items: FieldTemplateItem[]) => {
    if (editingTemplate) { updateMutation.mutate({ id: editingTemplate.id, name, items }); }
    else { createMutation.mutate({ name, items }); }
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>Create New System Template</Button>
      {templates.length === 0 ? (
        <Empty description="No system field templates." />
      ) : (
        templates.map((tmpl) => (
          <Card key={tmpl.id} size="small"
            title={<Space>{tmpl.name}{tmpl.isDefault && <Tag color="blue">Default</Tag>}</Space>}
            extra={
              <Space>
                {!tmpl.isDefault && (
                  <Popconfirm title="Set this as the system default?" onConfirm={() => setDefaultMutation.mutate(tmpl.id)}>
                    <Button icon={<StarOutlined />} size="small">Set Default</Button>
                  </Popconfirm>
                )}
                {tmpl.isDefault && <Button icon={<StarFilled />} size="small" disabled>Default</Button>}
                <Button icon={<EditOutlined />} size="small" onClick={() => { setEditingTemplate(tmpl); setEditorOpen(true); }}>Edit</Button>
                <Popconfirm title="Delete this template?" onConfirm={() => deleteMutation.mutate(tmpl.id)}>
                  <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Typography.Text type="secondary">{tmpl.items?.length ?? 0} fields</Typography.Text>
          </Card>
        ))
      )}
      <FieldTemplateEditorModal
        open={editorOpen}
        initialData={editingTemplate ? { name: editingTemplate.name, items: editingTemplate.items } : null}
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </Space>
  );
}

// ─── System Prompt Templates Tab ──────────────────────────────────────────────

function SystemPromptTemplatesTab() {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] }); setEditorOpen(false); message.success('Template created'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, content }: { id: string; name: string; content: string }) =>
      adminUpdatePromptTemplate(id, name, content).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] }); setEditorOpen(false); message.success('Template saved'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeletePromptTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] }); message.success('Template deleted'); },
    onError: () => message.error('Delete failed'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => adminSetDefaultPromptTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-prompt-templates'] }); message.success('Default updated'); },
    onError: () => message.error('Failed'),
  });

  const handleSave = (name: string, content: string) => {
    if (editingTemplate) { updateMutation.mutate({ id: editingTemplate.id, name, content }); }
    else { createMutation.mutate({ name, content }); }
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>Create New System Template</Button>
      {templates.length === 0 ? (
        <Empty description="No system prompt templates." />
      ) : (
        templates.map((tmpl) => (
          <Card key={tmpl.id} size="small"
            title={<Space>{tmpl.name}{tmpl.isDefault && <Tag color="blue">Default</Tag>}</Space>}
            extra={
              <Space>
                {!tmpl.isDefault && (
                  <Popconfirm title="Set this as the system default?" onConfirm={() => setDefaultMutation.mutate(tmpl.id)}>
                    <Button icon={<StarOutlined />} size="small">Set Default</Button>
                  </Popconfirm>
                )}
                {tmpl.isDefault && <Button icon={<StarFilled />} size="small" disabled>Default</Button>}
                <Button icon={<EditOutlined />} size="small" onClick={() => { setEditingTemplate(tmpl); setEditorOpen(true); }}>Edit</Button>
                <Popconfirm title="Delete this template?" onConfirm={() => deleteMutation.mutate(tmpl.id)}>
                  <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Typography.Text type="secondary" ellipsis style={{ display: 'block', maxWidth: 500 }}>
              {tmpl.content.substring(0, 120)}{tmpl.content.length > 120 ? '…' : ''}
            </Typography.Text>
          </Card>
        ))
      )}
      <PromptEditorModal
        open={editorOpen}
        initialData={editingTemplate ? { name: editingTemplate.name, content: editingTemplate.content } : null}
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </Space>
  );
}

// ─── Pending Requests Tab ─────────────────────────────────────────────────────

function PendingRequestsTab() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-template-requests'],
    queryFn: getAdminRequests,
    refetchInterval: 30_000,
  });

  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [rejectNote, setRejectNote] = useState('');

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-template-requests'] });
      message.success('Template approved and added to system!');
    },
    onError: () => message.error('Approve failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectRequest(id, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-template-requests'] });
      setRejectModal({ open: false, id: '', name: '' });
      setRejectNote('');
      message.success('Request declined');
    },
    onError: () => message.error('Reject failed'),
  });

  if (isLoading) return <Spin />;

  if (requests.length === 0) {
    return <Empty description="No pending requests" />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {requests.map((req) => {
        const isField = req.templateKind === 'field';
        const tmplName = isField ? req.fieldTemplate?.name : req.promptTemplate?.name;
        const userName = req.user?.name || req.user?.email || 'Unknown';

        return (
          <Card
            key={req.id}
            size="small"
            title={
              <Space>
                <Tag color={isField ? 'blue' : 'purple'}>{isField ? 'Field Template' : 'Prompt Template'}</Tag>
                <span>{tmplName}</span>
              </Space>
            }
            extra={
              <Space>
                <Popconfirm
                  title={`Approve "${tmplName}" as system template?`}
                  onConfirm={() => approveMutation.mutate(req.id)}
                  okText="Approve"
                >
                  <Button icon={<CheckCircleOutlined />} size="small" type="primary">
                    Approve
                  </Button>
                </Popconfirm>
                <Button
                  icon={<CloseCircleOutlined />}
                  size="small"
                  danger
                  onClick={() => { setRejectModal({ open: true, id: req.id, name: tmplName || '' }); setRejectNote(''); }}
                >
                  Decline
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text type="secondary">Requested by: <strong>{userName}</strong> ({req.user?.email})</Typography.Text>
              <Typography.Text type="secondary">Submitted: {new Date(req.createdAt).toLocaleString()}</Typography.Text>
              {isField && req.fieldTemplate?.items && (
                <Typography.Text type="secondary">Fields: {req.fieldTemplate.items.map((i) => i.fieldName).join(', ')}</Typography.Text>
              )}
              {!isField && req.promptTemplate?.content && (
                <Typography.Text type="secondary" ellipsis style={{ display: 'block', maxWidth: 600 }}>
                  {req.promptTemplate.content.substring(0, 200)}{req.promptTemplate.content.length > 200 ? '…' : ''}
                </Typography.Text>
              )}
            </Space>
          </Card>
        );
      })}

      <Modal
        open={rejectModal.open}
        title={`Decline "${rejectModal.name}"`}
        onCancel={() => setRejectModal({ open: false, id: '', name: '' })}
        onOk={() => rejectMutation.mutate({ id: rejectModal.id, note: rejectNote })}
        okText="Decline"
        okButtonProps={{ danger: true }}
        confirmLoading={rejectMutation.isPending}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>Optionally provide a note to the requester:</Typography.Text>
          <Input.TextArea
            rows={3}
            placeholder="e.g. This template is already covered by the default system template."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </Space>
      </Modal>
    </Space>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: '1m', label: '1 Month (Default)' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'never', label: 'Never Expires' },
];

function ApiKeysTab() {
  const qc = useQueryClient();
  const [expiry, setExpiry] = useState<ExpiryOption>('1m');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);

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
      message.success('API Key created successfully');
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create API key'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-api-key'] });
      setNewKey(null);
      message.success('API Key deleted');
    },
    onError: () => message.error('Failed to delete API key'),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('Copied to clipboard'));
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return <Tag color="purple">Never Expires</Tag>;
    const d = new Date(expiresAt);
    const now = new Date();
    if (d < now) return <Tag color="red">Expired</Tag>;
    return <Tag color="green">{d.toLocaleDateString()}</Tag>;
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Text type="secondary">
        A single shared API key for all administrators. Use it to call the contract analysis and compare APIs externally via <code>X-API-Key</code> header.
      </Typography.Text>

      {newKey && (
        <Alert
          type="success"
          showIcon
          message="API Key Created — Copy it now!"
          description={
            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
              <Typography.Text type="secondary">This key is shown only once. Store it securely.</Typography.Text>
              <Input.Password
                value={newKey}
                visibilityToggle={{ visible: keyVisible, onVisibleChange: setKeyVisible }}
                readOnly
                addonAfter={
                  <Tooltip title="Copy">
                    <CopyOutlined style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(newKey)} />
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
              <span>Active API Key</span>
            </Space>
          }
          extra={
            <Popconfirm
              title="Delete this API key? All external integrations using it will stop working."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(keyInfo.id)}
            >
              <Button icon={<DeleteOutlined />} danger size="small" loading={deleteMutation.isPending}>
                Delete
              </Button>
            </Popconfirm>
          }
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space>
              <Typography.Text type="secondary">Key Prefix:</Typography.Text>
              <Typography.Text code>{keyInfo.keyPrefix}…</Typography.Text>
              <Typography.Text type="secondary">(full key shown only at creation)</Typography.Text>
            </Space>
            <Space>
              <Typography.Text type="secondary">Expires:</Typography.Text>
              {formatExpiry(keyInfo.expiresAt)}
            </Space>
            <Space>
              <Typography.Text type="secondary">Created:</Typography.Text>
              <Typography.Text>{new Date(keyInfo.createdAt).toLocaleString()}</Typography.Text>
            </Space>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              External API Usage Example:
            </Typography.Text>
            <Typography.Text code style={{ display: 'block', background: '#f5f5f5', padding: '8px 12px', borderRadius: 4 }}>
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
            <Empty description="No API key exists. Create one to enable external API access." />
            <Space>
              <Select
                value={expiry}
                onChange={setExpiry}
                options={EXPIRY_OPTIONS}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
              >
                Create API Key
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
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['admin-template-requests'],
    queryFn: getAdminRequests,
    refetchInterval: 30_000,
  });

  const tabItems = [
    {
      key: 'admin-fields',
      label: 'System Field Templates',
      children: <SystemFieldTemplatesTab />,
    },
    {
      key: 'admin-prompt',
      label: 'System Prompt Templates',
      children: <SystemPromptTemplatesTab />,
    },
    {
      key: 'admin-requests',
      label: (
        <Space>
          Pending Requests
          {pendingRequests.length > 0 && (
            <Tag color="red" style={{ margin: 0 }}>{pendingRequests.length}</Tag>
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
          API Keys
        </Space>
      ),
      children: <ApiKeysTab />,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>System Settings</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Manage system-level templates. Users can select these directly or duplicate them to create personal templates. The <strong>Default</strong> template is used as fallback when no template is selected.
      </Typography.Text>
      <Tabs items={tabItems} />
    </div>
  );
}

