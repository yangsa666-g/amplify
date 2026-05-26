import React, { useState } from 'react';
import {
  Typography, Card, Row, Col, Statistic, Select, Table, Progress, Spin, Empty, theme,
} from 'antd';
import {
  FileTextOutlined, DiffOutlined, TeamOutlined, UserAddOutlined,
  LikeOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAdminStats } from '../api/adminDashboard';
import type { AdminStats } from '../types';

type Period = '24h' | '7d' | '30d';

function StatusBar({ breakdown }: { breakdown: AdminStats['analysis']['statusBreakdown'] }) {
  const { t } = useTranslation();
  const total = breakdown.success + breakdown.failed + breakdown.running + breakdown.pending;
  if (total === 0) return <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const items = [
    { label: t('status.success'), value: breakdown.success, color: '#52c41a' },
    { label: t('status.failed'), value: breakdown.failed, color: '#ff4d4f' },
    { label: t('status.running'), value: breakdown.running, color: '#1677ff' },
    { label: t('status.pending'), value: breakdown.pending, color: '#faad14' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        {items.filter((i) => i.value > 0).map((item) => (
          <div
            key={item.label}
            style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {items.map((item) => (
          <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />
            {item.label}: <strong>{item.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function DailyVolumeChart({ data }: { data: AdminStats['dailyVolume'] }) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  if (!data || data.length === 0) return <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const maxVal = Math.max(...data.map((d) => d.analyses + d.compares), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, minWidth: data.length * 28 }}>
        {data.map((d) => {
          const total = d.analyses + d.compares;
          const aHeight = Math.round((d.analyses / maxVal) * 100);
          const cHeight = Math.round((d.compares / maxVal) * 100);
          return (
            <div
              key={d.date}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 24 }}
              title={`${d.date}\n${t('admin.dashboard.analyses')}: ${d.analyses}\n${t('admin.dashboard.compares')}: ${d.compares}`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 100, width: '100%' }}>
                <div style={{ height: `${cHeight}%`, background: '#69b1ff', borderRadius: '2px 2px 0 0', minHeight: total > 0 && d.compares > 0 ? 2 : 0 }} />
                <div style={{ height: `${aHeight}%`, background: '#52c41a', borderRadius: '2px 2px 0 0', minHeight: total > 0 && d.analyses > 0 ? 2 : 0 }} />
              </div>
              <span style={{ fontSize: 10, color: token.colorTextTertiary, writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
                {d.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <span style={{ width: 10, height: 10, background: '#52c41a', display: 'inline-block', borderRadius: 2 }} /> {t('admin.dashboard.analyses')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <span style={{ width: 10, height: 10, background: '#69b1ff', display: 'inline-block', borderRadius: 2 }} /> {t('admin.dashboard.compares')}
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [period, setPeriod] = useState<Period>('7d');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', period],
    queryFn: () => getAdminStats(period).then((r) => r.data),
  });

  const periodLabels: Record<Period, string> = {
    '24h': t('admin.dashboard.period24h'),
    '7d': t('admin.dashboard.period7d'),
    '30d': t('admin.dashboard.period30d'),
  };

  const topUsersColumns = [
    { title: t('admin.dashboard.colName'), dataIndex: 'name', key: 'name' },
    { title: t('admin.dashboard.colEmail'), dataIndex: 'email', key: 'email', responsive: ['md' as const] },
    { title: t('admin.dashboard.analyses'), dataIndex: 'analysisCount', key: 'analyses', align: 'right' as const },
    { title: t('admin.dashboard.compares'), dataIndex: 'compareCount', key: 'compares', align: 'right' as const },
  ];

  const modelColumns = [
    { title: t('analysis.columns.model'), dataIndex: 'modelName', key: 'model' },
    {
      title: 'Usage',
      key: 'usage',
      render: (_: unknown, record: { modelName: string; count: number }) => {
        const total = stats?.modelUsage.reduce((s, m) => s + m.count, 0) ?? 1;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={Math.round((record.count / total) * 100)}
              size="small"
              style={{ flex: 1, minWidth: 80 }}
              showInfo={false}
            />
            <span style={{ minWidth: 28, textAlign: 'right' }}>{record.count}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('admin.dashboard.title')}</Typography.Title>
        <Select
          value={period}
          onChange={setPeriod}
          options={(Object.keys(periodLabels) as Period[]).map((v) => ({ value: v, label: periodLabels[v] }))}
          style={{ width: 160 }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : !stats ? null : (
        <>
          {/* Stat cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title={t('admin.dashboard.totalAnalyses')}
                  value={stats.analysis.total}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title={t('admin.dashboard.analysisSuccess')}
                  value={stats.analysis.successRate}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title={t('admin.dashboard.totalCompares')}
                  value={stats.compare.total}
                  prefix={<DiffOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title={t('admin.dashboard.activeUsers')}
                  value={stats.users.activeCount}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title={t('admin.dashboard.newUsers')}
                  value={stats.users.newCount}
                  prefix={<UserAddOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title={t('admin.dashboard.feedbackThumbs')}
                  value={stats.feedback.positiveRate ?? 'N/A'}
                  suffix={stats.feedback.positiveRate !== null ? '%' : ''}
                  prefix={<LikeOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>
                  {t('admin.dashboard.feedbackBreakdown', { up: stats.feedback.thumbsUp, down: stats.feedback.thumbsDown, total: stats.feedback.total })}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Charts row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title={t('admin.dashboard.dailyVolume')} size="small">
                <DailyVolumeChart data={stats.dailyVolume} />
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title={t('admin.dashboard.analysisStatus')} size="small" style={{ height: '100%' }}>
                <StatusBar breakdown={stats.analysis.statusBreakdown} />
                {stats.compare.total > 0 && (
                  <>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 16, marginBottom: 8 }}>
                      {t('admin.dashboard.compareStatus')}
                    </Typography.Text>
                    <StatusBar breakdown={stats.compare.statusBreakdown} />
                  </>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title={t('admin.dashboard.modelUsage')} size="small" style={{ height: '100%' }}>
                {stats.modelUsage.length === 0 ? (
                  <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table
                    dataSource={stats.modelUsage}
                    columns={modelColumns}
                    rowKey="modelName"
                    size="small"
                    pagination={false}
                    showHeader={false}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* Top users + feedback breakdown */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title={t('admin.dashboard.topUsers')} size="small">
                {stats.users.topUsers.length === 0 ? (
                  <Empty description={t('admin.dashboard.noActivity')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table
                    dataSource={stats.users.topUsers}
                    columns={topUsersColumns}
                    rowKey="userId"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title={t('admin.dashboard.feedbackOverview')} size="small">
                {stats.feedback.total === 0 ? (
                  <Empty description={t('admin.dashboard.noFeedbackPeriod')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32 }}>👍</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{stats.feedback.thumbsUp}</div>
                        <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>{t('admin.dashboard.helpful')}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32 }}>👎</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>{stats.feedback.thumbsDown}</div>
                        <div style={{ color: token.colorTextTertiary, fontSize: 12 }}>{t('admin.dashboard.notHelpful')}</div>
                      </div>
                    </div>
                    {stats.feedback.positiveRate !== null && (
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 13, color: token.colorTextSecondary }}>{t('admin.dashboard.positiveRate')}</div>
                        <Progress
                          percent={stats.feedback.positiveRate}
                          strokeColor="#52c41a"
                          trailColor="#ff4d4f"
                          format={(p) => `${p}%`}
                        />
                      </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: 12, color: token.colorTextTertiary, textAlign: 'center' }}>
                      {t('admin.dashboard.submissionsTotal', { count: stats.feedback.total })}
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
