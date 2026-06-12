import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Grid,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import { SearchOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  cleanupAdminAuditLogs,
  getAdminAuditActions,
  getAdminAuditLogs,
  getAdminAuditRetention,
  type AdminAuditQuery,
} from '../api/adminAudit';
import { getAdminUsers } from '../api/adminUsers';
import { message } from '../utils/message';
import { formatDateTime } from '../utils/format';
import type { AuditLog } from '../types';

const { RangePicker } = DatePicker;

interface AuditFilterValues {
  q?: string;
  userId?: string;
  action?: string;
  method?: string;
  statusCode?: number;
  range?: [DateRangeValue, DateRangeValue];
}

interface DateRangeValue {
  startOf(unit: 'day'): DateRangeValue;
  endOf(unit: 'day'): DateRangeValue;
  toISOString(): string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PATCH: 'gold',
  PUT: 'purple',
  DELETE: 'red',
};

export default function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm<AuditFilterValues>();
  const [query, setQuery] = useState<AdminAuditQuery>({
    page: 1,
    pageSize: 20,
    sortOrder: 'desc',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-audit', query],
    queryFn: () => getAdminAuditLogs(query).then((r) => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers().then((r) => r.data),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['admin-audit-actions'],
    queryFn: () => getAdminAuditActions().then((r) => r.data),
  });

  const { data: retention } = useQuery({
    queryKey: ['admin-audit-retention'],
    queryFn: () => getAdminAuditRetention().then((r) => r.data),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => cleanupAdminAuditLogs().then((r) => r.data),
    onSuccess: (result) => {
      message.success(t('admin.audit.cleanupDone', { count: result.deletedCount }));
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-actions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-retention'] });
    },
    onError: () => message.error(t('admin.audit.cleanupFailed')),
  });

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.email})`,
      })),
    [users],
  );

  const actionOptions = useMemo(
    () => actions.map((a) => ({ value: a.action, label: `${a.action} (${a.count})` })),
    [actions],
  );

  const applyFilters = (values: AuditFilterValues) => {
    setQuery({
      q: values.q?.trim() || undefined,
      userId: values.userId,
      action: values.action,
      method: values.method,
      statusCode: values.statusCode,
      from: values.range?.[0]?.startOf('day').toISOString(),
      to: values.range?.[1]?.endOf('day').toISOString(),
      sortOrder: query.sortOrder,
      page: 1,
      pageSize: query.pageSize ?? 20,
    });
  };

  const resetFilters = () => {
    form.resetFields();
    setQuery({ page: 1, pageSize: query.pageSize ?? 20, sortOrder: 'desc' });
  };

  const handleTableChange: TableProps<AuditLog>['onChange'] = (pagination, _filters, sorter) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;

    setQuery((current) => ({
      ...current,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
      sortOrder:
        activeSorter.order === 'ascend'
          ? 'asc'
          : activeSorter.order === 'descend'
            ? 'desc'
            : undefined,
    }));
  };

  const statusColor = (statusCode: number) => {
    if (statusCode >= 500) return 'red';
    if (statusCode >= 400) return 'orange';
    if (statusCode >= 300) return 'cyan';
    return 'green';
  };

  const columns: TableColumnsType<AuditLog> = [
    {
      title: t('admin.audit.colTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatDateTime(value, i18n.language),
      sorter: true,
      sortOrder:
        query.sortOrder === 'asc' ? 'ascend' : query.sortOrder === 'desc' ? 'descend' : undefined,
    },
    {
      title: t('admin.audit.colUser'),
      dataIndex: ['user', 'name'],
      key: 'user',
      width: 180,
      render: (_: string, record) =>
        record.user ? (
          <Space direction="vertical" size={0}>
            <Typography.Text>{record.user.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.user.email}
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary">{t('admin.audit.deletedUser')}</Typography.Text>
        ),
    },
    {
      title: t('admin.audit.colAction'),
      dataIndex: 'action',
      key: 'action',
      width: 210,
      render: (action: string) => <Tag>{action}</Tag>,
    },
    {
      title: t('admin.audit.colMethod'),
      dataIndex: 'method',
      key: 'method',
      width: 90,
      render: (method: string) => <Tag color={METHOD_COLORS[method]}>{method}</Tag>,
    },
    {
      title: t('admin.audit.colPath'),
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (path: string) => <Typography.Text code>{path}</Typography.Text>,
    },
    {
      title: t('admin.audit.colStatus'),
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 100,
      render: (statusCode: number) => <Tag color={statusColor(statusCode)}>{statusCode}</Tag>,
    },
    {
      title: t('admin.audit.colDuration'),
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 110,
      render: (value?: number | null) => (value == null ? '-' : `${value} ms`),
    },
    {
      title: t('admin.audit.colIp'),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (value?: string | null) => value || '-',
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('admin.audit.title')}
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => setQuery((current) => ({ ...current }))}>
          {t('admin.audit.refresh')}
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
          wrap
          size={12}
        >
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{t('admin.audit.retentionTitle')}</Typography.Text>
            <Typography.Text type="secondary">
              {retention
                ? t('admin.audit.retentionSummary', {
                    days: retention.retentionDays,
                    cutoff: formatDateTime(retention.cutoff, i18n.language),
                  })
                : t('common.loading')}
            </Typography.Text>
          </Space>
          <Popconfirm
            title={t('admin.audit.cleanupConfirmTitle')}
            description={t('admin.audit.cleanupConfirmDesc')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => cleanupMutation.mutate()}
          >
            <Button icon={<ClearOutlined />} loading={cleanupMutation.isPending}>
              {t('admin.audit.cleanupNow')}
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      <Form
        form={form}
        layout={isMobile ? 'vertical' : 'inline'}
        onFinish={applyFilters}
        style={{ gap: 8, marginBottom: 16 }}
      >
        <Form.Item name="q">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('admin.audit.searchPlaceholder')}
            style={{ width: isMobile ? '100%' : 240 }}
          />
        </Form.Item>
        <Form.Item name="userId">
          <Select
            allowClear
            showSearch
            placeholder={t('admin.audit.userFilter')}
            options={userOptions}
            optionFilterProp="label"
            style={{ width: isMobile ? '100%' : 220 }}
          />
        </Form.Item>
        <Form.Item name="action">
          <Select
            allowClear
            showSearch
            placeholder={t('admin.audit.actionFilter')}
            options={actionOptions}
            optionFilterProp="label"
            style={{ width: isMobile ? '100%' : 220 }}
          />
        </Form.Item>
        <Form.Item name="method">
          <Select
            allowClear
            placeholder={t('admin.audit.methodFilter')}
            options={['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map((method) => ({
              value: method,
              label: method,
            }))}
            style={{ width: isMobile ? '100%' : 120 }}
          />
        </Form.Item>
        <Form.Item name="statusCode">
          <Select
            allowClear
            placeholder={t('admin.audit.statusFilter')}
            options={[200, 201, 204, 400, 401, 403, 404, 409, 429, 500].map((code) => ({
              value: code,
              label: String(code),
            }))}
            style={{ width: isMobile ? '100%' : 120 }}
          />
        </Form.Item>
        <Form.Item name="range">
          <RangePicker style={{ width: isMobile ? '100%' : 260 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              {t('common.searchAction')}
            </Button>
            <Button onClick={resetFilters}>{t('common.reset')}</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        loading={isLoading || isFetching}
        dataSource={data?.items}
        columns={columns}
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{
          current: data?.page ?? query.page ?? 1,
          pageSize: data?.pageSize ?? query.pageSize ?? 20,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => t('admin.audit.total', { total }),
        }}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => setSelectedLog(record),
          style: { cursor: 'pointer' },
        })}
      />

      <Drawer
        title={t('admin.audit.detailTitle')}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        width={isMobile ? '100%' : 640}
      >
        {selectedLog && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label={t('admin.audit.colTime')}>
                {formatDateTime(selectedLog.createdAt, i18n.language)}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colUser')}>
                {selectedLog.user
                  ? `${selectedLog.user.name} (${selectedLog.user.email})`
                  : t('admin.audit.deletedUser')}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colAction')}>
                {selectedLog.action}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colMethod')}>
                {selectedLog.method}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colPath')}>
                <Typography.Text code>{selectedLog.path}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.target')}>
                {selectedLog.targetType || selectedLog.targetId
                  ? `${selectedLog.targetType ?? '-'} / ${selectedLog.targetId ?? '-'}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colStatus')}>
                {selectedLog.statusCode}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colDuration')}>
                {selectedLog.durationMs == null ? '-' : `${selectedLog.durationMs} ms`}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.colIp')}>
                {selectedLog.ipAddress || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.audit.userAgent')}>
                {selectedLog.userAgent || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.metadata && (
              <div>
                <Typography.Text strong>{t('admin.audit.metadata')}</Typography.Text>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 6,
                    overflow: 'auto',
                    background: 'rgba(127,127,127,0.12)',
                  }}
                >
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </>
  );
}
