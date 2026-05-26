import { useEffect } from 'react';
import { theme } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * Syncs document-level chrome with the active theme/language:
 * the page background (behind the Layout), native color-scheme (form controls,
 * scrollbars), the <html lang> attribute, and the document title.
 */
export default function BodyChrome({ isDark }: { isDark: boolean }) {
  const { token } = theme.useToken();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.body.style.backgroundColor = token.colorBgLayout;
    document.body.style.color = token.colorText;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [token.colorBgLayout, token.colorText, isDark]);

  useEffect(() => {
    document.documentElement.lang = i18n.language.startsWith('zh') ? 'zh-CN' : 'en';
    document.title = t('common.appFullName');
  }, [t, i18n.language]);

  return null;
}
