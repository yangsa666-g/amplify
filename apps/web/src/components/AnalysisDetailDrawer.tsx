import React, { useState } from 'react';
import {
  Drawer,
  Tabs,
  Table,
  Typography,
  Button,
  Space,
  Spin,
  Alert,
  Tag,
  Input,
  List,
  Avatar,
  Grid,
  theme,
} from 'antd';
import { DownloadOutlined, FileTextOutlined, LikeOutlined, DislikeOutlined, LikeFilled, DislikeFilled } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAnalysisJob, getFeedback, submitFeedback } from '../api/analysis';
import { getDocumentText, downloadDocument, downloadTextAsMarkdown } from '../api/documents';
import { useAuthStore } from '../stores/authStore';
import { message } from '../utils/message';
import { statusLabel, effortLabel } from '../utils/labels';
import type { AnalysisJob, AnalysisJobFeedback } from '../types';

interface Props {
  job: AnalysisJob | null;
  open: boolean;
  onClose: () => void;
}

function buildFieldColumns(t: TFunction) {
  return [
    { title: t('detail.columns.field'), dataIndex: 'field', key: 'field', width: 180 },
    {
      title: t('detail.columns.value'),
      dataIndex: 'extracted_value',
      key: 'value',
      render: (v: unknown) => {
        if (v === null || v === undefined)
          return <Typography.Text type="secondary">{t('detail.columns.notFound')}</Typography.Text>;
        if (typeof v === 'object')
          return <Typography.Text code>{JSON.stringify(v, null, 2)}</Typography.Text>;
        return String(v);
      },
    },
    { title: t('detail.columns.confidence'), dataIndex: 'confidence', key: 'conf', width: 100 },
    {
      title: t('detail.columns.evidence'),
      dataIndex: 'evidence',
      key: 'evidence',
      render: (v: unknown) =>
        v ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {String(v)}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: t('detail.columns.comments'),
      dataIndex: 'comments',
      key: 'comments',
      render: (v: unknown) => v || '—',
    },
  ];
}

function FeedbackTab({ job }: { job: AnalysisJob }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: feedbacks = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['feedback', job.id],
    queryFn: () => getFeedback(job.id).then((r) => r.data),
  });

  const myFeedback = feedbacks.find((f) => f.userId === user?.id);

  const mutation = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      submitFeedback(job.id, rating, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', job.id] });
      message.success(t('detail.feedback.submitted'));
    },
    onError: () => message.error(t('detail.feedback.submitFailed')),
  });

  const handleRate = (rating: number) => {
    mutation.mutate({ rating, comment: (myFeedback?.comment ?? comment) || undefined });
  };

  const handleSubmitComment = () => {
    mutation.mutate({
      rating: myFeedback?.rating ?? 1,
      comment: comment.trim() || undefined,
    });
    setComment('');
  };

  if (feedbackLoading) return <Spin style={{ display: 'block', marginTop: 40 }} />;

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* Rating */}
      <div>
        <Typography.Text strong>{t('detail.feedback.rateThis')}</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <Space size={12}>
            <Button
              type={myFeedback?.rating === 1 ? 'primary' : 'default'}
              icon={myFeedback?.rating === 1 ? <LikeFilled /> : <LikeOutlined />}
              loading={mutation.isPending}
              onClick={() => handleRate(1)}
            >
              {t('detail.feedback.helpful')}
            </Button>
            <Button
              danger={myFeedback?.rating === -1}
              type={myFeedback?.rating === -1 ? 'primary' : 'default'}
              icon={myFeedback?.rating === -1 ? <DislikeFilled /> : <DislikeOutlined />}
              loading={mutation.isPending}
              onClick={() => handleRate(-1)}
            >
              {t('detail.feedback.notHelpful')}
            </Button>
          </Space>
        </div>
      </div>

      {/* Comment input */}
      <div>
        <Typography.Text strong>{t('detail.feedback.leaveComment')}</Typography.Text>
        <Space.Compact style={{ width: '100%', marginTop: 8 }}>
          <Input.TextArea
            rows={3}
            placeholder={t('detail.feedback.addComment')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ resize: 'none' }}
          />
        </Space.Compact>
        <Button
          type="primary"
          size="small"
          style={{ marginTop: 8 }}
          loading={mutation.isPending}
          disabled={!comment.trim()}
          onClick={handleSubmitComment}
        >
          {t('detail.feedback.submitComment')}
        </Button>
      </div>

      {/* Existing feedback list */}
      {feedbacks.length > 0 && (
        <div>
          <Typography.Text strong>{t('detail.feedback.all', { count: feedbacks.length })}</Typography.Text>
          <List
            style={{ marginTop: 8 }}
            dataSource={feedbacks}
            renderItem={(fb: AnalysisJobFeedback) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: fb.rating === 1 ? '#52c41a' : '#ff4d4f' }}>
                      {fb.rating === 1 ? '👍' : '👎'}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Typography.Text strong>{fb.user.name}</Typography.Text>
                      <Tag color={fb.rating === 1 ? 'green' : 'red'}>
                        {fb.rating === 1 ? t('detail.feedback.helpful') : t('detail.feedback.notHelpful')}
                      </Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(fb.createdAt).toLocaleString()}
                      </Typography.Text>
                    </Space>
                  }
                  description={fb.comment || <Typography.Text type="secondary">{t('detail.feedback.noComment')}</Typography.Text>}
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </Space>
  );
}

export default function AnalysisDetailDrawer({ job, open, onClose }: Props) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [ocrTabActive, setOcrTabActive] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['analysis-detail', job?.id],
    queryFn: () => getAnalysisJob(job!.id).then((r) => r.data),
    enabled: !!job?.id && open,
  });

  const { data: ocrText, isFetching: ocrLoading } = useQuery({
    queryKey: ['document-text', job?.documentId],
    queryFn: () => getDocumentText(job!.documentId).then((r) => r.data.text),
    enabled: !!job?.documentId && open && ocrTabActive,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldResults: any[] = Array.isArray(detail?.fieldExtractionResult?.resultJson)
    ? detail.fieldExtractionResult.resultJson
    : [];
  const riskText: string = detail?.riskAnalysisResult?.resultText ?? '';

  const handleTabChange = (key: string) => {
    if (key === 'ocr') setOcrTabActive(true);
  };

  return (
    <Drawer
      title={
        <Space>
          <span>{t('detail.title')}</span>
          {job && (
            <Tag color={job.status === 'success' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}>
              {statusLabel(t, job.status)}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={() => {
        setOcrTabActive(false);
        onClose();
      }}
      width={isMobile ? '100%' : 900}
      destroyOnClose
    >
      {!job ? null : detailLoading ? (
        <Spin style={{ display: 'block', marginTop: 80 }} />
      ) : (
        <>
          <Space style={{ marginBottom: 16 }} wrap>
            <Typography.Text strong>{job.document.fileName}</Typography.Text>
            <Typography.Text type="secondary">{t('detail.model', { model: job.modelName })}</Typography.Text>
            {job.reasoningEffort && job.reasoningEffort !== 'none' && (
              <Typography.Text type="secondary">{t('detail.effort')} <Tag style={{ marginLeft: 0 }}>{effortLabel(t, job.reasoningEffort)}</Tag></Typography.Text>
            )}
            <Typography.Text type="secondary">
              {new Date(job.createdAt).toLocaleString()}
            </Typography.Text>
            {job.user && (
              <Typography.Text type="secondary">{t('detail.by', { name: job.user.name })}</Typography.Text>
            )}
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => downloadDocument(job.documentId, job.document.fileName)}
            >
              {t('detail.downloadOriginal')}
            </Button>
          </Space>

          <Tabs
            defaultActiveKey="fields"
            onChange={handleTabChange}
            items={[
              {
                key: 'fields',
                label: t('detail.fieldExtraction'),
                children:
                  fieldResults.length > 0 ? (
                    <Table
                      dataSource={fieldResults}
                      columns={buildFieldColumns(t)}
                      rowKey={(row, idx) => row.field ?? String(idx)}
                      pagination={false}
                      size="small"
                      scroll={{ x: 'max-content' }}
                    />
                  ) : (
                    <Alert type="info" message={t('detail.noFieldResults')} />
                  ),
              },
              {
                key: 'risk',
                label: t('detail.riskAnalysis'),
                children:
                  riskText ? (
                    <div style={{ maxHeight: 600, overflowY: 'auto', padding: '0 4px' }}>
                      <Markdown remarkPlugins={[remarkGfm]}>{riskText}</Markdown>
                    </div>
                  ) : (
                    <Alert type="info" message={t('detail.noRiskResults')} />
                  ),
              },
              {
                key: 'ocr',
                label: (
                  <Space>
                    <FileTextOutlined />
                    {t('detail.ocrText')}
                  </Space>
                ),
                children: ocrLoading ? (
                  <Spin style={{ display: 'block', marginTop: 40 }} />
                ) : ocrText ? (
                  <>
                    <Button
                      icon={<DownloadOutlined />}
                      size="small"
                      style={{ marginBottom: 12 }}
                      onClick={() => downloadTextAsMarkdown(ocrText, job.document.fileName)}
                    >
                      {t('detail.downloadMarkdown')}
                    </Button>
                    <div
                      style={{
                        maxHeight: 560,
                        overflowY: 'auto',
                        padding: '0 4px',
                        fontSize: 13,
                        lineHeight: 1.7,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 6,
                        paddingInline: 12,
                      }}
                    >
                      <Markdown remarkPlugins={[remarkGfm]}>{ocrText}</Markdown>
                    </div>
                  </>
                ) : (
                  <Alert type="info" message={t('detail.ocrNotAvailable')} />
                ),
              },
              {
                key: 'feedback',
                label: t('detail.feedbackTab'),
                children: <FeedbackTab job={job} />,
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
