import React from 'react';
import { Modal, Input, Table, Button, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation, Trans } from 'react-i18next';
import type { FieldTemplateItem } from '../types';

// ─── Field Template Editor Modal ─────────────────────────────────────────────

interface FieldTemplateEditorModalProps {
  open: boolean;
  title?: string;
  initialData: { name: string; items: FieldTemplateItem[] } | null;
  onSave: (name: string, items: FieldTemplateItem[]) => void;
  onCancel: () => void;
  saving: boolean;
}

export function FieldTemplateEditorModal({
  open, title, initialData, onSave, onCancel, saving,
}: FieldTemplateEditorModalProps) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [items, setItems] = React.useState<FieldTemplateItem[]>([]);

  React.useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setItems(initialData.items.map((it) => ({ ...it })));
    } else if (open) {
      setName('');
      setItems([]);
    }
  }, [open, initialData]);

  const columns = [
    {
      title: t('templateEditor.fieldName'),
      key: 'name',
      width: 180,
      render: (_: unknown, _r: FieldTemplateItem, i: number) => (
        <Input value={items[i]?.fieldName} onChange={(e) => {
          const next = [...items];
          next[i] = { ...next[i], fieldName: e.target.value };
          setItems(next);
        }} />
      ),
    },
    {
      title: t('templateEditor.description'),
      key: 'desc',
      render: (_: unknown, _r: FieldTemplateItem, i: number) => (
        <Input value={items[i]?.fieldDescription} onChange={(e) => {
          const next = [...items];
          next[i] = { ...next[i], fieldDescription: e.target.value };
          setItems(next);
        }} />
      ),
    },
    {
      title: '',
      key: 'del',
      width: 48,
      render: (_: unknown, __: unknown, i: number) => (
        <Button icon={<DeleteOutlined />} type="text" danger onClick={() => setItems(items.filter((_, j) => j !== i))} />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={title ?? t('templateEditor.editField')}
      onCancel={onCancel}
      onOk={() => onSave(name, items.map((it, i) => ({ ...it, sortOrder: i })))}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input addonBefore={t('templateEditor.templateName')} value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 400 }} />
        <Table dataSource={items} columns={columns} rowKey={(_, i) => String(i)} pagination={false} size="small" scroll={{ x: 'max-content' }} />
        <Button
          icon={<PlusOutlined />}
          onClick={() => setItems([...items, { fieldName: '', fieldDescription: '', sortOrder: items.length }])}
        >
          {t('templateEditor.addField')}
        </Button>
      </Space>
    </Modal>
  );
}

// ─── Prompt Editor Modal ──────────────────────────────────────────────────────

interface PromptEditorModalProps {
  open: boolean;
  title?: string;
  initialData: { name: string; content: string } | null;
  onSave: (name: string, content: string) => void;
  onCancel: () => void;
  saving: boolean;
}

export function PromptEditorModal({
  open, title, initialData, onSave, onCancel, saving,
}: PromptEditorModalProps) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setContent(initialData.content);
    } else if (open) {
      setName('');
      setContent('');
    }
  }, [open, initialData]);

  return (
    <Modal
      open={open}
      title={title ?? t('templateEditor.editPrompt')}
      onCancel={onCancel}
      onOk={() => onSave(name, content)}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input addonBefore={t('templateEditor.templateName')} value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 400 }} />
        <Typography.Text type="secondary">
          <Trans i18nKey="templateEditor.mustContain" values={{ token: '{contract_text}' }} components={{ 1: <code /> }} />
        </Typography.Text>
        <Input.TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
      </Space>
    </Modal>
  );
}
