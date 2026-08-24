import { Space, Tag, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../utils/duration';
import type { RunTimings as RunTimingsData } from '../types';

/**
 * Compact, read-only display of recorded run durations (OCR / field extraction
 * / risk analysis). Renders nothing when no timing is available. Field
 * extraction and risk analysis run in parallel, so their durations overlap
 * rather than sum.
 */
export default function RunTimings({ timings }: { timings?: RunTimingsData | null }) {
  const { t } = useTranslation();
  if (!timings) return null;

  const items = [
    { label: t('timings.ocr'), value: formatDuration(timings.ocrMs) },
    { label: t('timings.fieldExtraction'), value: formatDuration(timings.fieldExtractionMs) },
    { label: t('timings.riskAnalysis'), value: formatDuration(timings.riskAnalysisMs) },
    { label: t('timings.comparisonAnalysis'), value: formatDuration(timings.analysisMs) },
  ].filter((it): it is { label: string; value: string } => it.value !== null);

  if (items.length === 0) return null;

  return (
    <Space size={[6, 4]} wrap>
      <Typography.Text type="secondary">
        <ClockCircleOutlined /> {t('timings.title')}
      </Typography.Text>
      {items.map((it) => (
        <Tag key={it.label} style={{ marginInlineEnd: 0 }}>
          {it.label} {it.value}
        </Tag>
      ))}
    </Space>
  );
}
