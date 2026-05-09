import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Popconfirm, Spin, Typography, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PromptTemplate } from '../types';

interface Props {
  queryKey: string[];
  fetchFn: () => Promise<{ data: PromptTemplate }>;
  saveFn: (name: string, content: string) => Promise<{ data: PromptTemplate }>;
  resetFn?: () => Promise<{ data: PromptTemplate }>;
  showName?: boolean;
}

export default function PromptEditor({ queryKey, fetchFn, saveFn, resetFn, showName = true }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchFn().then((r) => r.data) });
  const [content, setContent] = useState('');
  const [name, setName] = useState('My Risk Prompt');

  useEffect(() => {
    if (data) {
      setContent(data.content);
      setName(data.name);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveFn(name, content).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      message.success('Prompt saved');
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Save failed'),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetFn!().then((r) => r.data),
    onSuccess: (d) => {
      setContent(d.content);
      setName(d.name);
      message.success('Reset to default');
    },
  });

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {showName && (
        <Input
          addonBefore="Prompt Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      )}
      <Typography.Text type="secondary">
        Must contain <code>{'{contract_text}'}</code>
      </Typography.Text>
      <Input.TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
      <Space>
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
