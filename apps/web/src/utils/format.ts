export function localeFromLanguage(language: string) {
  return language.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function formatDateTime(value: string | number | Date, language: string) {
  return new Intl.DateTimeFormat(localeFromLanguage(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDate(value: string | number | Date, language: string) {
  return new Intl.DateTimeFormat(localeFromLanguage(language), {
    dateStyle: 'medium',
  }).format(new Date(value));
}
