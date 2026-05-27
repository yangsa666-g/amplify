import { useEffect, useState } from 'react';
import { Card, Progress, Space, Spin, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Activity feedback for the (synchronous) analysis request. The backend does
 * not report real progress, so this shows honest signals — a live elapsed
 * timer, a rotating description of what's happening, and an asymptotic bar that
 * eases toward (but never reaches) 100% until the request actually resolves.
 */
export default function AnalysisProgress({ running }: { running: boolean }) {
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

  const stage =
    elapsed < 5
      ? t('analysis.progress.reading')
      : elapsed < 30
        ? t('analysis.progress.working')
        : elapsed < 75
          ? t('analysis.progress.stillWorking')
          : t('analysis.progress.finalizing');

  // Eases toward ~95% so the bar always moves but never implies completion.
  const percent = Math.round((1 - Math.exp(-elapsed / 40)) * 95);

  return (
    <Card
      size="small"
      style={{ background: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Space size={10}>
          <Spin size="small" />
          <Typography.Text strong>{t('analysis.progress.title')}</Typography.Text>
          <Typography.Text type="secondary">
            {t('analysis.progress.elapsed', { time: formatElapsed(elapsed) })}
          </Typography.Text>
        </Space>
        <Progress percent={percent} status="active" showInfo={false} />
        <Typography.Text>{stage}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('analysis.progress.hint')}
        </Typography.Text>
      </Space>
    </Card>
  );
}
