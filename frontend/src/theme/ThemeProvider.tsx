import React, { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { useAppSelector } from '../app/store';
import createTheme from './index';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get theme mode from Redux store (light/dark)
  const { mode } = useAppSelector((state) => state.theme);

  // Create theme with the selected mode
  const theme = useMemo(() => {
    const baseTheme = createTheme();
    return mode === 'dark'
      ? {
          ...baseTheme,
          palette: {
            ...baseTheme.palette,
            mode: 'dark',
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: 'rgba(255, 255, 255, 0.87)',
              secondary: 'rgba(255, 255, 255, 0.7)',
              disabled: 'rgba(255, 255, 255, 0.5)',
            },
          },
        }
      : baseTheme;
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <EmotionThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </EmotionThemeProvider>
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
