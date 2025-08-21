import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { SnackbarProvider } from 'notistack';
import { ConfirmProvider } from 'material-ui-confirm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HelmetProvider } from 'react-helmet-async';

// App components
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './theme';
import AppRoutes from './routes';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { selectThemeMode } from './store/slices/themeSlice';
import { selectIsPageLoading } from './store/slices/uiSlice';

// Utils
import { createTheme } from './theme';

// Styles
import './assets/scss/index.scss';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Main App component
const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  const isPageLoading = useAppSelector(selectIsPageLoading);
  const theme = createTheme(themeMode);

  // Initialize application
  useEffect(() => {
    // Add any initialization logic here
    // For example, check auth status, load user data, etc.
  }, [dispatch]);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <MuiThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                autoHideDuration={5000}
              >
                <ConfirmProvider
                  defaultOptions={{
                    confirmationButtonProps: { autoFocus: true },
                    dialogProps: { maxWidth: 'sm', fullWidth: true },
                    confirmationText: 'Confirm',
                    cancellationText: 'Cancel',
                  }}
                >
                  <ThemeProvider>
                    <CssBaseline />
                    <GlobalStyles
                      styles={{
                        '*': {
                          boxSizing: 'border-box',
                          margin: 0,
                          padding: 0,
                        },
                        html: {
                          height: '100%',
                          width: '100%',
                        },
                        body: {
                          height: '100%',
                          width: '100%',
                          fontFamily: theme.typography.fontFamily,
                          backgroundColor: theme.palette.background.default,
                          color: theme.palette.text.primary,
                          lineHeight: 1.5,
                        },
                        '#root': {
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        },
                        a: {
                          color: theme.palette.primary.main,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        },
                        img: {
                          maxWidth: '100%',
                          height: 'auto',
                        },
                      }}
                    />
                    <Router>
                      <AuthProvider>
                        <AppRoutes />
                      </AuthProvider>
                    </Router>
                  </ThemeProvider>
                </ConfirmProvider>
              </SnackbarProvider>
            </LocalizationProvider>
          </MuiThemeProvider>
        </HelmetProvider>
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      </QueryClientProvider>
    </ReduxProvider>
  );
};

export default App;
