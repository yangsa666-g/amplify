import React, { useState } from 'react';
import {
  Tabs, Typography, Button, Card, Space, Tag, Popconfirm, Modal, Spin, Select, Empty, Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, SendOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { FieldTemplate, FieldTemplateItem, PromptTemplate, ApiError } from '../types';
import {
  listFieldTemplates, createFieldTemplate, updateFieldTemplate, deleteFieldTemplate, duplicateFieldTemplate,
} from '../api/fieldTemplates';
import {
  listPromptTemplates, createPromptTemplate, updatePromptTemplate, deletePromptTemplate, duplicatePromptTemplate,
} from '../api/promptTemplates';
import { getMyRequests, submitRequest } from '../api/templateRequests';
import { FieldTemplateEditorModal, PromptEditorModal } from '../components/TemplateEditorModals';
import { message } from '../utils/message';

// ─── Duplicate From System Modal ──────────────────────────────────────────────

function DuplicateSelectModal({
  open, options, onSelect, onCancel,
}: {
  open: boolean;
  options: { id: string; name: string }[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | undefined>();
  return (
    <Modal
      open={open}
      title={t('settings.duplicateModalTitle')}
      onCancel={onCancel}
      onOk={() => { if (selected) { onSelect(selected); } }}
      okButtonProps={{ disabled: !selected }}
      okText={t('settings.duplicateAndEdit')}
      cancelText={t('common.cancel')}
    >
      <Select
        style={{ width: '100%' }}
        placeholder={t('settings.duplicateSelect')}
        value={selected}
        onChange={setSelected}
        options={options.map((o) => ({ label: o.name, value: o.id }))}
      />
    </Modal>
  );
}

// ─── Request Status Tag ───────────────────────────────────────────────────────

function RequestStatusTag({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const { t } = useTranslation();
  if (status === 'pending') return <Tag color="orange">{t('settings.statusPendingReview')}</Tag>;
  if (status === 'approved') return <Tag color="green">{t('settings.statusApproved')}</Tag>;
  return <Tag color="red">{t('settings.statusDeclined')}</Tag>;
}

// ─── Field Templates Tab ──────────────────────────────────────────────────────

function FieldTemplatesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['field-templates'],
    queryFn: () => listFieldTemplates().then((r) => r.data),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-template-requests'],
    queryFn: getMyRequests,
  });

  const systemTemplates = templates.filter((t) => t.scope === 'system');
  const personalTemplates = templates.filter((t) => t.scope === 'personal');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FieldTemplate | null>(null);
  const [dupModalOpen, setDupModalOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: ({ name, items }: { name: string; items: FieldTemplateItem[] }) =>
      createFieldTemplate(name, items).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['field-templates'] }); setEditorOpen(false); message.success(t('settings.templateCreated')); },
    onError: () => message.error(t('settings.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, items }: { id: string; name: string; items: FieldTemplateItem[] }) =>
      updateFieldTemplate(id, name, items).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['field-templates'] }); setEditorOpen(false); message.success(t('settings.templateSaved')); },
    onError: () => message.error(t('settings.saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFieldTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['field-templates'] }); message.success(t('settings.templateDeleted')); },
    onError: () => message.error(t('settings.deleteFailed')),
  });

  const duplicateMutation = useMutation({
    mutationFn: (systemId: string) => duplicateFieldTemplate(systemId).then((r) => r.data),
    onSuccess: (tmpl) => {
      qc.invalidateQueries({ queryKey: ['field-templates'] });
      setDupModalOpen(false);
      setEditingTemplate(tmpl);
      setEditorOpen(true);
      message.success(t('settings.templateDuplicated'));
    },
    onError: () => message.error(t('settings.duplicateFailed')),
  });

  const requestMutation = useMutation({
    mutationFn: (templateId: string) => submitRequest({ templateKind: 'field', templateId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-template-requests'] });
      message.success(t('settings.requestSubmitted'));
    },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('settings.requestFailed')),
  });

  const handleSave = (name: string, items: FieldTemplateItem[]) => {
    if (editingTemplate && !editingTemplate.isSystem) {
      updateMutation.mutate({ id: editingTemplate.id, name, items });
    } else {
      createMutation.mutate({ name, items });
    }
  };

  const getRequestStatus = (templateId: string) => {
    return myRequests
      .filter((r) => r.templateKind === 'field' && r.fieldTemplateId === templateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
          {t('settings.createNew')}
        </Button>
        {systemTemplates.length > 0 && (
          <Button icon={<CopyOutlined />} onClick={() => setDupModalOpen(true)}>
            {t('settings.duplicateFromSystem')}
          </Button>
        )}
      </Space>

      {personalTemplates.length === 0 ? (
        <Empty description={t('settings.noPersonalFields')} />
      ) : (
        personalTemplates.map((tmpl) => {
          const req = getRequestStatus(tmpl.id);
          const isPending = req?.status === 'pending';
          const isApproved = req?.status === 'approved';
          const tooltipTitle = isPending
            ? t('settings.requestPending')
            : isApproved
              ? t('settings.requestApprovedResubmit')
              : t('settings.requestToAdd');
          return (
            <Card
              key={tmpl.id}
              size="small"
              title={
                <Space>
                  {tmpl.name}
                  {req && <RequestStatusTag status={req.status} />}
                </Space>
              }
              extra={
                <Space wrap>
                  <Button icon={<EditOutlined />} size="small" onClick={() => { setEditingTemplate(tmpl); setEditorOpen(true); }}>
                    {t('common.edit')}
                  </Button>
                  <Tooltip title={tooltipTitle}>
                    <Button
                      icon={<SendOutlined />}
                      size="small"
                      disabled={isPending}
                      onClick={() => requestMutation.mutate(tmpl.id)}
                      loading={requestMutation.isPending}
                    >
                      {t('settings.requestToSystem')}
                    </Button>
                  </Tooltip>
                  <Popconfirm title={t('settings.deleteConfirm')} onConfirm={() => deleteMutation.mutate(tmpl.id)}>
                    <Button icon={<DeleteOutlined />} size="small" danger>{t('common.delete')}</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Typography.Text type="secondary">{t('settings.fieldsCount', { count: tmpl.items?.length ?? 0 })}</Typography.Text>
            </Card>
          );
        })
      )}

      <FieldTemplateEditorModal
        open={editorOpen}
        initialData={editingTemplate ? { name: editingTemplate.name, items: editingTemplate.items } : null}
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <DuplicateSelectModal
        open={dupModalOpen}
        options={systemTemplates}
        onSelect={(id) => duplicateMutation.mutate(id)}
        onCancel={() => setDupModalOpen(false)}
      />
    </Space>
  );
}

// ─── Prompt Templates Tab ─────────────────────────────────────────────────────

function PromptTemplatesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: () => listPromptTemplates().then((r) => r.data),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-template-requests'],
    queryFn: getMyRequests,
  });

  const systemTemplates = templates.filter((t) => t.scope === 'system');
  const personalTemplates = templates.filter((t) => t.scope === 'personal');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [dupModalOpen, setDupModalOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      createPromptTemplate(name, content).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-templates'] }); setEditorOpen(false); message.success(t('settings.templateCreated')); },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('settings.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, content }: { id: string; name: string; content: string }) =>
      updatePromptTemplate(id, name, content).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-templates'] }); setEditorOpen(false); message.success(t('settings.templateSaved')); },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('settings.saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromptTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-templates'] }); message.success(t('settings.templateDeleted')); },
    onError: () => message.error(t('settings.deleteFailed')),
  });

  const duplicateMutation = useMutation({
    mutationFn: (systemId: string) => duplicatePromptTemplate(systemId).then((r) => r.data),
    onSuccess: (tmpl) => {
      qc.invalidateQueries({ queryKey: ['prompt-templates'] });
      setDupModalOpen(false);
      setEditingTemplate(tmpl);
      setEditorOpen(true);
      message.success(t('settings.templateDuplicated'));
    },
    onError: () => message.error(t('settings.duplicateFailed')),
  });

  const requestMutation = useMutation({
    mutationFn: (templateId: string) => submitRequest({ templateKind: 'prompt', templateId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-template-requests'] });
      message.success(t('settings.requestSubmitted'));
    },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('settings.requestFailed')),
  });

  const handleSave = (name: string, content: string) => {
    if (editingTemplate && !editingTemplate.isSystem) {
      updateMutation.mutate({ id: editingTemplate.id, name, content });
    } else {
      createMutation.mutate({ name, content });
    }
  };

  const getRequestStatus = (templateId: string) => {
    return myRequests
      .filter((r) => r.templateKind === 'prompt' && r.promptTemplateId === templateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
          {t('settings.createNew')}
        </Button>
        {systemTemplates.length > 0 && (
          <Button icon={<CopyOutlined />} onClick={() => setDupModalOpen(true)}>
            {t('settings.duplicateFromSystem')}
          </Button>
        )}
      </Space>

      {personalTemplates.length === 0 ? (
        <Empty description={t('settings.noPersonalPrompts')} />
      ) : (
        personalTemplates.map((tmpl) => {
          const req = getRequestStatus(tmpl.id);
          const isPending = req?.status === 'pending';
          const isApproved = req?.status === 'approved';
          const tooltipTitle = isPending
            ? t('settings.requestPending')
            : isApproved
              ? t('settings.requestApprovedResubmit')
              : t('settings.requestToAdd');
          return (
            <Card
              key={tmpl.id}
              size="small"
              title={
                <Space>
                  {tmpl.name}
                  {req && <RequestStatusTag status={req.status} />}
                </Space>
              }
              extra={
                <Space wrap>
                  <Button icon={<EditOutlined />} size="small" onClick={() => { setEditingTemplate(tmpl); setEditorOpen(true); }}>
                    {t('common.edit')}
                  </Button>
                  <Tooltip title={tooltipTitle}>
                    <Button
                      icon={<SendOutlined />}
                      size="small"
                      disabled={isPending}
                      onClick={() => requestMutation.mutate(tmpl.id)}
                      loading={requestMutation.isPending}
                    >
                      {t('settings.requestToSystem')}
                    </Button>
                  </Tooltip>
                  <Popconfirm title={t('settings.deleteConfirm')} onConfirm={() => deleteMutation.mutate(tmpl.id)}>
                    <Button icon={<DeleteOutlined />} size="small" danger>{t('common.delete')}</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Typography.Text type="secondary" ellipsis style={{ display: 'block', maxWidth: 500 }}>
                {tmpl.content.substring(0, 120)}{tmpl.content.length > 120 ? '…' : ''}
              </Typography.Text>
            </Card>
          );
        })
      )}

      <PromptEditorModal
        open={editorOpen}
        initialData={editingTemplate ? { name: editingTemplate.name, content: editingTemplate.content } : null}
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <DuplicateSelectModal
        open={dupModalOpen}
        options={systemTemplates}
        onSelect={(id) => duplicateMutation.mutate(id)}
        onCancel={() => setDupModalOpen(false)}
      />
    </Space>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation();
  const tabItems = [
    {
      key: 'fields',
      label: t('settings.myFieldTemplates'),
      children: <FieldTemplatesTab />,
    },
    {
      key: 'prompt',
      label: t('settings.myPromptTemplates'),
      children: <PromptTemplatesTab />,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{t('settings.title')}</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {t('settings.subtitle')}
      </Typography.Text>
      <Tabs items={tabItems} />
    </div>
  );
}
