import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
    </QueryClientProvider>
  );
}
