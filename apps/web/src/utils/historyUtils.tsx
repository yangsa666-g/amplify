import React, { useRef } from 'react';
import { Input, Button, Space } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import type { AnalysisJob } from '../types';

export function useTextFilter(dataIndex: string | string[]) {
  const searchInput = useRef<InputRef>(null);
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder="Search…"
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button type="primary" onClick={() => confirm()} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>
            Search
          </Button>
          <Button onClick={() => { clearFilters?.(); confirm(); }} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />,
    onFilter: (value: React.Key | boolean, record: unknown) => {
      const keys = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = keys.reduce((obj: any, k) => (obj as Record<string, unknown>)?.[k], record);
      return String(val ?? '').toLowerCase().includes(String(value).toLowerCase());
    },
    onFilterDropdownOpenChange: (open: boolean) => {
      if (open) setTimeout(() => searchInput.current?.select(), 100);
    },
  };
}

export function getFeedbackSummary(feedbacks?: AnalysisJob['feedbacks']) {
  if (!feedbacks || feedbacks.length === 0) return null;
  const withRating = feedbacks.find((f) => f.rating !== undefined && f.rating !== null);
  if (withRating) return withRating;
  return feedbacks.find((f) => f.comment) ?? null;
}
