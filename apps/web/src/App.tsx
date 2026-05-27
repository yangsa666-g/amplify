import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp, theme as antdTheme, Spin } from 'antd';
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

// Pages are lazy-loaded so each route ships as its own chunk, keeping the
// initial bundle small (heavy deps like react-markdown / react-diff-viewer
// only load when their route is visited).
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminHistoryPage = lazy(() => import('./pages/AdminHistoryPage'));
const AdminSystemSettingsPage = lazy(() => import('./pages/AdminSystemSettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PageFallback() {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
    >
      <Spin size="large" />
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
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
              <Route
                path="analysis"
                element={
                  <ErrorBoundary>
                    <AnalysisPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="compare"
                element={
                  <ErrorBoundary>
                    <ComparePage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="history"
                element={
                  <ErrorBoundary>
                    <HistoryPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="settings"
                element={
                  <ErrorBoundary>
                    <SettingsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="profile"
                element={
                  <ErrorBoundary>
                    <ProfilePage />
                  </ErrorBoundary>
                }
              />

              {/* Admin routes */}
              <Route
                path="admin/dashboard"
                element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <AdminDashboardPage />
                    </ErrorBoundary>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <AdminUsersPage />
                    </ErrorBoundary>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/history"
                element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <AdminHistoryPage />
                    </ErrorBoundary>
                  </AdminRoute>
                }
              />
              <Route
                path="admin/settings"
                element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <AdminSystemSettingsPage />
                    </ErrorBoundary>
                  </AdminRoute>
                }
              />
              <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/analysis" replace />} />
          </Routes>
        </Suspense>
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
