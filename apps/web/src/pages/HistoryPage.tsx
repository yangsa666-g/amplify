import React from 'react';
import { Tabs, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../api/history';

export default function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ['history'], queryFn: () => getHistory().then((r) => r.data) });

  const analysisColumns = [
    { title: 'File', dataIndex: ['document', 'fileName'], key: 'file' },
    { title: 'Model', dataIndex: 'modelName', key: 'model' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s}</Tag> },
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
        { key: 'analysis', label: 'Analysis History', children: <Table loading={isLoading} dataSource={data?.analysisJobs} columns={analysisColumns} rowKey="id" size="small" /> },
        { key: 'compare', label: 'Compare History', children: <Table loading={isLoading} dataSource={data?.compareJobs} columns={compareColumns} rowKey="id" size="small" /> },
      ]} />
    </>
  );
}
