import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Popconfirm, Spin, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FieldTemplate, FieldTemplateItem } from '../types';

interface Props {
  queryKey: string[];
  fetchFn: () => Promise<{ data: FieldTemplate }>;
  saveFn: (name: string, items: FieldTemplateItem[]) => Promise<{ data: FieldTemplate }>;
  resetFn?: () => Promise<{ data: FieldTemplate }>;
  showName?: boolean;
}

export default function FieldTemplateEditor({ queryKey, fetchFn, saveFn, resetFn, showName = true }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchFn().then((r) => r.data) });
  const [items, setItems] = useState<FieldTemplateItem[]>([]);
  const [templateName, setTemplateName] = useState('My Fields');

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
      message.success('Field template saved');
    },
    onError: () => message.error('Save failed'),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetFn!().then((r) => r.data),
    onSuccess: (d) => {
      setItems(d.items);
      setTemplateName(d.name);
      qc.invalidateQueries({ queryKey });
      message.success('Reset to default');
    },
  });

  if (isLoading) return <Spin />;

  const columns = [
    {
      title: 'Field Name',
      dataIndex: 'fieldName',
      key: 'name',
      width: 200,
      render: (_: any, r: FieldTemplateItem, i: number) => (
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
      title: 'Description',
      dataIndex: 'fieldDescription',
      key: 'desc',
      render: (_: any, r: FieldTemplateItem, i: number) => (
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
      render: (_: any, __: any, i: number) => (
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
          addonBefore="Template Name"
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
      />
      <Space>
        <Button
          icon={<PlusOutlined />}
          onClick={() =>
            setItems([...items, { fieldName: '', fieldDescription: '', sortOrder: items.length }])
          }
        >
          Add Field
        </Button>
        <Button type="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save
        </Button>
        {resetFn && (
          <Popconfirm title="Reset to system default?" onConfirm={() => resetMutation.mutate()}>
            <Button>Reset to Default</Button>
          </Popconfirm>
        )}
      </Space>
    </Space>
  );
}
