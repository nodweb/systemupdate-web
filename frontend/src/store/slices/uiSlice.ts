import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  autoHideDuration?: number;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

interface UIState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  notifications: Notification[];
  isPageLoading: boolean;
  pageTitle: string;
  pageSubtitle?: string;
  pageBreadcrumbs?: Array<{ title: string; href?: string }>;
  dialog: {
    open: boolean;
    title?: string;
    content?: React.ReactNode;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    fullWidth?: boolean;
    fullScreen?: boolean;
    onClose?: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    disableBackdropClick?: boolean;
    disableEscapeKeyDown?: boolean;
  };
  drawer: {
    open: boolean;
    anchor?: 'left' | 'right' | 'top' | 'bottom';
    width?: number | string;
    content?: React.ReactNode;
    onClose?: () => void;
  };
}

const initialState: UIState = {
  sidebarOpen: true,
  mobileSidebarOpen: false,
  notifications: [],
  isPageLoading: false,
  pageTitle: '',
  dialog: {
    open: false,
  },
  drawer: {
    open: false,
    anchor: 'right',
    width: 400,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileSidebarOpen = action.payload;
    },
    showNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const id = Math.random().toString(36).substring(2, 9);
      state.notifications.push({
        id,
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'right',
        },
        ...action.payload,
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setPageLoading: (state, action: PayloadAction<boolean>) => {
      state.isPageLoading = action.payload;
    },
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload;
      document.title = `${action.payload} | SystemUpdate`;
    },
    setPageSubtitle: (state, action: PayloadAction<string | undefined>) => {
      state.pageSubtitle = action.payload;
    },
    setPageBreadcrumbs: (
      state,
      action: PayloadAction<Array<{ title: string; href?: string }>>
    ) => {
      state.pageBreadcrumbs = action.payload;
    },
    openDialog: (state, action: PayloadAction<Partial<UIState['dialog']>>) => {
      state.dialog = {
        ...state.dialog,
        ...action.payload,
        open: true,
      };
    },
    closeDialog: (state) => {
      state.dialog.open = false;
    },
    resetDialog: (state) => {
      state.dialog = initialState.dialog;
    },
    openDrawer: (state, action: PayloadAction<Partial<UIState['drawer']>>) => {
      state.drawer = {
        ...state.drawer,
        ...action.payload,
        open: true,
      };
    },
    closeDrawer: (state) => {
      state.drawer.open = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleMobileSidebar,
  setMobileSidebarOpen,
  showNotification,
  removeNotification,
  clearNotifications,
  setPageLoading,
  setPageTitle,
  setPageSubtitle,
  setPageBreadcrumbs,
  openDialog,
  closeDialog,
  resetDialog,
  openDrawer,
  closeDrawer,
} = uiSlice.actions;

export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectMobileSidebarOpen = (state: { ui: UIState }) => state.ui.mobileSidebarOpen;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectIsPageLoading = (state: { ui: UIState }) => state.ui.isPageLoading;
export const selectPageTitle = (state: { ui: UIState }) => state.ui.pageTitle;
export const selectPageSubtitle = (state: { ui: UIState }) => state.ui.pageSubtitle;
export const selectPageBreadcrumbs = (state: { ui: UIState }) => state.ui.pageBreadcrumbs;
export const selectDialog = (state: { ui: UIState }) => state.ui.dialog;
export const selectDrawer = (state: { ui: UIState }) => state.ui.drawer;

export default uiSlice.reducer;
