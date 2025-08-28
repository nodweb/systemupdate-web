import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FileDownload as InstallIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Visibility as ViewIcon,
  TouchApp as TouchIcon,
  Keyboard as KeyboardIcon,
  Screenshot as ScreenshotIcon
} from '@mui/icons-material';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface AppInfo {
  package_name: string;
  app_name: string;
  version_name?: string;
  is_system: boolean;
  is_enabled: boolean;
  is_running: boolean;
}

interface UIControlData {
  x?: number;
  y?: number;
  text?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const AppManagement: React.FC = () => {
  const { token } = useAuth();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  
  // Dialog states
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [apkPath, setApkPath] = useState('');
  const [uiControlDialogOpen, setUiControlDialogOpen] = useState(false);
  const [uiControlData, setUiControlData] = useState<UIControlData>({});
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string>('');

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    filterApps();
  }, [apps, searchTerm]);

  const fetchApps = async () => {
    setLoading(true);
    setError('');
    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'app_list',
        payload: {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const appList = response.data.apps?.installed || [];
        setApps(appList);
        setSnackbarMsg('لیست اپلیکیشن‌ها با موفقیت بارگذاری شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error('خطا در دریافت لیست اپلیکیشن‌ها');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'خطا در دریافت لیست اپلیکیشن‌ها');
      setSnackbarMsg('خطا در دریافت لیست اپلیکیشن‌ها.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const filterApps = () => {
    if (!searchTerm.trim()) {
      setFilteredApps(apps);
      return;
    }
    
    const filtered = apps.filter(app =>
      app.app_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.package_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredApps(filtered);
  };

  const handleAppAction = async (action: string, packageName: string) => {
    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: `app_${action}`,
        payload: { package_name: packageName }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSnackbarMsg(`عملیات ${action} روی اپلیکیشن با موفقیت انجام شد.`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        fetchApps(); // بروزرسانی لیست
      } else {
        throw new Error(`خطا در انجام عملیات ${action}`);
      }
    } catch (err: any) {
      setSnackbarMsg(`خطا در انجام عملیات ${action}: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleInstallApp = async () => {
    if (!apkPath.trim()) {
      setSnackbarMsg('لطفاً مسیر فایل APK را وارد کنید.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'app_install',
        payload: { apk_path: apkPath }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSnackbarMsg('اپلیکیشن با موفقیت نصب شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setInstallDialogOpen(false);
        setApkPath('');
        fetchApps();
      } else {
        throw new Error('خطا در نصب اپلیکیشن');
      }
    } catch (err: any) {
      setSnackbarMsg(`خطا در نصب اپلیکیشن: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleUIControl = async () => {
    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'ui_control',
        payload: uiControlData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSnackbarMsg('عملیات UI با موفقیت انجام شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setUiControlDialogOpen(false);
        setUiControlData({});
      } else {
        throw new Error('خطا در انجام عملیات UI');
      }
    } catch (err: any) {
      setSnackbarMsg(`خطا در انجام عملیات UI: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleScreenshot = async () => {
    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'screenshot',
        payload: {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.image_data) {
        setScreenshotData(`data:image/jpeg;base64,${response.data.image_data}`);
        setScreenshotDialogOpen(true);
        setSnackbarMsg('اسکرین‌شات با موفقیت گرفته شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error('خطا در گرفتن اسکرین‌شات');
      }
    } catch (err: any) {
      setSnackbarMsg(`خطا در گرفتن اسکرین‌شات: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const getTabApps = () => filteredApps.filter(app => {
      // Map selectedTab to boolean condition
      switch (selectedTab) {
        case 0: // همه
          return true;
        case 1: // در حال اجرا
          return app.is_running;
        case 2: // کاربری
          return !app.is_system;
        case 3: // سیستمی
          return app.is_system;
        default:
          return true;
      }
    });

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          مدیریت اپلیکیشن‌ها
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<InstallIcon />}
            onClick={() => setInstallDialogOpen(true)}
          >
            نصب اپلیکیشن
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScreenshotIcon />}
            onClick={handleScreenshot}
          >
            اسکرین‌شات
          </Button>
          <Button
            variant="outlined"
            startIcon={<TouchIcon />}
            onClick={() => setUiControlDialogOpen(true)}
          >
            کنترل UI
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchApps}
            disabled={loading}
          >
            بروزرسانی
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="جستجو در اپلیکیشن‌ها"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 320 }}
        />
      </Box>

      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
        <Tab label={`همه (${filteredApps.length})`} />
        <Tab label={`در حال اجرا (${filteredApps.filter(app => app.is_running).length})`} />
        <Tab label={`کاربری (${filteredApps.filter(app => !app.is_system).length})`} />
        <Tab label={`سیستمی (${filteredApps.filter(app => app.is_system).length})`} />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>نام اپلیکیشن</TableCell>
              <TableCell>شناسه</TableCell>
              <TableCell>نسخه</TableCell>
              <TableCell>نوع</TableCell>
              <TableCell>وضعیت</TableCell>
              <TableCell>عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getTabApps().map((app) => (
              <TableRow key={app.package_name} hover>
                <TableCell>{app.app_name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {app.package_name}
                </TableCell>
                <TableCell>{app.version_name || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={app.is_system ? 'سیستمی' : 'کاربری'} 
                    color={app.is_system ? 'warning' : 'primary'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={app.is_enabled ? 'فعال' : 'غیرفعال'} 
                      color={app.is_enabled ? 'success' : 'default'} 
                      size="small" 
                    />
                    {app.is_running && (
                      <Chip label="در حال اجرا" color="info" size="small" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!app.is_enabled && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleAppAction('enable', app.package_name)}
                        title="فعال کردن"
                      >
                        <PlayIcon />
                      </IconButton>
                    )}
                    {app.is_enabled && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleAppAction('disable', app.package_name)}
                        title="غیرفعال کردن"
                      >
                        <StopIcon />
                      </IconButton>
                    )}
                    {app.is_running && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleAppAction('close', app.package_name)}
                        title="بستن"
                      >
                        <StopIcon />
                      </IconButton>
                    )}
                    {!app.is_running && app.is_enabled && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleAppAction('open', app.package_name)}
                        title="باز کردن"
                      >
                        <PlayIcon />
                      </IconButton>
                    )}
                    {!app.is_system && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleAppAction('uninstall', app.package_name)}
                        title="حذف"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog نصب اپلیکیشن */}
      <Dialog open={installDialogOpen} onClose={() => setInstallDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>نصب اپلیکیشن جدید</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="مسیر فایل APK"
            fullWidth
            variant="outlined"
            value={apkPath}
            onChange={e => setApkPath(e.target.value)}
            placeholder="/sdcard/Download/app.apk"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>انصراف</Button>
          <Button onClick={handleInstallApp} variant="contained">نصب</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog کنترل UI */}
      <Dialog open={uiControlDialogOpen} onClose={() => setUiControlDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>کنترل UI دستگاه</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                label="مختصات X"
                type="number"
                fullWidth
                value={uiControlData.x || ''}
                onChange={e => setUiControlData({ ...uiControlData, x: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="مختصات Y"
                type="number"
                fullWidth
                value={uiControlData.y || ''}
                onChange={e => setUiControlData({ ...uiControlData, y: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="متن برای تایپ"
                fullWidth
                value={uiControlData.text || ''}
                onChange={e => setUiControlData({ ...uiControlData, text: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>جهت اسکرول:</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {['up', 'down', 'left', 'right'].map((direction) => (
                  <Button
                    key={direction}
                    variant={uiControlData.direction === direction ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setUiControlData({ ...uiControlData, direction: direction as any })}
                  >
                    {direction}
                  </Button>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUiControlDialogOpen(false)}>انصراف</Button>
          <Button onClick={handleUIControl} variant="contained">اجرا</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog اسکرین‌شات */}
      <Dialog open={screenshotDialogOpen} onClose={() => setScreenshotDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>اسکرین‌شات دستگاه</DialogTitle>
        <DialogContent>
          {screenshotData && (
            <img 
              src={screenshotData} 
              alt="Screenshot" 
              style={{ width: '100%', height: 'auto' }} 
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScreenshotDialogOpen(false)}>بستن</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default AppManagement; 