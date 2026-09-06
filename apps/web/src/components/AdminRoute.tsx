import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// Always nested inside ProtectedRoute, so user is guaranteed non-null here.
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin' && user?.role !== 'super_admin')
    return <Navigate to="/analysis" replace />;
  return <>{children}</>;
}
