import React, { useState, useEffect } from 'react';
import { Tabs, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getHistory } from '../api/history';
import type { AnalysisJob } from '../types';
import AnalysisDetailDrawer from '../components/AnalysisDetailDrawer';

export default function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ['history'], queryFn: () => getHistory().then((r) => r.data) });
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
    navigate('/history', { replace: true });
  };

  const analysisColumns = [
    { title: 'File', dataIndex: ['document', 'fileName'], key: 'file' },
    { title: 'Model', dataIndex: 'modelName', key: 'model' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>{s}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => new Date(d).toLocaleString() },
  ];

  const compareColumns = [
    { title: 'Old File', dataIndex: ['oldDocument', 'fileName'], key: 'old' },
    { title: 'New File', dataIndex: ['newDocument', 'fileName'], key: 'new' },
    { title: 'Mode', dataIndex: 'diffMode', key: 'mode' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => new Date(d).toLocaleString() },
  ];

  return (
    <>
      <Typography.Title level={4}>History</Typography.Title>
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
