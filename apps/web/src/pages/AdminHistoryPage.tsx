import React, { useState, useEffect } from 'react';
import { Tabs, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getHistory } from '../api/history';
import type { AnalysisJob } from '../types';
import AnalysisDetailDrawer from '../components/AnalysisDetailDrawer';
import { useTextFilter, getFeedbackSummary } from '../utils/historyUtils';


export default function AdminHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-history'],
    queryFn: () => getHistory().then((r) => r.data),
  });
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchParams] = useSearchParams();
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

  const handleClose = () => {
    setDrawerOpen(false);
    navigate('/admin/history', { replace: true });
  };

  const modelOptions = Array.from(new Set((data?.analysisJobs ?? []).map((j) => j.modelName)))
    .filter(Boolean)
    .map((m) => ({ text: m, value: m }));

  const userFilter = useTextFilter(['user', 'name']);
  const fileFilter = useTextFilter(['document', 'fileName']);
  const oldFileFilter = useTextFilter(['oldDocument', 'fileName']);
  const newFileFilter = useTextFilter(['newDocument', 'fileName']);

  const analysisColumns: any[] = [
    {
      title: 'User',
      dataIndex: ['user', 'name'],
      key: 'user',
      render: (name: string, record: any) => name || record.userId,
      ...userFilter,
    },
    {
      title: 'File',
      dataIndex: ['document', 'fileName'],
      key: 'file',
      ...fileFilter,
    },
    {
      title: 'Model',
      dataIndex: 'modelName',
      key: 'model',
      filters: modelOptions,
      onFilter: (value: any, record: any) => record.modelName === value,
    },
    {
      title: 'Reasoning Effort',
      dataIndex: 'reasoningEffort',
      key: 'reasoningEffort',
      filters: [
        { text: 'None', value: 'none' },
        { text: 'Low', value: 'low' },
        { text: 'Medium', value: 'medium' },
        { text: 'High', value: 'high' },
        { text: 'XHigh', value: 'xhigh' },
      ],
      onFilter: (value: any, record: any) => record.reasoningEffort === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>{s}</Tag>
      ),
      filters: [
        { text: 'Success', value: 'success' },
        { text: 'Failed', value: 'failed' },
        { text: 'Running', value: 'running' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: 'Feedback',
      key: 'feedback',
      filters: [
        { text: '👍 Helpful', value: 'helpful' },
        { text: '👎 Not Helpful', value: 'not_helpful' },
        { text: '💬 Comment only', value: 'comment' },
        { text: 'No Feedback', value: 'none' },
      ],
      onFilter: (value: any, record: any) => {
        const fb = getFeedbackSummary(record.feedbacks);
        if (value === 'none') return !fb;
        if (value === 'helpful') return fb?.rating === 1;
        if (value === 'not_helpful') return fb?.rating === -1;
        if (value === 'comment') return !!fb && (fb.rating === undefined || fb.rating === null) && !!fb.comment;
        return true;
      },
      render: (_: any, record: AnalysisJob) => {
        const fb = getFeedbackSummary(record.feedbacks);
        if (!fb) return null;
        if (fb.rating === 1) return <Tag color="green">👍 Helpful</Tag>;
        if (fb.rating === -1) return <Tag color="red">👎 Not Helpful</Tag>;
        if (fb.comment) return (
          <Typography.Text type="secondary" ellipsis style={{ maxWidth: 160, display: 'inline-block' }}>
            💬 {fb.comment}
          </Typography.Text>
        );
        return null;
      },
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleString(),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  const compareColumns: any[] = [
    {
      title: 'User',
      dataIndex: ['user', 'name'],
      key: 'user',
      render: (name: string, record: any) => name || record.userId,
      ...userFilter,
    },
    {
      title: 'Old File',
      dataIndex: ['oldDocument', 'fileName'],
      key: 'old',
      ...oldFileFilter,
    },
    {
      title: 'New File',
      dataIndex: ['newDocument', 'fileName'],
      key: 'new',
      ...newFileFilter,
    },
    {
      title: 'Mode',
      dataIndex: 'diffMode',
      key: 'mode',
      filters: [
        { text: 'Unified', value: 'unified' },
        { text: 'Side by Side', value: 'side_by_side' },
      ],
      onFilter: (value: any, record: any) => record.diffMode === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s}</Tag>,
      filters: [
        { text: 'Success', value: 'success' },
        { text: 'Failed', value: 'failed' },
        { text: 'Running', value: 'running' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleString(),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  return (
    <>
      <Typography.Title level={4}>
        All Users History
      </Typography.Title>
      <Tabs items={[
        {
          key: 'analysis',
          label: 'Analysis History',
          children: (
            <Table
              loading={isLoading}
              dataSource={data?.analysisJobs}
              columns={analysisColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: true }}
              onRow={(record) => ({
                onClick: () => { setSelectedJob(record as AnalysisJob); setDrawerOpen(true); },
                style: { cursor: 'pointer' },
              })}
            />
          ),
        },
        {
          key: 'compare',
          label: 'Compare History',
          children: (
            <Table
              loading={isLoading}
              dataSource={data?.compareJobs}
              columns={compareColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: true }}
            />
          ),
        },
      ]} />

      <AnalysisDetailDrawer
        job={selectedJob}
        open={drawerOpen}
        onClose={handleClose}
      />
    </>
  );
}
