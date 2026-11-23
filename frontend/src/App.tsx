import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AppLayout } from './layouts/AppLayout.js';

// Auth Pages
import { Login } from './pages/auth/Login.js';
import { Register } from './pages/auth/Register.js';
import { ForgotPassword } from './pages/auth/ForgotPassword.js';
import { ResetPassword } from './pages/auth/ResetPassword.js';

// Dashboard Page
import { Dashboard } from './pages/Dashboard.js';

// Product Pages
import { ProductList } from './pages/products/ProductList.js';
import { AddProduct } from './pages/products/AddProduct.js';
import { EditProduct } from './pages/products/EditProduct.js';
import { ProductDetails } from './pages/products/ProductDetails.js';

// Inventory & Stock Pages
import { InventoryTransactions } from './pages/inventory/InventoryTransactions.js';

// Notification Page
import { Notifications } from './pages/Notifications.js';

// User Pages
import { UserProfile } from './pages/users/UserProfile.js';
import { UserManagement } from './pages/users/UserManagement.js';

// Audit Logs Page
import { AuditLogs } from './pages/audit/AuditLogs.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Products */}
              <Route path="products" element={<ProductList />} />
              <Route
                path="products/new"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AddProduct />
                  </ProtectedRoute>
                }
              />
              <Route path="products/:id" element={<ProductDetails />} />
              <Route
                path="products/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <EditProduct />
                  </ProtectedRoute>
                }
              />

              {/* Inventory Stock Movements */}
              <Route path="inventory/transactions" element={<InventoryTransactions />} />

              {/* In-App Notifications */}
              <Route path="notifications" element={<Notifications />} />

              {/* Profile */}
              <Route path="profile" element={<UserProfile />} />

              {/* User Management (Admin & Super Admin) */}
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              {/* Audit Logs (Admin & Super Admin) */}
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
