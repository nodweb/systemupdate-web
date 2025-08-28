import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthContext } from '../contexts/AuthContext';

function TestComponent() {
  return <div>Dashboard</div>
}

describe('ProtectedRoute', () => {
  it('renders children if authenticated', () => {
    render(
      <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: {}, token: 'token', login: jest.fn(), logout: jest.fn(), register: jest.fn(), isLoading: false }}>
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('redirects to /login if not authenticated', () => {
    render(
      <AuthContext.Provider value={{ isAuthenticated: false, isLoading: false, user: null, token: null, login: jest.fn(), logout: jest.fn(), register: jest.fn(), isLoading: false }}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    // چون Navigate رندر نمی‌شود، می‌توانیم انتظار داشته باشیم که Dashboard نمایش داده نشود
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows loading indicator if isLoading', () => {
    render(
      <AuthContext.Provider value={{ isAuthenticated: false, isLoading: true, user: null, token: null, login: jest.fn(), logout: jest.fn(), register: jest.fn(), isLoading: true }}>
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
}); 