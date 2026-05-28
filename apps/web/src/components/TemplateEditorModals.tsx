import React from 'react';
import { Modal, Input, Button, Space, Typography, Form, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation, Trans } from 'react-i18next';
import type { FieldTemplateItem } from '../types';

const CONTRACT_TEXT_TOKEN = '{contract_text}';

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
  open,
  title,
  initialData,
  onSave,
  onCancel,
  saving,
}: FieldTemplateEditorModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string; items: FieldTemplateItem[] }>();

  React.useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue({
        name: initialData.name,
        items: initialData.items.map((it) => ({ ...it })),
      });
    } else if (open) {
      form.setFieldsValue({ name: '', items: [] });
    }
  }, [open, initialData, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const items = values.items.map((it, i) => ({ ...it, sortOrder: i }));
    onSave(values.name.trim(), items);
  };

  return (
    <Modal
      open={open}
      title={title ?? t('templateEditor.editField')}
      onCancel={onCancel}
      onOk={handleOk}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label={t('templateEditor.templateName')}
          rules={[{ required: true, whitespace: true, message: t('templateEditor.nameRequired') }]}
        >
          <Input style={{ maxWidth: 400 }} />
        </Form.Item>
        <Form.List
          name="items"
          rules={[
            {
              validator: async (_, value?: FieldTemplateItem[]) => {
                if (!value || value.length === 0)
                  throw new Error(t('templateEditor.fieldRequired'));
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(160px, 0.9fr) minmax(220px, 1.4fr) 40px',
                  gap: 8,
                  alignItems: 'start',
                }}
              >
                <Typography.Text strong>{t('templateEditor.fieldName')}</Typography.Text>
                <Typography.Text strong>{t('templateEditor.description')}</Typography.Text>
                <span />
                {fields.map(({ key, name, ...restField }) => (
                  <React.Fragment key={key}>
                    <Form.Item
                      {...restField}
                      name={[name, 'fieldName']}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t('templateEditor.fieldNameRequired'),
                        },
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'fieldDescription']}
                      style={{ marginBottom: 8 }}
                    >
                      <Input />
                    </Form.Item>
                    <Button
                      icon={<DeleteOutlined />}
                      type="text"
                      danger
                      aria-label={t('common.delete')}
                      onClick={() => remove(name)}
                    />
                  </React.Fragment>
                ))}
              </div>
              {fields.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.noData')} />
              )}
              <Form.ErrorList errors={errors} />
              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  add({ fieldName: '', fieldDescription: '', sortOrder: fields.length })
                }
              >
                {t('templateEditor.addField')}
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
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
  open,
  title,
  initialData,
  onSave,
  onCancel,
  saving,
}: PromptEditorModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string; content: string }>();

  React.useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue({ name: initialData.name, content: initialData.content });
    } else if (open) {
      form.setFieldsValue({ name: '', content: '' });
    }
  }, [open, initialData, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSave(values.name.trim(), values.content);
  };

  return (
    <Modal
      open={open}
      title={title ?? t('templateEditor.editPrompt')}
      onCancel={onCancel}
      onOk={handleOk}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label={t('templateEditor.templateName')}
          rules={[{ required: true, whitespace: true, message: t('templateEditor.nameRequired') }]}
        >
          <Input style={{ maxWidth: 400 }} />
        </Form.Item>
        <Typography.Text type="secondary">
          <Trans
            i18nKey="templateEditor.mustContain"
            values={{ token: CONTRACT_TEXT_TOKEN }}
            components={{ 1: <code /> }}
          />
        </Typography.Text>
        <Form.Item
          name="content"
          style={{ marginTop: 8, marginBottom: 0 }}
          rules={[
            { required: true, whitespace: true, message: t('templateEditor.promptRequired') },
            {
              validator: async (_, value?: string) => {
                if (value && !value.includes(CONTRACT_TEXT_TOKEN)) {
                  throw new Error(
                    t('templateEditor.promptTokenRequired', { token: CONTRACT_TEXT_TOKEN }),
                  );
                }
              },
            },
          ]}
        >
          <Input.TextArea rows={12} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
