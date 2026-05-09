import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import {
  FileTextOutlined, DiffOutlined, HistoryOutlined,
  SettingOutlined, UserOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';

const { Sider, Content, Header } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    clearAuth();
    navigate('/login');
  };

  const menuItems = [
    { key: '/analysis', icon: <FileTextOutlined />, label: 'Contract Analysis' },
    { key: '/compare', icon: <DiffOutlined />, label: 'Contract Compare' },
    { key: '/history', icon: <HistoryOutlined />, label: 'History' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ padding: '20px 16px', color: '#fff', fontWeight: 700, fontSize: 15 }}>
          Contract AI Review
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
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
