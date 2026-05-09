import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Input, Typography, Space, Popconfirm, message, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentFieldTemplate, saveFieldTemplate, resetFieldTemplate } from '../api/fieldTemplates';
import { getCurrentPromptTemplate, savePromptTemplate, resetPromptTemplate } from '../api/promptTemplates';

export default function SettingsPage() {
  return (
    <div>
      <Typography.Title level={4}>Settings</Typography.Title>
      <Tabs items={[
        { key: 'fields', label: 'Field Template', children: <FieldTemplateSettings /> },
        { key: 'prompt', label: 'Risk Prompt', children: <PromptSettings /> },
      ]} />
    </div>
  );
}

function FieldTemplateSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['field-template'], queryFn: () => getCurrentFieldTemplate().then((r) => r.data) });
  const [items, setItems] = useState<{ fieldName: string; fieldDescription: string; sortOrder: number }[]>([]);
  const [templateName, setTemplateName] = useState('My Fields');

  useEffect(() => { if (data) { setItems(data.items); setTemplateName(data.name); } }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveFieldTemplate(templateName, items.map((it, i) => ({ ...it, sortOrder: i }))).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['field-template'] }); message.success('Field template saved'); },
    onError: () => message.error('Save failed'),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetFieldTemplate().then((r) => r.data),
    onSuccess: (d) => { setItems(d.items); setTemplateName(d.name); qc.invalidateQueries({ queryKey: ['field-template'] }); message.success('Reset to default'); },
  });

  if (isLoading) return <Spin />;

  const columns = [
    { title: 'Field Name', dataIndex: 'fieldName', key: 'name', render: (_: any, r: any, i: number) => <Input value={r.fieldName} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], fieldName: e.target.value }; setItems(n); }} /> },
    { title: 'Description', dataIndex: 'fieldDescription', key: 'desc', render: (_: any, r: any, i: number) => <Input value={r.fieldDescription} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], fieldDescription: e.target.value }; setItems(n); }} /> },
    { title: '', key: 'del', width: 60, render: (_: any, __: any, i: number) => <Button icon={<DeleteOutlined />} type="text" danger onClick={() => setItems(items.filter((_, j) => j !== i))} /> },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input addonBefore="Template Name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ maxWidth: 400 }} />
      <Table dataSource={items} columns={columns} rowKey={(_, i) => String(i)} pagination={false} size="small" />
      <Space>
        <Button icon={<PlusOutlined />} onClick={() => setItems([...items, { fieldName: '', fieldDescription: '', sortOrder: items.length }])}>Add Field</Button>
        <Button type="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
        <Popconfirm title="Reset to system default?" onConfirm={() => resetMutation.mutate()}><Button>Reset to Default</Button></Popconfirm>
      </Space>
    </Space>
  );
}

function PromptSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['prompt-template'], queryFn: () => getCurrentPromptTemplate().then((r) => r.data) });
  const [content, setContent] = useState('');
  const [name, setName] = useState('My Risk Prompt');

  useEffect(() => { if (data) { setContent(data.content); setName(data.name); } }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => savePromptTemplate(name, content).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-template'] }); message.success('Prompt saved'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Save failed'),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetPromptTemplate().then((r) => r.data),
    onSuccess: (d) => { setContent(d.content); setName(d.name); message.success('Reset to default'); },
  });

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input addonBefore="Prompt Name" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 400 }} />
      <Typography.Text type="secondary">Must contain <code>{'{contract_text}'}</code></Typography.Text>
      <Input.TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
      <Space>
        <Button type="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
        <Popconfirm title="Reset to system default?" onConfirm={() => resetMutation.mutate()}><Button>Reset to Default</Button></Popconfirm>
      </Space>
    </Space>
  );
}
