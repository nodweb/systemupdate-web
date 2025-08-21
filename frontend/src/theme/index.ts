import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { red } from '@mui/material/colors';

declare module '@mui/material/styles' {
  interface Theme {
    customShadows: {
      card: string;
      dialog: string;
      dropdown: string;
    };
  }
  // Allow configuration using `createTheme`
  interface ThemeOptions {
    customShadows?: {
      card?: string;
      dialog?: string;
      dropdown?: string;
    };
  }
}

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
      light: '#6573c3',
      dark: '#2c387e',
      contrastText: '#fff',
    },
    secondary: {
      main: '#f50057',
      light: '#f73378',
      dark: '#ab003c',
      contrastText: '#fff',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px 0 rgba(23, 70, 161, 0.11)',
          borderRadius: 16,
          padding: 16,
        },
      },
    },
  },
  customShadows: {
    card: '0 2px 10px 0 rgba(23, 70, 161, 0.11)',
    dialog: '0 10px 30px 0 rgba(0, 0, 0, 0.12)',
    dropdown: '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
  },
});

export default responsiveFontSizes(theme);
