import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Divider } from 'antd';
import {
  FileTextOutlined, DiffOutlined, HistoryOutlined,
  SettingOutlined, UserOutlined, LogoutOutlined,
  DashboardOutlined, TeamOutlined, UnorderedListOutlined, ToolOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';

const { Sider, Content, Header } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    clearAuth();
    navigate('/login');
  };

  const userMenuItems = [
    { key: '/analysis', icon: <FileTextOutlined />, label: 'Contract Analysis' },
    { key: '/compare', icon: <DiffOutlined />, label: 'Contract Compare' },
    { key: '/history', icon: <HistoryOutlined />, label: 'My History' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const adminMenuItems = isAdmin
    ? [
        { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/admin/users', icon: <TeamOutlined />, label: 'User Management' },
        { key: '/admin/history', icon: <UnorderedListOutlined />, label: 'All History' },
        { key: '/admin/settings', icon: <ToolOutlined />, label: 'System Settings' },
      ]
    : [];

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220} collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ padding: '20px 16px', color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
          {collapsed ? 'A' : 'Amplify'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={userMenuItems}
          onClick={({ key }) => navigate(key)}
        />
        {isAdmin && (
          <>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '8px 0' }} />
            <div style={{ padding: '4px 16px 8px', color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
              Admin
            </div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={adminMenuItems}
              onClick={({ key }) => navigate(key)}
            />
          </>
        )}
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>{user?.name || user?.email}</Typography.Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, background: '#fff', padding: 24, borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
