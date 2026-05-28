import type { TFunction } from 'i18next';

export function templateDisplayName(t: TFunction, name: string) {
  const copySuffix = t('templateNames.copySuffix');
  const label = name
    .replace(/^Default Contract Fields/, t('templateNames.defaultContractFields'))
    .replace(/^Default Risk Analysis Prompt/, t('templateNames.defaultRiskAnalysisPrompt'))
    .replace(/\(copy\)/g, copySuffix);

  return copySuffix.startsWith('（') ? label.replace(/\s+（/g, '（') : label;
}
