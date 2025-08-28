import React, { useEffect, useState, useRef } from 'react';

import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Switch,
  FormControlLabel,
  Slider,
  Tabs,
  Tab
} from '@mui/material';

import {
  TouchApp as TouchIcon,
  Keyboard as KeyboardIcon,
  Screenshot as ScreenshotIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Monitor as MonitorIcon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import { useAuth } from '../hooks/useAuth';
import CommandPanel from '../components/CommandPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface CommandHistory {
  id: string;
  command: string;
  timestamp: Date;
  success: boolean;
  response?: string;
}

interface DeviceStatus {
  isConnected: boolean;
  batteryLevel: number;
  isCharging: boolean;
  currentApp: string;
  screenResolution: { width: number; height: number };
}

const RemoteControl: React.FC = () => {
  const { token } = useAuth();
  const { deviceId } = useParams<{ deviceId: string }>();
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  
  // Touch Control
  const [touchX, setTouchX] = useState(0);
  const [touchY, setTouchY] = useState(0);
  const [touchPressure, setTouchPressure] = useState(1);
  const [touchDuration, setTouchDuration] = useState(100);
  
  // Text Input
  const [inputText, setInputText] = useState('');
  
  // Screenshot
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [autoScreenshot, setAutoScreenshot] = useState(false);
  const [screenshotInterval, setScreenshotInterval] = useState(5000);
  
  // Command Execution
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [executingCommand, setExecutingCommand] = useState(false);
  
  // Device Status
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    isConnected: false,
    batteryLevel: 0,
    isCharging: false,
    currentApp: '',
    screenResolution: { width: 1080, height: 1920 }
  });
  
  // Auto-refresh interval
  const statusIntervalRef = useRef<NodeJS.Timeout>();
  const screenshotIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchDeviceStatus();
    
    // Start auto-refresh
    statusIntervalRef.current = setInterval(fetchDeviceStatus, 3000);
    
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoScreenshot) {
      screenshotIntervalRef.current = setInterval(takeScreenshot, screenshotInterval);
    } else if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
    
    return () => {
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
    };
  }, [autoScreenshot, screenshotInterval]);

  const fetchDeviceStatus = async () => {
    try {
      if (!token) return;
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'device_status',
        payload: {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setDeviceStatus(response.data.status);
      }
    } catch (err: any) {
      console.error('Error fetching device status:', err);
    }
  };

  const handleTouchControl = async () => {
    setLoading(true);
    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'ui_control',
        payload: {
          action: 'click',
          x: touchX,
          y: touchY,
          pressure: touchPressure,
          duration: touchDuration
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSnackbarMsg('کلیک با موفقیت انجام شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error('خطا در انجام کلیک');
      }
    } catch (err: any) {
      setSnackbarMsg(`خطا در انجام کلیک: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTextInput = async () => {
    if (!inputText.trim()) {
      setSnackbarMsg('لطفاً متنی برای تایپ وارد کنید.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    try {
      if (!token) throw new Error('No access token');
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'ui_control',
        payload: {
          action: 'text',
          text: inputText
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSnackbarMsg('متن با موفقیت تایپ شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setInputText('');
      } else {
        throw new Error('خطا در تایپ متن');
      }
    } catch (err: any) {
      setSnackbarMsg(`خطا در تایپ متن: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const takeScreenshot = async () => {
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
        if (!autoScreenshot) {
          setScreenshotDialogOpen(true);
        }
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

  const executeCommand = async () => {
    if (!commandInput.trim()) {
      setSnackbarMsg('لطفاً دستوری برای اجرا وارد کنید.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setExecutingCommand(true);
    try {
      if (!token) throw new Error('No access token');
      
      const commandId = Date.now().toString();
      const newCommand: CommandHistory = {
        id: commandId,
        command: commandInput,
        timestamp: new Date(),
        success: false,
        response: ''
      };
      
      setCommandHistory(prev => [newCommand, ...prev]);
      
      const response = await axios.post(`${API_URL}/websocket/command`, {
        command: 'execute_command',
        payload: {
          command: commandInput
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const updatedCommand = {
          ...newCommand,
          success: true,
          response: response.data.output || 'دستور با موفقیت اجرا شد.'
        };
        
        setCommandHistory(prev => 
          prev.map(cmd => cmd.id === commandId ? updatedCommand : cmd)
        );
        
        setSnackbarMsg('دستور با موفقیت اجرا شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setCommandInput('');
      } else {
        throw new Error('خطا در اجرای دستور');
      }
    } catch (err: any) {
      const updatedCommand = {
        id: Date.now().toString(),
        command: commandInput,
        timestamp: new Date(),
        success: false,
        response: err.message
      };
      
      setCommandHistory(prev => [updatedCommand, ...prev]);
      
      setSnackbarMsg(`خطا در اجرای دستور: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setExecutingCommand(false);
    }
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const clearCommandHistory = () => {
    setCommandHistory([]);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          کنترل از راه دور دستگاه
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDeviceStatus}
            disabled={loading}
          >
            بروزرسانی وضعیت
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScreenshotIcon />}
            onClick={takeScreenshot}
            disabled={loading}
          >
            اسکرین‌شات
          </Button>
        </Box>
      </Box>

      {/* Device Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            وضعیت دستگاه
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={deviceStatus.isConnected ? 'متصل' : 'قطع'} 
                  color={deviceStatus.isConnected ? 'success' : 'error'} 
                  size="small" 
                />
                <Typography variant="body2">وضعیت اتصال</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                باتری: {deviceStatus.batteryLevel}% 
                {deviceStatus.isCharging && ' (در حال شارژ)'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                اپلیکیشن فعلی: {deviceStatus.currentApp || 'نامشخص'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                رزولوشن: {deviceStatus.screenResolution.width}×{deviceStatus.screenResolution.height}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="کنترل لمسی" icon={<TouchIcon />} />
        <Tab label="تایپ متن" icon={<KeyboardIcon />} />
        <Tab label="اجرای دستور" icon={<TerminalIcon />} />
        <Tab label="تنظیمات" icon={<SettingsIcon />} />
        <Tab label="دستورات سیستم" icon={<CodeIcon />} />
      </Tabs>

      {/* Touch Control Tab */}
      {selectedTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            کنترل لمسی
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="مختصات X"
                type="number"
                fullWidth
                value={touchX}
                onChange={e => setTouchX(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0, max: deviceStatus.screenResolution.width }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="مختصات Y"
                type="number"
                fullWidth
                value={touchY}
                onChange={e => setTouchY(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0, max: deviceStatus.screenResolution.height }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>فشار لمسی</Typography>
              <Slider
                value={touchPressure}
                onChange={(_, value) => setTouchPressure(value as number)}
                min={0.1}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>مدت زمان (میلی‌ثانیه)</Typography>
              <Slider
                value={touchDuration}
                onChange={(_, value) => setTouchDuration(value as number)}
                min={50}
                max={1000}
                step={50}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<TouchIcon />}
                onClick={handleTouchControl}
                disabled={loading}
                fullWidth
              >
                اجرای کلیک
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Text Input Tab */}
      {selectedTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            تایپ متن
          </Typography>
          <TextField
            label="متن برای تایپ"
            multiline
            rows={4}
            fullWidth
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="متن مورد نظر را اینجا وارد کنید..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<KeyboardIcon />}
            onClick={handleTextInput}
            disabled={loading || !inputText.trim()}
            fullWidth
          >
            تایپ متن
          </Button>
        </Paper>
      )}

      {/* Command Execution Tab */}
      {selectedTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            اجرای دستور
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="دستور"
              fullWidth
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              placeholder="دستور مورد نظر را وارد کنید..."
              onKeyPress={e => e.key === 'Enter' && executeCommand()}
            />
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={executeCommand}
              disabled={executingCommand || !commandInput.trim()}
            >
              اجرا
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">تاریخچه دستورات</Typography>
            <Button size="small" onClick={clearCommandHistory}>
              پاک کردن
            </Button>
          </Box>
          
          <List sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {commandHistory.map((cmd) => (
              <ListItem key={cmd.id} divider>
                <ListItemText
                  primary={cmd.command}
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {cmd.timestamp.toLocaleString('fa-IR')}
                      </Typography>
                      {cmd.response && (
                        <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {cmd.response}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={cmd.success ? 'موفق' : 'ناموفق'} 
                    color={cmd.success ? 'success' : 'error'} 
                    size="small" 
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {commandHistory.length === 0 && (
              <ListItem>
                <ListItemText primary="هیچ دستوری اجرا نشده است." />
              </ListItem>
            )}
          </List>
        </Paper>
      )}

      {/* Phase 1 Commands Tab */}
      {selectedTab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            دستورات Phase 1
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            این دستورات از طریق API استاندارد ارسال می‌شوند
          </Alert>
          <CommandPanel
            deviceId={parseInt(deviceId!)}
            onSent={() => {
              setSnackbarMsg('دستور با موفقیت ارسال شد');
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            }}
          />
        </Paper>
      )}

      {/* Settings Tab */}
      {selectedTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            تنظیمات
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoScreenshot}
                    onChange={e => setAutoScreenshot(e.target.checked)}
                  />
                }
                label="اسکرین‌شات خودکار"
              />
            </Grid>
            {autoScreenshot && (
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>فاصله زمانی اسکرین‌شات (ثانیه)</Typography>
                <Slider
                  value={screenshotInterval / 1000}
                  onChange={(_, value) => setScreenshotInterval((value as number) * 1000)}
                  min={1}
                  max={30}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Screenshot Dialog */}
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

export default RemoteControl; 