import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark';

export interface ThemeState {
  mode: ThemeMode;
  direction: 'ltr' | 'rtl';
  responsiveFontSizes: boolean;
  roundedCorners: boolean;
}

// Load theme settings from localStorage or use defaults
const loadThemeSettings = (): ThemeState => {
  const savedSettings = localStorage.getItem('themeSettings');
  
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch (error) {
      console.error('Failed to parse theme settings', error);
    }
  }
  
  // Default settings
  return {
    mode: 'light',
    direction: 'ltr',
    responsiveFontSizes: true,
    roundedCorners: true,
  };
};

const initialState: ThemeState = loadThemeSettings();

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      saveThemeSettings(state);
    },
    toggleThemeMode: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      saveThemeSettings(state);
    },
    setDirection: (state, action: PayloadAction<'ltr' | 'rtl'>) => {
      state.direction = action.payload;
      document.dir = action.payload;
      saveThemeSettings(state);
    },
    toggleDirection: (state) => {
      state.direction = state.direction === 'ltr' ? 'rtl' : 'ltr';
      document.dir = state.direction;
      saveThemeSettings(state);
    },
    setResponsiveFontSizes: (state, action: PayloadAction<boolean>) => {
      state.responsiveFontSizes = action.payload;
      saveThemeSettings(state);
    },
    setRoundedCorners: (state, action: PayloadAction<boolean>) => {
      state.roundedCorners = action.payload;
      saveThemeSettings(state);
    },
    resetTheme: (state) => {
      const defaultSettings = {
        mode: 'light',
        direction: 'ltr',
        responsiveFontSizes: true,
        roundedCorners: true,
      };
      
      Object.assign(state, defaultSettings);
      document.dir = 'ltr';
      saveThemeSettings(state);
    },
  },
});

// Helper function to save theme settings to localStorage
function saveThemeSettings(settings: ThemeState) {
  try {
    localStorage.setItem('themeSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save theme settings', error);
  }
}

export const {
  setThemeMode,
  toggleThemeMode,
  setDirection,
  toggleDirection,
  setResponsiveFontSizes,
  setRoundedCorners,
  resetTheme,
} = themeSlice.actions;

export const selectThemeMode = (state: { theme: ThemeState }) => state.theme.mode;
export const selectThemeDirection = (state: { theme: ThemeState }) => state.theme.direction;
export const selectResponsiveFontSizes = (state: { theme: ThemeState }) =>
  state.theme.responsiveFontSizes;
export const selectRoundedCorners = (state: { theme: ThemeState }) => state.theme.roundedCorners;

export default themeSlice.reducer;
