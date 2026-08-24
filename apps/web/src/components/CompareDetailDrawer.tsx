import { useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Drawer,
  Input,
  List,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  DislikeFilled,
  DislikeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LikeFilled,
  LikeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getCompareFeedback, getCompareJob, submitCompareFeedback } from '../api/compare';
import { downloadDocument, getDocumentText } from '../api/documents';
import { useAuthStore } from '../stores/authStore';
import { message } from '../utils/message';
import { effortLabel, statusLabel } from '../utils/labels';
import { formatDateTime } from '../utils/format';
import RunTimings from './RunTimings';
import TokenUsageSummary from './TokenUsageSummary';
import type { CompareJob, CompareJobFeedback } from '../types';

interface Props {
  job: CompareJob | null;
  open: boolean;
  onClose: () => void;
}

function DocumentTextPanel({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['document-text', documentId],
    queryFn: () => getDocumentText(documentId).then((response) => response.data.text),
  });
  if (isLoading) return <Spin />;
  return data ? (
    <div className="always-scroll" style={{ maxHeight: 560, overflow: 'auto' }}>
      <Markdown remarkPlugins={[remarkGfm]}>{data}</Markdown>
    </div>
  ) : (
    <Alert type="info" message={t('analysis.noContent')} />
  );
}

function FeedbackPanel({ jobId }: { jobId: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['compare-feedback', jobId],
    queryFn: () => getCompareFeedback(jobId).then((response) => response.data),
  });
  const mine = feedbacks.find((feedback) => feedback.userId === user?.id);
  const mutation = useMutation({
    mutationFn: ({ rating, text }: { rating: number; text?: string }) =>
      submitCompareFeedback(jobId, rating, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compare-feedback', jobId] });
      message.success(t('detail.feedback.submitted'));
    },
    onError: () => message.error(t('detail.feedback.submitFailed')),
  });
  if (isLoading) return <Spin />;

  const submitRating = (rating: number) =>
    mutation.mutate({ rating, text: mine?.comment ?? (comment.trim() || undefined) });
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Space>
        <Button
          type={mine?.rating === 1 ? 'primary' : 'default'}
          icon={mine?.rating === 1 ? <LikeFilled /> : <LikeOutlined />}
          onClick={() => submitRating(1)}
        >
          {t('detail.feedback.helpful')}
        </Button>
        <Button
          danger={mine?.rating === -1}
          type={mine?.rating === -1 ? 'primary' : 'default'}
          icon={mine?.rating === -1 ? <DislikeFilled /> : <DislikeOutlined />}
          onClick={() => submitRating(-1)}
        >
          {t('detail.feedback.notHelpful')}
        </Button>
      </Space>
      <Input.TextArea
        rows={3}
        value={comment}
        placeholder={t('detail.feedback.addComment')}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button
        type="primary"
        size="small"
        disabled={!comment.trim()}
        loading={mutation.isPending}
        onClick={() => {
          mutation.mutate({ rating: mine?.rating ?? 1, text: comment.trim() });
          setComment('');
        }}
      >
        {t('detail.feedback.submitComment')}
      </Button>
      <List
        dataSource={feedbacks}
        renderItem={(feedback: CompareJobFeedback) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar>{feedback.rating === 1 ? '👍' : '👎'}</Avatar>}
              title={feedback.user.name}
              description={
                <Space direction="vertical" size={0}>
                  <Typography.Text>
                    {feedback.comment || t('detail.feedback.noComment')}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {formatDateTime(feedback.createdAt, i18n.language)}
                  </Typography.Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Space>
  );
}

export default function CompareDetailDrawer({ job, open, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const { data: detail, isLoading } = useQuery({
    queryKey: ['compare-detail', job?.id],
    queryFn: () => getCompareJob(job!.id).then((response) => response.data),
    enabled: !!job?.id && open,
  });

  return (
    <Drawer
      title={
        <Space>
          <span>{t('compareDetail.title')}</span>
          {job && (
            <Tag color={job.status === 'success' ? 'green' : 'red'}>
              {statusLabel(t, job.status)}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width="100%"
      destroyOnClose
    >
      {!job || isLoading || !detail ? (
        <Spin style={{ display: 'block', marginTop: 80 }} />
      ) : (
        <>
          <div
            className="analysis-detail-summary"
            style={
              {
                '--analysis-detail-border': token.colorBorderSecondary,
                '--analysis-detail-muted': token.colorTextSecondary,
                '--analysis-detail-text': token.colorText,
              } as React.CSSProperties
            }
          >
            <div className="analysis-detail-summary__top">
              <Space wrap>
                <FileTextOutlined />
                {detail.documents.map((item, index) => (
                  <Tag key={item.document.id}>
                    {index + 1}. {item.document.fileName}
                  </Tag>
                ))}
              </Space>
              <Space wrap>
                {detail.documents.map((item) => (
                  <Button
                    key={item.document.id}
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => downloadDocument(item.document.id, item.document.fileName)}
                  >
                    {item.document.fileName}
                  </Button>
                ))}
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${window.location.origin}${window.location.pathname}?compareId=${job.id}`,
                    );
                    message.success(t('common.linkCopied'));
                  }}
                >
                  {t('common.copyLink')}
                </Button>
              </Space>
            </div>
            <Space wrap>
              <Typography.Text>{detail.modelName}</Typography.Text>
              <Tag>{effortLabel(t, detail.reasoningEffort)}</Tag>
              <Typography.Text>{detail.promptTemplate?.name ?? '-'}</Typography.Text>
              <Typography.Text type="secondary">
                {formatDateTime(detail.createdAt, i18n.language)}
              </Typography.Text>
              <Typography.Text copyable code>
                {detail.id}
              </Typography.Text>
            </Space>
            <div style={{ marginTop: 12 }}>
              <RunTimings timings={{ analysisMs: detail.analysisMs }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <TokenUsageSummary usage={detail.tokenUsage ?? detail.tokenUsageJson} />
            </div>
          </div>

          <Tabs
            defaultActiveKey="result"
            items={[
              {
                key: 'result',
                label: t('compare.aiResult'),
                children: detail.resultText ? (
                  <div className="always-scroll" style={{ maxHeight: 640, overflow: 'auto' }}>
                    <Markdown remarkPlugins={[remarkGfm]}>{detail.resultText}</Markdown>
                  </div>
                ) : (
                  <Alert
                    type={detail.status === 'failed' ? 'error' : 'info'}
                    message={detail.errorMessage || t('compareDetail.noResult')}
                  />
                ),
              },
              ...detail.documents.map((item, index) => ({
                key: `document-${item.document.id}`,
                label: t('compare.documentNumber', { number: index + 1 }),
                children: <DocumentTextPanel documentId={item.document.id} />,
              })),
              {
                key: 'feedback',
                label: t('detail.feedbackTab'),
                children: <FeedbackPanel jobId={detail.id} />,
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
