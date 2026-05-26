import type { ReactNode } from 'react';
import { Dropdown, Button } from 'antd';
import { GlobalOutlined, BulbOutlined, BulbFilled, DesktopOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUiStore, type ThemeMode } from '../stores/uiStore';

const themeIcon: Record<ThemeMode, ReactNode> = {
  light: <BulbOutlined />,
  dark: <BulbFilled />,
  system: <DesktopOutlined />,
};

/** Theme (light/dark/system) and language (EN/中文) switchers for the header. */
export default function HeaderControls() {
  const { t, i18n } = useTranslation();
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          selectable: true,
          selectedKeys: [themeMode],
          items: [
            { key: 'light', icon: <BulbOutlined />, label: t('theme.light') },
            { key: 'dark', icon: <BulbFilled />, label: t('theme.dark') },
            { key: 'system', icon: <DesktopOutlined />, label: t('theme.system') },
          ],
          onClick: ({ key }) => setThemeMode(key as ThemeMode),
        }}
      >
        <Button type="text" icon={themeIcon[themeMode]} aria-label={t('theme.label')} title={t('theme.label')} />
      </Dropdown>
      <Dropdown
        trigger={['click']}
        menu={{
          selectable: true,
          selectedKeys: [lang],
          items: [
            { key: 'en', label: t('language.en') },
            { key: 'zh', label: t('language.zh') },
          ],
          onClick: ({ key }) => void i18n.changeLanguage(key),
        }}
      >
        <Button type="text" icon={<GlobalOutlined />} aria-label={t('language.label')} title={t('language.label')} />
      </Dropdown>
    </>
  );
}
