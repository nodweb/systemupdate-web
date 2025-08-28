import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeviceList from './pages/DeviceList';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DeviceDetails from './pages/DeviceDetails';
import Analytics from './pages/Analytics';
import AppManagement from './pages/AppManagement';
import RemoteControl from './pages/RemoteControl';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => (
    <ErrorBoundary>
      <CustomThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                </ProtectedRoute>
              }
              />
              <Route
                path="/devices"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DeviceList />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/devices/:deviceId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DeviceDetails />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apps"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AppManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/remote/:deviceId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RemoteControl />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </CustomThemeProvider>
    </ErrorBoundary>
  );

export default App;