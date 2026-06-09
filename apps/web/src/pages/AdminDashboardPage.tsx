import React, { useMemo, useState } from 'react';
import { Empty, Progress, Segmented, Spin, Typography, theme } from 'antd';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  DiffOutlined,
  FileTextOutlined,
  FrownOutlined,
  LikeOutlined,
  RobotOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SmileOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAdminStats } from '../api/adminDashboard';
import type { AdminStats } from '../types';

type Period = '24h' | '7d' | '30d';
type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

const STATUS_COLORS = {
  success: '#22c55e',
  failed: '#f43f5e',
  running: '#1677ff',
  pending: '#f59e0b',
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function getWeightedSuccess(stats: AdminStats) {
  const totalRuns = stats.analysis.total + stats.compare.total;
  if (totalRuns === 0) return 0;
  return Math.round(
    (stats.analysis.total * stats.analysis.successRate +
      stats.compare.total * stats.compare.successRate) /
      totalRuns,
  );
}

function SectionPanel({
  title,
  icon,
  children,
  action,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-dashboard-panel${className ? ` ${className}` : ''}`}>
      <div className="admin-dashboard-panel__header">
        <Typography.Title level={5} style={{ margin: 0 }}>
          {icon}
          <span>{title}</span>
        </Typography.Title>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  meta: string;
  accent: string;
}) {
  return (
    <div className="admin-metric-card" style={{ '--metric-accent': accent } as CSSVars}>
      <div className="admin-metric-card__icon">{icon}</div>
      <div className="admin-metric-card__content">
        <span className="admin-metric-card__label">{label}</span>
        <strong className="admin-metric-card__value">{value}</strong>
        <span className="admin-metric-card__meta">{meta}</span>
      </div>
    </div>
  );
}

function StatusBar({
  title,
  breakdown,
}: {
  title: string;
  breakdown: AdminStats['analysis']['statusBreakdown'];
}) {
  const { t } = useTranslation();
  const total = breakdown.success + breakdown.failed + breakdown.running + breakdown.pending;
  const items = [
    { label: t('status.success'), value: breakdown.success, color: STATUS_COLORS.success },
    { label: t('status.failed'), value: breakdown.failed, color: STATUS_COLORS.failed },
    { label: t('status.running'), value: breakdown.running, color: STATUS_COLORS.running },
    { label: t('status.pending'), value: breakdown.pending, color: STATUS_COLORS.pending },
  ];

  if (total === 0) {
    return (
      <div className="admin-status-block">
        <Typography.Text strong>{title}</Typography.Text>
        <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className="admin-status-block">
      <div className="admin-status-block__top">
        <Typography.Text strong>{title}</Typography.Text>
        <span>{formatNumber(total)}</span>
      </div>
      <div className="admin-status-track" aria-label={title}>
        {items
          .filter((item) => item.value > 0)
          .map((item) => (
            <div
              key={item.label}
              className="admin-status-track__segment"
              style={{
                width: `${(item.value / total) * 100}%`,
                background: item.color,
              }}
              title={`${item.label}: ${item.value}`}
            />
          ))}
      </div>
      <div className="admin-status-legend">
        {items.map((item) => (
          <span key={item.label} style={{ '--status-color': item.color } as CSSVars}>
            <i />
            {item.label}
            <strong>{formatNumber(item.value)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function DailyVolumeChart({ data }: { data: AdminStats['dailyVolume'] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const maxVal = Math.max(...data.map((d) => d.analyses + d.compares), 1);

  return (
    <div className="admin-volume-chart always-scroll">
      <div
        className="admin-volume-chart__bars"
        style={{ minWidth: Math.max(data.length * 48, 320) }}
      >
        {data.map((d) => {
          const total = d.analyses + d.compares;
          const analysisHeight = Math.round((d.analyses / maxVal) * 100);
          const compareHeight = Math.round((d.compares / maxVal) * 100);
          return (
            <div
              key={d.date}
              className="admin-volume-chart__day"
              title={`${d.date}\n${t('admin.dashboard.analyses')}: ${d.analyses}\n${t('admin.dashboard.compares')}: ${d.compares}`}
            >
              <span className="admin-volume-chart__total">{total > 0 ? total : ''}</span>
              <div className="admin-volume-chart__stack">
                <div
                  className="admin-volume-chart__bar admin-volume-chart__bar--compare"
                  style={{
                    height: `${compareHeight}%`,
                    minHeight: total > 0 && d.compares > 0 ? 6 : 0,
                  }}
                />
                <div
                  className="admin-volume-chart__bar admin-volume-chart__bar--analysis"
                  style={{
                    height: `${analysisHeight}%`,
                    minHeight: total > 0 && d.analyses > 0 ? 6 : 0,
                  }}
                />
              </div>
              <span className="admin-volume-chart__date">{d.date.slice(5).replace('-', '/')}</span>
            </div>
          );
        })}
      </div>
      <div className="admin-chart-legend">
        <span className="admin-chart-legend__analysis">{t('admin.dashboard.analyses')}</span>
        <span className="admin-chart-legend__compare">{t('admin.dashboard.compares')}</span>
      </div>
    </div>
  );
}

function ModelUsageList({ models }: { models: AdminStats['modelUsage'] }) {
  const { t } = useTranslation();
  const sortedModels = useMemo(() => [...models].sort((a, b) => b.count - a.count), [models]);
  const total = sortedModels.reduce((sum, model) => sum + model.count, 0);
  const max = Math.max(...sortedModels.map((model) => model.count), 1);

  if (sortedModels.length === 0) {
    return <Empty description={t('common.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="admin-model-list">
      {sortedModels.map((model, index) => {
        const percent = Math.round((model.count / Math.max(total, 1)) * 100);
        return (
          <div key={model.modelName} className="admin-model-list__item">
            <div className="admin-model-list__rank">{index + 1}</div>
            <div className="admin-model-list__body">
              <div className="admin-model-list__meta">
                <Typography.Text strong ellipsis title={model.modelName}>
                  {model.modelName}
                </Typography.Text>
                <span>{formatNumber(model.count)}</span>
              </div>
              <div className="admin-model-list__track">
                <i style={{ width: `${Math.max((model.count / max) * 100, 8)}%` }} />
              </div>
            </div>
            <span className="admin-model-list__percent">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

function TopUsersList({ users }: { users: AdminStats['users']['topUsers'] }) {
  const { t } = useTranslation();
  const max = Math.max(...users.map((user) => user.analysisCount + user.compareCount), 1);

  if (users.length === 0) {
    return (
      <Empty description={t('admin.dashboard.noActivity')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  }

  return (
    <div className="admin-leaderboard">
      {users.slice(0, 6).map((user, index) => {
        const total = user.analysisCount + user.compareCount;
        const initials = (user.name || user.email || '?').slice(0, 1).toUpperCase();
        return (
          <div key={user.userId} className="admin-leaderboard__row">
            <div className="admin-leaderboard__position">{index + 1}</div>
            <div className="admin-leaderboard__avatar">{initials}</div>
            <div className="admin-leaderboard__person">
              <Typography.Text strong ellipsis title={user.name}>
                {user.name}
              </Typography.Text>
              <Typography.Text type="secondary" ellipsis title={user.email}>
                {user.email}
              </Typography.Text>
              <div className="admin-leaderboard__track">
                <i style={{ width: `${Math.max((total / max) * 100, 8)}%` }} />
              </div>
            </div>
            <div className="admin-leaderboard__stats">
              <strong>{formatNumber(total)}</strong>
              <span>
                {t('admin.dashboard.analyses')} {user.analysisCount} ·{' '}
                {t('admin.dashboard.compares')} {user.compareCount}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeedbackOverview({ feedback }: { feedback: AdminStats['feedback'] }) {
  const { t } = useTranslation();
  const positiveRate = feedback.positiveRate ?? 0;

  if (feedback.total === 0) {
    return (
      <Empty
        description={t('admin.dashboard.noFeedbackPeriod')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="admin-feedback-overview">
      <div
        className="admin-feedback-ring"
        style={{
          background: `conic-gradient(${STATUS_COLORS.success} ${positiveRate * 3.6}deg, ${STATUS_COLORS.failed} 0deg)`,
        }}
      >
        <div>
          <strong>{feedback.positiveRate !== null ? `${feedback.positiveRate}%` : 'N/A'}</strong>
          <span>{t('admin.dashboard.positiveRate')}</span>
        </div>
      </div>
      <div className="admin-feedback-counters">
        <div>
          <SmileOutlined />
          <span>{t('admin.dashboard.helpful')}</span>
          <strong>{formatNumber(feedback.thumbsUp)}</strong>
        </div>
        <div>
          <FrownOutlined />
          <span>{t('admin.dashboard.notHelpful')}</span>
          <strong>{formatNumber(feedback.thumbsDown)}</strong>
        </div>
      </div>
      <Typography.Text type="secondary">
        {t('admin.dashboard.submissionsTotal', { count: feedback.total })}
      </Typography.Text>
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
  const periodControlLabels: Record<Period, string> = {
    '24h': t('admin.dashboard.period24hShort'),
    '7d': t('admin.dashboard.period7dShort'),
    '30d': t('admin.dashboard.period30dShort'),
  };

  const pageStyle = {
    '--admin-primary': token.colorPrimary,
    '--admin-bg': token.colorBgLayout,
    '--admin-surface': token.colorBgContainer,
    '--admin-surface-elevated': token.colorBgElevated,
    '--admin-border': token.colorBorderSecondary,
    '--admin-text': token.colorText,
    '--admin-muted': token.colorTextSecondary,
    '--admin-tertiary': token.colorTextTertiary,
    '--admin-shadow': token.boxShadowTertiary,
  } as CSSVars;

  const heroStats = stats
    ? {
        totalRuns: stats.analysis.total + stats.compare.total,
        weightedSuccess: getWeightedSuccess(stats),
        modelCount: stats.modelUsage.length,
        topModel:
          [...stats.modelUsage].sort((a, b) => b.count - a.count)[0]?.modelName ??
          t('admin.dashboard.noModelUsage'),
        busiestDay:
          stats.dailyVolume.reduce<AdminStats['dailyVolume'][number] | null>((busiest, day) => {
            if (!busiest) return day;
            return day.analyses + day.compares > busiest.analyses + busiest.compares
              ? day
              : busiest;
          }, null)?.date ?? t('admin.dashboard.noBusiestDay'),
      }
    : null;

  return (
    <div className="admin-dashboard-page" style={pageStyle}>
      <div className="admin-dashboard-hero">
        <div className="admin-dashboard-hero__content">
          <div className="admin-dashboard-eyebrow">
            <DashboardOutlined />
            {t('admin.dashboard.commandCenter')}
          </div>
          <Typography.Title level={2}>{t('admin.dashboard.title')}</Typography.Title>
          <Typography.Paragraph>{t('admin.dashboard.subtitle')}</Typography.Paragraph>
          <div className="admin-dashboard-hero__chips">
            <span>
              <CalendarOutlined />
              {periodLabels[period]}
            </span>
            <span>
              <ThunderboltOutlined />
              {heroStats
                ? t('admin.dashboard.workflowVolume', { count: heroStats.totalRuns })
                : '--'}
            </span>
            <span>
              <RobotOutlined />
              {heroStats?.topModel ?? '--'}
            </span>
          </div>
        </div>
        <div className="admin-dashboard-hero__control">
          <Segmented
            value={period}
            onChange={(value) => setPeriod(value as Period)}
            options={(Object.keys(periodLabels) as Period[]).map((value) => ({
              value,
              label: periodControlLabels[value],
            }))}
          />
          <div className="admin-hero-signal">
            <div className="admin-hero-signal__label">
              <SafetyCertificateOutlined />
              {t('admin.dashboard.qualitySignal')}
            </div>
            <strong>{heroStats ? `${heroStats.weightedSuccess}%` : '--'}</strong>
            <Progress
              percent={heroStats?.weightedSuccess ?? 0}
              showInfo={false}
              strokeColor={{ '0%': '#14b8a6', '100%': '#f59e0b' }}
              trailColor={token.colorBorderSecondary}
            />
            <div className="admin-hero-signal__meta">
              <span>
                {t('admin.dashboard.modelCoverage')}: {heroStats?.modelCount ?? '--'}
              </span>
              <span>
                {t('admin.dashboard.busiestDay')}: {heroStats?.busiestDay ?? '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-dashboard-loading">
          <Spin size="large" />
        </div>
      ) : !stats ? null : (
        <>
          <div className="admin-metric-grid">
            <MetricCard
              icon={<FileTextOutlined />}
              label={t('admin.dashboard.totalAnalyses')}
              value={formatNumber(stats.analysis.total)}
              meta={t('admin.dashboard.inSelectedWindow')}
              accent="#1677ff"
            />
            <MetricCard
              icon={<CheckCircleOutlined />}
              label={t('admin.dashboard.analysisSuccess')}
              value={`${stats.analysis.successRate}%`}
              meta={t('admin.dashboard.qualitySignal')}
              accent={STATUS_COLORS.success}
            />
            <MetricCard
              icon={<DiffOutlined />}
              label={t('admin.dashboard.totalCompares')}
              value={formatNumber(stats.compare.total)}
              meta={`${stats.compare.successRate}% ${t('admin.dashboard.successRateShort')}`}
              accent="#8b5cf6"
            />
            <MetricCard
              icon={<TeamOutlined />}
              label={t('admin.dashboard.activeUsers')}
              value={formatNumber(stats.users.activeCount)}
              meta={t('admin.dashboard.activeOperators')}
              accent="#f59e0b"
            />
            <MetricCard
              icon={<UserAddOutlined />}
              label={t('admin.dashboard.newUsers')}
              value={formatNumber(stats.users.newCount)}
              meta={periodLabels[period]}
              accent="#06b6d4"
            />
            <MetricCard
              icon={<LikeOutlined />}
              label={t('admin.dashboard.feedbackThumbs')}
              value={
                stats.feedback.positiveRate !== null ? `${stats.feedback.positiveRate}%` : 'N/A'
              }
              meta={t('admin.dashboard.feedbackBreakdown', {
                up: stats.feedback.thumbsUp,
                down: stats.feedback.thumbsDown,
                total: stats.feedback.total,
              })}
              accent="#ec4899"
            />
          </div>

          <div className="admin-dashboard-main-grid">
            <SectionPanel
              title={t('admin.dashboard.dailyVolume')}
              icon={<BarChartOutlined />}
              className="admin-dashboard-panel--trend"
              action={
                <span className="admin-panel-kicker">
                  <RiseOutlined />
                  {t('admin.dashboard.activityWindow')}
                </span>
              }
            >
              <DailyVolumeChart data={stats.dailyVolume} />
            </SectionPanel>

            <SectionPanel
              title={t('admin.dashboard.analysisStatus')}
              icon={<SafetyCertificateOutlined />}
              className="admin-dashboard-panel--status"
            >
              <div className="admin-status-stack">
                <StatusBar
                  title={t('admin.dashboard.analysisStatus')}
                  breakdown={stats.analysis.statusBreakdown}
                />
                <StatusBar
                  title={t('admin.dashboard.compareStatus')}
                  breakdown={stats.compare.statusBreakdown}
                />
              </div>
            </SectionPanel>

            <SectionPanel
              title={t('admin.dashboard.modelUsage')}
              icon={<RobotOutlined />}
              className="admin-dashboard-panel--models"
            >
              <ModelUsageList models={stats.modelUsage} />
            </SectionPanel>

            <SectionPanel
              title={t('admin.dashboard.topUsers')}
              icon={<TrophyOutlined />}
              className="admin-dashboard-panel--leaderboard"
            >
              <TopUsersList users={stats.users.topUsers} />
            </SectionPanel>

            <SectionPanel
              title={t('admin.dashboard.feedbackOverview')}
              icon={<LikeOutlined />}
              className="admin-dashboard-panel--feedback"
            >
              <FeedbackOverview feedback={stats.feedback} />
            </SectionPanel>
          </div>
        </>
      )}
    </div>
  );
}
