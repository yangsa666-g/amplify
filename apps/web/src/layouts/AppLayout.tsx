import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Divider, Badge, List, Popover, Button, Spin, Drawer, Grid, theme } from 'antd';
import {
  FileTextOutlined, DiffOutlined, HistoryOutlined,
  SettingOutlined, UserOutlined, LogoutOutlined,
  DashboardOutlined, TeamOutlined, UnorderedListOutlined, ToolOutlined,
  BellOutlined, CheckOutlined, MenuOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../api/notifications';
import HeaderControls from '../components/HeaderControls';
import type { Notification } from '../types';

const { Sider, Content, Header } = Layout;

const SIDER_BG = '#001529';

function NotificationBell() {
  const qc = useQueryClient();
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

  const content = (
    <div style={{ width: 'min(360px, 80vw)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong>{t('notifications.title')}</Typography.Text>
        {(countData?.count ?? 0) > 0 && (
          <Button size="small" type="link" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
      ) : notifications.length === 0 ? (
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>{t('notifications.empty')}</Typography.Text>
      ) : (
        <List
          dataSource={notifications.slice(0, 6)}
          renderItem={(n) => (
            <List.Item
              style={{ padding: '8px 4px', background: n.isRead ? undefined : token.colorSuccessBg, borderRadius: 4 }}
              extra={
                !n.isRead && (
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckOutlined />}
                    onClick={() => markReadMutation.mutate(n.id)}
                  />
                )
              }
            >
              <List.Item.Meta
                avatar={<span style={{ fontSize: 18 }}>{typeIcon(n.type)}</span>}
                title={<Typography.Text strong={!n.isRead}>{n.title}</Typography.Text>}
                description={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{n.body}</Typography.Text>}
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
      onOpenChange={(v) => { setOpen(v); if (v) qc.invalidateQueries({ queryKey: ['notifications'] }); }}
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
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { user, clearAuth, refreshToken } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try { await logout(refreshToken); } catch {}
    clearAuth();
    navigate('/login');
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
        { key: '/admin/settings', icon: <ToolOutlined />, label: t('nav.systemSettings') },
      ]
    : [];

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: t('nav.profile'), onClick: () => navigate('/profile') },
      { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), onClick: handleLogout },
    ],
  };

  const handleNav = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  // Sidebar contents (logo + menus), shared between the desktop Sider and the mobile Drawer.
  const sideNav = (showCollapsedLogo: boolean) => (
    <>
      <div style={{ padding: '20px 16px', color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
        {showCollapsedLogo ? t('common.appName').charAt(0) : t('common.appName')}
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
          <div style={{ padding: '4px 16px 8px', color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
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
                <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="Menu" />
                <Typography.Text strong style={{ fontSize: 16 }}>{t('common.appName')}</Typography.Text>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <HeaderControls />
            <NotificationBell />
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                {!isMobile && <Typography.Text>{user?.name || user?.email}</Typography.Text>}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? 8 : 24,
            background: token.colorBgContainer,
            padding: isMobile ? 12 : 24,
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
