import { useEffect, useState } from 'react';
import { Card, Progress, Space, Spin, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';

/** Any valid translation key (typed against the `translation` resource). */
type I18nKey = ParseKeys;

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A time-based stage: shown while `elapsed` (seconds) is below `until`. */
export interface ProgressStage {
  until: number;
  key: I18nKey;
}

interface TimedProgressProps {
  running: boolean;
  /** i18n key for the panel title. */
  titleKey: I18nKey;
  /** i18n key for the footer hint. */
  hintKey: I18nKey;
  /** Stages ordered by ascending `until`; the last should use `until: Infinity`. */
  stages: ProgressStage[];
  /**
   * Easing constant for the bar: percent = (1 - e^(-elapsed/tau)) * 95.
   * Smaller = the bar fills faster. Pick ~half the expected duration.
   */
  tau?: number;
  /** i18n key for the elapsed-time label; interpolated with `{ time }`. */
  elapsedKey?: I18nKey;
}

/**
 * Activity feedback for a synchronous request whose real progress the backend
 * doesn't report. Shows honest signals — a live elapsed timer, a rotating
 * description keyed off elapsed time, and a bar that eases toward (but never
 * reaches) 100% until the request actually resolves. Renders nothing when idle.
 */
export default function TimedProgress({
  running,
  titleKey,
  hintKey,
  stages,
  tau = 40,
  elapsedKey = 'analysis.progress.elapsed',
}: TimedProgressProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!running) return null;

  const stage = stages.find((s) => elapsed < s.until) ?? stages[stages.length - 1];
  const percent = Math.round((1 - Math.exp(-elapsed / tau)) * 95);

  return (
    <Card
      size="small"
      style={{ background: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Space size={10}>
          <Spin size="small" />
          <Typography.Text strong>{t(titleKey)}</Typography.Text>
          <Typography.Text type="secondary">
            {t(elapsedKey, { time: formatElapsed(elapsed) })}
          </Typography.Text>
        </Space>
        <Progress percent={percent} status="active" showInfo={false} />
        <Typography.Text>{t(stage.key)}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t(hintKey)}
        </Typography.Text>
      </Space>
    </Card>
  );
}
