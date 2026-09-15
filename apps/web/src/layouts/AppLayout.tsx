import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Typography,
  Divider,
  Badge,
  List,
  Popover,
  Button,
  Spin,
  Drawer,
  Grid,
  theme,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  DiffOutlined,
  HistoryOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  ToolOutlined,
  BellOutlined,
  CheckOutlined,
  MenuOutlined,
  DownloadOutlined,
  GlobalOutlined,
  BulbOutlined,
  BulbFilled,
  DesktopOutlined,
  DownOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useUiStore, type ThemeMode } from '../stores/uiStore';
import { logout } from '../api/auth';
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../api/notifications';
import { getOrganizations } from '../api/organizations';
import { usePwaInstallPrompt } from '../pwa/usePwaInstallPrompt';
import Logo from '../components/Logo';
import type { Notification } from '../types';

const { Sider, Content, Header, Footer } = Layout;

const SIDER_BG = '#001529';
const PLATFORM_CONTEXT_VALUE = '__platform__';
const ORGANIZATION_MENU_KEY_PREFIX = 'organization:';

function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const typeIcon = (type: Notification['type']) => {
    if (type === 'template_request_approved') return '✅';
    if (type === 'template_request_rejected') return '❌';
    return '📋';
  };

  const openNotificationTarget = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.type === 'template_request_submitted') {
      navigate('/admin/settings?tab=requests');
    } else {
      navigate('/settings');
    }
  };

  const content = (
    <div style={{ width: 'min(360px, 80vw)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Typography.Text strong>{t('notifications.title')}</Typography.Text>
        {(countData?.count ?? 0) > 0 && (
          <Button
            size="small"
            type="link"
            onClick={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
          >
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Typography.Text
          type="secondary"
          style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}
        >
          {t('notifications.empty')}
        </Typography.Text>
      ) : (
        <List
          dataSource={notifications.slice(0, 6)}
          renderItem={(n) => (
            <List.Item
              onClick={() => openNotificationTarget(n)}
              style={{
                padding: '8px 4px',
                background: n.isRead ? undefined : token.colorSuccessBg,
                borderRadius: 4,
                cursor: 'pointer',
              }}
              extra={
                !n.isRead && (
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckOutlined />}
                    aria-label={t('notifications.markRead')}
                    title={t('notifications.markRead')}
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(n.id);
                    }}
                  />
                )
              }
            >
              <List.Item.Meta
                avatar={<span style={{ fontSize: 18 }}>{typeIcon(n.type)}</span>}
                title={<Typography.Text strong={!n.isRead}>{n.title}</Typography.Text>}
                description={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {n.body}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
          style={{ maxHeight: 400, overflowY: 'auto' }}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) qc.invalidateQueries({ queryKey: ['notifications'] });
      }}
      placement="bottomRight"
    >
      <Badge count={countData?.count ?? 0} size="small" style={{ cursor: 'pointer' }}>
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isAdminDashboard = location.pathname === '/admin/dashboard';

  const queryClient = useQueryClient();
  const { user, clearAuth, refreshToken, selectedOrganizationId, setSelectedOrganizationId } =
    useAuthStore();
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const { canInstall, promptInstall } = usePwaInstallPrompt();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations().then((res) => res.data),
    enabled: isSuperAdmin,
  });
  const currentOrganizationName = isSuperAdmin
    ? selectedOrganizationId
      ? organizations.find((organization) => organization.id === selectedOrganizationId)?.name
      : t('common.platformDefaults')
    : user?.organizationName;

  const installApp = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') message.success(t('pwa.installAccepted'));
  };

  const handleLogout = async () => {
    try {
      await logout(refreshToken);
    } catch {}
    clearAuth();
    navigate('/login');
  };

  const handleOrganizationChange = (value: string) => {
    setSelectedOrganizationId(value === PLATFORM_CONTEXT_VALUE ? null : value);
    void queryClient.invalidateQueries();
  };

  const userMenuItems = [
    { key: '/analysis', icon: <FileTextOutlined />, label: t('nav.analysis') },
    { key: '/compare', icon: <DiffOutlined />, label: t('nav.compare') },
    { key: '/history', icon: <HistoryOutlined />, label: t('nav.history') },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
  ];

  const adminMenuItems = isAdmin
    ? [
        { key: '/admin/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
        { key: '/admin/users', icon: <TeamOutlined />, label: t('nav.users') },
        { key: '/admin/history', icon: <UnorderedListOutlined />, label: t('nav.allHistory') },
        { key: '/admin/audit', icon: <AuditOutlined />, label: t('nav.audit') },
        { key: '/admin/settings', icon: <ToolOutlined />, label: t('nav.systemSettings') },
      ]
    : [];

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('nav.profile'),
    },
    ...(isSuperAdmin
      ? [
          {
            key: 'organization',
            icon: <TeamOutlined />,
            label: t('nav.switchOrganization'),
            children: [
              {
                key: `${ORGANIZATION_MENU_KEY_PREFIX}${PLATFORM_CONTEXT_VALUE}`,
                label: t('common.platformDefaults'),
              },
              ...organizations.map((org) => ({
                key: `${ORGANIZATION_MENU_KEY_PREFIX}${org.id}`,
                label: org.status === 'disabled' ? `${org.name} (disabled)` : org.name,
                disabled: org.status === 'disabled',
              })),
            ],
          },
        ]
      : []),
    ...(canInstall
      ? [
          {
            key: 'pwa:install',
            icon: <DownloadOutlined />,
            label: t('pwa.install'),
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'theme-group',
      type: 'group',
      label: t('theme.label'),
      children: [
        { key: 'theme:light', icon: <BulbOutlined />, label: t('theme.light') },
        { key: 'theme:dark', icon: <BulbFilled />, label: t('theme.dark') },
        { key: 'theme:system', icon: <DesktopOutlined />, label: t('theme.system') },
      ],
    },
    { type: 'divider' },
    {
      key: 'language-group',
      type: 'group',
      label: t('language.label'),
      children: [
        { key: 'lang:en', icon: <GlobalOutlined />, label: t('language.en') },
        { key: 'lang:zh', icon: <GlobalOutlined />, label: t('language.zh') },
      ],
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), danger: true },
  ];

  const userMenu: MenuProps = {
    selectable: true,
    selectedKeys: [
      `theme:${themeMode}`,
      `lang:${lang}`,
      `${ORGANIZATION_MENU_KEY_PREFIX}${selectedOrganizationId ?? PLATFORM_CONTEXT_VALUE}`,
    ],
    items: userDropdownItems,
    onClick: ({ key }) => {
      if (key === 'profile') navigate('/profile');
      if (key === 'logout') void handleLogout();
      if (key === 'pwa:install') void installApp();
      if (key.startsWith('theme:')) setThemeMode(key.slice(6) as ThemeMode);
      if (key.startsWith('lang:')) void i18n.changeLanguage(key.slice(5));
      if (key.startsWith(ORGANIZATION_MENU_KEY_PREFIX)) {
        handleOrganizationChange(key.slice(ORGANIZATION_MENU_KEY_PREFIX.length));
      }
    },
  };

  const handleNav = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  // Sidebar contents (logo + menus), shared between the desktop Sider and the mobile Drawer.
  const sideNav = (showCollapsedLogo: boolean) => (
    <>
      <div
        style={{
          padding: '18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Logo size={28} style={{ flexShrink: 0 }} />
        {!showCollapsedLogo && (
          <span
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t('common.appName')}
          </span>
        )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={userMenuItems}
        onClick={({ key }) => handleNav(key)}
      />
      {isAdmin && (
        <>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '8px 0' }} />
          <div
            style={{
              padding: '4px 16px 8px',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {t('nav.admin')}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={adminMenuItems}
            onClick={({ key }) => handleNav(key)}
          />
        </>
      )}
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider theme="dark" width={220} collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          {sideNav(collapsed)}
        </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={240}
          closable={false}
          styles={{ body: { padding: 0, background: SIDER_BG } }}
        >
          {sideNav(false)}
        </Drawer>
      )}
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isMobile && (
              <>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Menu"
                />
                <Logo size={24} style={{ flexShrink: 0 }} />
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {t('common.appName')}
                </Typography.Text>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <NotificationBell />
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Button
                type="text"
                aria-label={t('nav.profile')}
                title={t('nav.profile')}
                style={{
                  height: 40,
                  padding: isMobile ? '0 6px' : '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 8,
                }}
              >
                <Avatar icon={<UserOutlined />} />
                {!isMobile && (
                  <div
                    style={{
                      display: 'flex',
                      minWidth: 0,
                      flexDirection: 'column',
                      lineHeight: 1.25,
                    }}
                  >
                    <Typography.Text ellipsis>{user?.email}</Typography.Text>
                    {currentOrganizationName && (
                      <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                        {currentOrganizationName}
                      </Typography.Text>
                    )}
                  </div>
                )}
                <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            flex: 1,
            margin: isMobile ? 8 : 24,
            background: isAdminDashboard ? 'transparent' : token.colorBgContainer,
            padding: isAdminDashboard ? 0 : isMobile ? 12 : 24,
            borderRadius: isAdminDashboard ? 0 : 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
        <Footer
          style={{
            padding: isMobile ? '16px 12px' : '20px 24px',
            color: token.colorTextSecondary,
            background: 'transparent',
            textAlign: 'center',
          }}
        >
          Built by Sa Yang with ❤️.{' '}
          <Typography.Link
            href="https://github.com/yangsa666-g/amplify"
            target="_blank"
            rel="noopener noreferrer"
          >
            Star it on Github
          </Typography.Link>
        </Footer>
      </Layout>
    </Layout>
  );
}
