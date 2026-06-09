import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Popconfirm, Spin, Typography } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { message } from '../utils/message';
import type { PromptTemplate, ApiError } from '../types';

interface Props {
  queryKey: string[];
  fetchFn: () => Promise<{ data: PromptTemplate }>;
  saveFn: (name: string, content: string) => Promise<{ data: PromptTemplate }>;
  resetFn?: () => Promise<{ data: PromptTemplate }>;
  showName?: boolean;
}

export default function PromptEditor({
  queryKey,
  fetchFn,
  saveFn,
  resetFn,
  showName = true,
}: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchFn().then((r) => r.data) });
  const [content, setContent] = useState('');
  const [name, setName] = useState(t('templateEditor.defaultPromptName'));

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
      message.success(t('templateEditor.promptSaved'));
    },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('settings.saveFailed')),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetFn!().then((r) => r.data),
    onSuccess: (d) => {
      setContent(d.content);
      setName(d.name);
      message.success(t('templateEditor.resetDone'));
    },
  });

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {showName && (
        <Input
          addonBefore={t('templateEditor.promptName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      )}
      <Typography.Text type="secondary">{t('templateEditor.promptGuidance')}</Typography.Text>
      <Input.TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
      <Space wrap>
        <Button
          type="primary"
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {t('common.save')}
        </Button>
        {resetFn && (
          <Popconfirm
            title={t('templateEditor.resetConfirm')}
            onConfirm={() => resetMutation.mutate()}
          >
            <Button>{t('templateEditor.resetToDefault')}</Button>
          </Popconfirm>
        )}
      </Space>
    </Space>
  );
}
