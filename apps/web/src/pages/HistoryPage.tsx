import React, { useState, useEffect } from 'react';
import { Tabs, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getHistory } from '../api/history';
import type { AnalysisJob, CompareJob } from '../types';
import AnalysisDetailDrawer from '../components/AnalysisDetailDrawer';
import CompareDetailDrawer from '../components/CompareDetailDrawer';
import { useTextFilter, getFeedbackSummary } from '../utils/historyUtils';
import { statusLabel, effortLabel } from '../utils/labels';
import { formatDateTime } from '../utils/format';
import { templateDisplayName } from '../utils/templateLabels';

export default function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory().then((r) => r.data),
  });
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<CompareJob | null>(null);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    if (!jobId || !data?.analysisJobs) return;
    const job = data.analysisJobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJob(job as AnalysisJob);
      setDrawerOpen(true);
    }
  }, [searchParams, data]);

  useEffect(() => {
    const compareId = searchParams.get('compareId');
    if (!compareId || !data?.compareJobs) return;
    const job = data.compareJobs.find((j) => j.id === compareId);
    if (job) {
      setSelectedCompare(job as CompareJob);
      setCompareDrawerOpen(true);
    }
  }, [searchParams, data]);

  const handleClose = () => {
    setDrawerOpen(false);
    navigate('/history', { replace: true });
  };

  const handleCompareClose = () => {
    setCompareDrawerOpen(false);
    navigate('/history', { replace: true });
  };

  const modelOptions = Array.from(new Set((data?.analysisJobs ?? []).map((j) => j.modelName)))
    .filter(Boolean)
    .map((m) => ({ text: m, value: m }));

  const fileFilter = useTextFilter(['document', 'fileName']);
  const templateFilter = useTextFilter(['fieldTemplate', 'name']);
  const oldFileFilter = useTextFilter(['oldDocument', 'fileName']);
  const newFileFilter = useTextFilter(['newDocument', 'fileName']);

  const analysisColumns: TableColumnsType<AnalysisJob> = [
    {
      title: t('history.columns.file'),
      dataIndex: ['document', 'fileName'],
      key: 'file',
      ...fileFilter,
    },
    {
      title: t('history.columns.model'),
      dataIndex: 'modelName',
      key: 'model',
      filters: modelOptions,
      onFilter: (value: React.Key | boolean, record: AnalysisJob) => record.modelName === value,
    },
    {
      title: t('history.columns.template'),
      dataIndex: ['fieldTemplate', 'name'],
      key: 'template',
      render: (name?: string) => (name ? templateDisplayName(t, name) : '-'),
      ...templateFilter,
    },
    {
      title: t('history.columns.effort'),
      dataIndex: 'reasoningEffort',
      key: 'reasoningEffort',
      render: (e: string) => effortLabel(t, e),
      filters: [
        { text: t('effort.none'), value: 'none' },
        { text: t('effort.low'), value: 'low' },
        { text: t('effort.medium'), value: 'medium' },
        { text: t('effort.high'), value: 'high' },
        { text: t('effort.xhigh'), value: 'xhigh' },
      ],
      onFilter: (value: React.Key | boolean, record: AnalysisJob) =>
        record.reasoningEffort === value,
    },
    {
      title: t('history.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>
          {statusLabel(t, s)}
        </Tag>
      ),
      filters: [
        { text: t('status.success'), value: 'success' },
        { text: t('status.failed'), value: 'failed' },
        { text: t('status.running'), value: 'running' },
        { text: t('status.pending'), value: 'pending' },
      ],
      onFilter: (value: React.Key | boolean, record: AnalysisJob) => record.status === value,
    },
    {
      title: t('history.columns.feedback'),
      key: 'feedback',
      filters: [
        { text: t('history.feedback.helpful'), value: 'helpful' },
        { text: t('history.feedback.notHelpful'), value: 'not_helpful' },
        { text: t('history.feedback.commentOnly'), value: 'comment' },
        { text: t('history.feedback.none'), value: 'none' },
      ],
      onFilter: (value: React.Key | boolean, record: AnalysisJob) => {
        const fb = getFeedbackSummary(record.feedbacks);
        if (value === 'none') return !fb;
        if (value === 'helpful') return fb?.rating === 1;
        if (value === 'not_helpful') return fb?.rating === -1;
        if (value === 'comment')
          return !!fb && (fb.rating === undefined || fb.rating === null) && !!fb.comment;
        return true;
      },
      render: (_: unknown, record: AnalysisJob) => {
        const fb = getFeedbackSummary(record.feedbacks);
        if (!fb) return null;
        if (fb.rating === 1) return <Tag color="green">{t('history.feedback.helpful')}</Tag>;
        if (fb.rating === -1) return <Tag color="red">{t('history.feedback.notHelpful')}</Tag>;
        if (fb.comment)
          return (
            <Typography.Text
              type="secondary"
              ellipsis
              style={{ maxWidth: 160, display: 'inline-block' }}
            >
              💬 {fb.comment}
            </Typography.Text>
          );
        return null;
      },
    },
    {
      title: t('history.columns.date'),
      dataIndex: 'createdAt',
      key: 'date',
      render: (d: string) => formatDateTime(d, i18n.language),
      sorter: (a: AnalysisJob, b: AnalysisJob) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  const compareColumns: TableColumnsType<CompareJob> = [
    {
      title: t('history.columns.oldFile'),
      dataIndex: ['oldDocument', 'fileName'],
      key: 'old',
      ...oldFileFilter,
    },
    {
      title: t('history.columns.newFile'),
      dataIndex: ['newDocument', 'fileName'],
      key: 'new',
      ...newFileFilter,
    },
    {
      title: t('history.columns.mode'),
      dataIndex: 'diffMode',
      key: 'mode',
      render: (m: string) => (m === 'unified' ? t('compare.unified') : t('compare.sideBySide')),
      filters: [
        { text: t('compare.unified'), value: 'unified' },
        { text: t('compare.sideBySide'), value: 'side_by_side' },
      ],
      onFilter: (value: React.Key | boolean, record: CompareJob) => record.diffMode === value,
    },
    {
      title: t('history.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : 'red'}>{statusLabel(t, s)}</Tag>
      ),
      filters: [
        { text: t('status.success'), value: 'success' },
        { text: t('status.failed'), value: 'failed' },
        { text: t('status.running'), value: 'running' },
        { text: t('status.pending'), value: 'pending' },
      ],
      onFilter: (value: React.Key | boolean, record: CompareJob) => record.status === value,
    },
    {
      title: t('history.columns.date'),
      dataIndex: 'createdAt',
      key: 'date',
      render: (d: string) => formatDateTime(d, i18n.language),
      sorter: (a: CompareJob, b: CompareJob) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  return (
    <>
      <Typography.Title level={4}>{t('history.title')}</Typography.Title>
      <Tabs
        items={[
          {
            key: 'analysis',
            label: t('history.analysisHistory'),
            children: (
              <Table
                loading={isLoading}
                dataSource={data?.analysisJobs}
                columns={analysisColumns}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                  onClick: () => {
                    setSelectedJob(record as AnalysisJob);
                    setDrawerOpen(true);
                    setSearchParams({ jobId: record.id }, { replace: true });
                  },
                  style: { cursor: 'pointer' },
                })}
              />
            ),
          },
          {
            key: 'compare',
            label: t('history.compareHistory'),
            children: (
              <Table
                loading={isLoading}
                dataSource={data?.compareJobs}
                columns={compareColumns}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                  onClick: () => {
                    setSelectedCompare(record as CompareJob);
                    setCompareDrawerOpen(true);
                    setSearchParams({ compareId: record.id }, { replace: true });
                  },
                  style: { cursor: 'pointer' },
                })}
              />
            ),
          },
        ]}
      />

      <AnalysisDetailDrawer job={selectedJob} open={drawerOpen} onClose={handleClose} />

      <CompareDetailDrawer
        job={selectedCompare}
        open={compareDrawerOpen}
        onClose={handleCompareClose}
      />
    </>
  );
}
