import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useTranslation } from 'react-i18next';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import BodyChrome from './components/BodyChrome';
import { MessageBridge } from './utils/message';
import { useIsDark } from './hooks/useIsDark';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AnalysisPage from './pages/AnalysisPage';
import ComparePage from './pages/ComparePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminHistoryPage from './pages/AdminHistoryPage';
import AdminSystemSettingsPage from './pages/AdminSystemSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppRoutes() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/analysis" replace />} />
            <Route path="analysis" element={<ErrorBoundary><AnalysisPage /></ErrorBoundary>} />
            <Route path="compare" element={<ErrorBoundary><ComparePage /></ErrorBoundary>} />
            <Route path="history" element={<ErrorBoundary><HistoryPage /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            <Route path="profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />

            {/* Admin routes */}
            <Route
              path="admin/dashboard"
              element={<AdminRoute><ErrorBoundary><AdminDashboardPage /></ErrorBoundary></AdminRoute>}
            />
            <Route
              path="admin/users"
              element={<AdminRoute><ErrorBoundary><AdminUsersPage /></ErrorBoundary></AdminRoute>}
            />
            <Route
              path="admin/history"
              element={<AdminRoute><ErrorBoundary><AdminHistoryPage /></ErrorBoundary></AdminRoute>}
            />
            <Route
              path="admin/settings"
              element={<AdminRoute><ErrorBoundary><AdminSystemSettingsPage /></ErrorBoundary></AdminRoute>}
            />
            <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/analysis" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function ThemedRoot() {
  const isDark = useIsDark();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? zhCN : enUS;

  return (
    <ConfigProvider
      locale={locale}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff', borderRadius: 6 },
      }}
    >
      <AntApp>
        <MessageBridge />
        <BodyChrome isDark={isDark} />
        <AppRoutes />
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemedRoot />
    </QueryClientProvider>
  );
}
