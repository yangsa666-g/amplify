import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Popconfirm, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { message } from '../utils/message';
import type { FieldTemplate, FieldTemplateItem } from '../types';

interface Props {
  queryKey: string[];
  fetchFn: () => Promise<{ data: FieldTemplate }>;
  saveFn: (name: string, items: FieldTemplateItem[]) => Promise<{ data: FieldTemplate }>;
  resetFn?: () => Promise<{ data: FieldTemplate }>;
  showName?: boolean;
}

export default function FieldTemplateEditor({ queryKey, fetchFn, saveFn, resetFn, showName = true }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchFn().then((r) => r.data) });
  const [items, setItems] = useState<FieldTemplateItem[]>([]);
  const [templateName, setTemplateName] = useState(t('templateEditor.defaultFieldsName'));

  useEffect(() => {
    if (data) {
      setItems(data.items);
      setTemplateName(data.name);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFn(templateName, items.map((it, i) => ({ ...it, sortOrder: i }))).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      message.success(t('templateEditor.fieldTemplateSaved'));
    },
    onError: () => message.error(t('settings.saveFailed')),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetFn!().then((r) => r.data),
    onSuccess: (d) => {
      setItems(d.items);
      setTemplateName(d.name);
      qc.invalidateQueries({ queryKey });
      message.success(t('templateEditor.resetDone'));
    },
  });

  if (isLoading) return <Spin />;

  const columns = [
    {
      title: t('templateEditor.fieldName'),
      dataIndex: 'fieldName',
      key: 'name',
      width: 200,
      render: (_: unknown, r: FieldTemplateItem, i: number) => (
        <Input
          value={r.fieldName}
          onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], fieldName: e.target.value };
            setItems(next);
          }}
        />
      ),
    },
    {
      title: t('templateEditor.description'),
      dataIndex: 'fieldDescription',
      key: 'desc',
      render: (_: unknown, r: FieldTemplateItem, i: number) => (
        <Input
          value={r.fieldDescription}
          onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], fieldDescription: e.target.value };
            setItems(next);
          }}
        />
      ),
    },
    {
      title: '',
      key: 'del',
      width: 56,
      render: (_: unknown, __: unknown, i: number) => (
        <Button
          icon={<DeleteOutlined />}
          type="text"
          danger
          onClick={() => setItems(items.filter((_, j) => j !== i))}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {showName && (
        <Input
          addonBefore={t('templateEditor.templateName')}
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      )}
      <Table
        dataSource={items}
        columns={columns}
        rowKey={(_, i) => String(i)}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
      <Space wrap>
        <Button
          icon={<PlusOutlined />}
          onClick={() =>
            setItems([...items, { fieldName: '', fieldDescription: '', sortOrder: items.length }])
          }
        >
          {t('templateEditor.addField')}
        </Button>
        <Button type="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {t('common.save')}
        </Button>
        {resetFn && (
          <Popconfirm title={t('templateEditor.resetConfirm')} onConfirm={() => resetMutation.mutate()}>
            <Button>{t('templateEditor.resetToDefault')}</Button>
          </Popconfirm>
        )}
      </Space>
    </Space>
  );
}
