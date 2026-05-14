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
  message,
} from 'antd';
import { DownloadOutlined, FileTextOutlined, LikeOutlined, DislikeOutlined, LikeFilled, DislikeFilled } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAnalysisJob, getFeedback, submitFeedback } from '../api/analysis';
import { getDocumentText, downloadDocument, downloadTextAsMarkdown } from '../api/documents';
import { useAuthStore } from '../stores/authStore';
import type { AnalysisJob, AnalysisJobFeedback } from '../types';

interface Props {
  job: AnalysisJob | null;
  open: boolean;
  onClose: () => void;
}

const fieldColumns = [
  { title: 'Field', dataIndex: 'field', key: 'field', width: 180 },
  {
    title: 'Value',
    dataIndex: 'extracted_value',
    key: 'value',
    render: (v: unknown) => {
      if (v === null || v === undefined)
        return <Typography.Text type="secondary">Not found</Typography.Text>;
      if (typeof v === 'object')
        return <Typography.Text code>{JSON.stringify(v, null, 2)}</Typography.Text>;
      return String(v);
    },
  },
  { title: 'Confidence', dataIndex: 'confidence', key: 'conf', width: 100 },
  {
    title: 'Evidence',
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
    title: 'Comments',
    dataIndex: 'comments',
    key: 'comments',
    render: (v: unknown) => v || '—',
  },
];

function FeedbackTab({ job }: { job: AnalysisJob }) {
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
      message.success('Feedback submitted');
    },
    onError: () => message.error('Failed to submit feedback'),
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
        <Typography.Text strong>Rate this analysis</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <Space size={12}>
            <Button
              type={myFeedback?.rating === 1 ? 'primary' : 'default'}
              icon={myFeedback?.rating === 1 ? <LikeFilled /> : <LikeOutlined />}
              loading={mutation.isPending}
              onClick={() => handleRate(1)}
            >
              Helpful
            </Button>
            <Button
              danger={myFeedback?.rating === -1}
              type={myFeedback?.rating === -1 ? 'primary' : 'default'}
              icon={myFeedback?.rating === -1 ? <DislikeFilled /> : <DislikeOutlined />}
              loading={mutation.isPending}
              onClick={() => handleRate(-1)}
            >
              Not Helpful
            </Button>
          </Space>
        </div>
      </div>

      {/* Comment input */}
      <div>
        <Typography.Text strong>Leave a comment</Typography.Text>
        <Space.Compact style={{ width: '100%', marginTop: 8 }}>
          <Input.TextArea
            rows={3}
            placeholder="Add your comment…"
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
          Submit Comment
        </Button>
      </div>

      {/* Existing feedback list */}
      {feedbacks.length > 0 && (
        <div>
          <Typography.Text strong>All Feedback ({feedbacks.length})</Typography.Text>
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
                        {fb.rating === 1 ? 'Helpful' : 'Not Helpful'}
                      </Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(fb.createdAt).toLocaleString()}
                      </Typography.Text>
                    </Space>
                  }
                  description={fb.comment || <Typography.Text type="secondary">No comment</Typography.Text>}
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
          <span>Analysis Detail</span>
          {job && (
            <Tag color={job.status === 'success' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}>
              {job.status}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={() => {
        setOcrTabActive(false);
        onClose();
      }}
      width={900}
      destroyOnClose
    >
      {!job ? null : detailLoading ? (
        <Spin style={{ display: 'block', marginTop: 80 }} />
      ) : (
        <>
          <Space style={{ marginBottom: 16 }} wrap>
            <Typography.Text strong>{job.document.fileName}</Typography.Text>
            <Typography.Text type="secondary">Model: {job.modelName}</Typography.Text>
            {job.reasoningEffort && job.reasoningEffort !== 'none' && (
              <Typography.Text type="secondary">Reasoning Effort: <Tag style={{ marginLeft: 0 }}>{job.reasoningEffort}</Tag></Typography.Text>
            )}
            <Typography.Text type="secondary">
              {new Date(job.createdAt).toLocaleString()}
            </Typography.Text>
            {job.user && (
              <Typography.Text type="secondary">By: {job.user.name}</Typography.Text>
            )}
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => downloadDocument(job.documentId, job.document.fileName)}
            >
              Download Original
            </Button>
          </Space>

          <Tabs
            defaultActiveKey="fields"
            onChange={handleTabChange}
            items={[
              {
                key: 'fields',
                label: 'Field Extraction',
                children:
                  fieldResults.length > 0 ? (
                    <Table
                      dataSource={fieldResults}
                      columns={fieldColumns}
                      rowKey={(row, idx) => row.field ?? String(idx)}
                      pagination={false}
                      size="small"
                      scroll={{ x: true }}
                    />
                  ) : (
                    <Alert type="info" message="No field extraction results available." />
                  ),
              },
              {
                key: 'risk',
                label: 'Risk Analysis',
                children:
                  riskText ? (
                    <div style={{ maxHeight: 600, overflowY: 'auto', padding: '0 4px' }}>
                      <Markdown remarkPlugins={[remarkGfm]}>{riskText}</Markdown>
                    </div>
                  ) : (
                    <Alert type="info" message="No risk analysis results available." />
                  ),
              },
              {
                key: 'ocr',
                label: (
                  <Space>
                    <FileTextOutlined />
                    OCR Text
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
                      Download Markdown
                    </Button>
                    <div
                      style={{
                        maxHeight: 560,
                        overflowY: 'auto',
                        padding: '0 4px',
                        fontSize: 13,
                        lineHeight: 1.7,
                        border: '1px solid #f0f0f0',
                        borderRadius: 6,
                        paddingInline: 12,
                      }}
                    >
                      <Markdown remarkPlugins={[remarkGfm]}>{ocrText}</Markdown>
                    </div>
                  </>
                ) : (
                  <Alert type="info" message="OCR text not available for this document." />
                ),
              },
              {
                key: 'feedback',
                label: '💬 Feedback',
                children: <FeedbackTab job={job} />,
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}

