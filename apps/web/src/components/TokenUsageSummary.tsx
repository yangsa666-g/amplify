import { Collapse, Space, Statistic, Tag, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { AnalysisTokenUsage, TokenUsage } from '../types';

function UsageDetails({
  usage,
  includeCore = false,
}: {
  usage: TokenUsage;
  includeCore?: boolean;
}) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    input: t('tokens.input'),
    output: t('tokens.output'),
    total: t('tokens.total'),
    cachedInputTokens: t('tokens.cachedInputTokens'),
    reasoningTokens: t('tokens.reasoningTokens'),
    cacheCreationInputTokens: t('tokens.cacheCreationInputTokens'),
    cacheReadInputTokens: t('tokens.cacheReadInputTokens'),
  };
  const details: Array<[string, number | undefined]> = [
    ...(includeCore
      ? [
          ['input', usage.inputTokens] as [string, number],
          ['output', usage.outputTokens] as [string, number],
          ['total', usage.totalTokens] as [string, number],
        ]
      : []),
    ['cachedInputTokens', usage.cachedInputTokens],
    ['reasoningTokens', usage.reasoningTokens],
    ['cacheCreationInputTokens', usage.cacheCreationInputTokens],
    ['cacheReadInputTokens', usage.cacheReadInputTokens],
  ].filter((item): item is [string, number] => item[1] !== undefined);

  return details.length > 0 ? (
    <Space wrap>
      {details.map(([key, value]) => (
        <Tag key={key}>
          {labels[key]}: {value!.toLocaleString()}
        </Tag>
      ))}
    </Space>
  ) : null;
}

export default function TokenUsageSummary({
  usage,
}: {
  usage?: TokenUsage | AnalysisTokenUsage | null;
}) {
  const { t } = useTranslation();
  if (!usage) return <Typography.Text type="secondary">{t('tokens.notRecorded')}</Typography.Text>;

  const stages = 'stages' in usage ? usage.stages : null;
  const hasProviderDetails =
    usage.cachedInputTokens !== undefined ||
    usage.reasoningTokens !== undefined ||
    usage.cacheCreationInputTokens !== undefined ||
    usage.cacheReadInputTokens !== undefined;
  const hasDetails = hasProviderDetails || !!stages?.fieldExtraction || !!stages?.riskAnalysis;
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Space wrap size={20}>
        <Typography.Text type="secondary">
          <ThunderboltOutlined /> {t('tokens.title')}
        </Typography.Text>
        <Statistic title={t('tokens.total')} value={usage.totalTokens} groupSeparator="," />
        <Statistic title={t('tokens.input')} value={usage.inputTokens} groupSeparator="," />
        <Statistic title={t('tokens.output')} value={usage.outputTokens} groupSeparator="," />
      </Space>
      {hasDetails && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'details',
              label: t('tokens.details'),
              children: (
                <Space direction="vertical" size={8}>
                  {hasProviderDetails && <UsageDetails usage={usage} />}
                  {stages?.fieldExtraction && (
                    <div>
                      <Typography.Text strong>{t('tokens.fieldExtraction')}</Typography.Text>
                      <br />
                      <UsageDetails usage={stages.fieldExtraction} includeCore />
                    </div>
                  )}
                  {stages?.riskAnalysis && (
                    <div>
                      <Typography.Text strong>{t('tokens.riskAnalysis')}</Typography.Text>
                      <br />
                      <UsageDetails usage={stages.riskAnalysis} includeCore />
                    </div>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </Space>
  );
}
