import React, { useEffect, useState, useCallback } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Button, Chip, Divider } from '@mui/material';

import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import DeleteIcon from '@mui/icons-material/Delete';
import TerminalIcon from '@mui/icons-material/Terminal';
import RefreshIcon from '@mui/icons-material/Refresh';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Tooltip from '@mui/material/Tooltip';
import { useAuth } from '../hooks/useAuth';
import CommandPanel from '../components/CommandPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DeviceDetails: React.FC = () => {
  const { deviceId } = useParams();
  const { token } = useAuth();
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [commandResults, setCommandResults] = useState<any>(null);

  const fetchDevice = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!token) throw new Error('No access token');
      const res = await axios.get(`${API_URL}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevice(res.data.device);
      setSnackbarMsg('اطلاعات دستگاه با موفقیت بارگذاری شد.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'خطا در دریافت اطلاعات دستگاه');
      setSnackbarMsg('خطا در دریافت اطلاعات دستگاه.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [deviceId, token]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      if (!token) throw new Error('No access token');
      const res = await axios.get(`${API_URL}/devices/${deviceId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data.logs || []);
    } catch (err: any) {
      setLogsError(err.response?.data?.error || err.message || 'خطا در دریافت لاگ‌ها');
    } finally {
      setLogsLoading(false);
    }
  }, [deviceId, token]);

  useEffect(() => {
    fetchDevice();
    fetchLogs();
  }, [fetchDevice, fetchLogs]);

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleRemoteCommand = () => {
    if (device) navigate(`/remote/${device.id}`);
  };
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    try {
      if (!token) throw new Error('No access token');
      await (await import('../services/deviceService')).deleteDevice(token, device.id);
      setSnackbarMsg('دستگاه با موفقیت حذف شد.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setTimeout(() => navigate('/devices'), 1200);
    } catch (err: any) {
      setSnackbarMsg('خطا در حذف دستگاه.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
    }
  };
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };
  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setSnackbarMsg('در حال بارگذاری مجدد اطلاعات...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
    // اجرای دوباره دریافت اطلاعات
    fetchDevice();
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InfoIcon color="info" fontSize="small" />;
      case 'warning':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'success':
        return <CheckCircleIcon color="success" fontSize="small" />;
      default:
        return <InfoIcon color="disabled" fontSize="small" />;
    }
  };
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'success':
        return <Chip label="موفق" color="success" size="small" />;
      case 'error':
        return <Chip label="خطا" color="error" size="small" />;
      case 'warning':
        return <Chip label="هشدار" color="warning" size="small" />;
      case 'info':
        return <Chip label="اطلاع" color="info" size="small" />;
      default:
        return <Chip label={status || '-'} size="small" />;
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <>
      <Typography color="error" sx={{ mt: 4 }}>{error}</Typography>
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </>;
  }
  if (!device) {
    return null;
  }

  return (
    <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            اطلاعات دستگاه
          </Typography>
          <Box>
            <Button variant="outlined" color="primary" startIcon={<TerminalIcon />} sx={{ ml: 1 }} onClick={handleRemoteCommand}>
              ارسال دستور
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} sx={{ ml: 1 }} onClick={handleDeleteClick}>
              حذف
            </Button>
            <Button variant="outlined" color="info" startIcon={<RefreshIcon />} onClick={handleRefresh}>
              رفرش
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography><b>شناسه:</b> {device.device_id}</Typography>
        <Typography><b>نام دستگاه:</b> {device.device_name || '-'}</Typography>
        <Typography><b>سازنده:</b> {device.manufacturer || '-'}</Typography>
        <Typography><b>مدل:</b> {device.model || '-'}</Typography>
        <Typography><b>نسخه اندروید:</b> {device.android_version || '-'}</Typography>
        <Typography><b>وضعیت اتصال:</b> {device.is_connected ? <Chip label="متصل" color="success" size="small" /> : <Chip label="قطع" size="small" />}</Typography>
        <Typography><b>آخرین مشاهده:</b> {device.last_seen ? new Date(device.last_seen).toLocaleString('fa-IR') : '-'}</Typography>
        <Typography><b>سطح امنیت:</b> {device.security_level || '-'}</Typography>
        <Typography><b>Root:</b> {device.is_rooted ? 'بله' : 'خیر'}</Typography>
        <Typography><b>Biometric:</b> {device.has_biometric ? 'دارد' : 'ندارد'}</Typography>
        <Typography><b>Battery:</b> {device.battery_level !== undefined ? `${device.battery_level  }%` : '-'}</Typography>
        <Button variant="outlined" sx={{ mt: 3 }} onClick={() => navigate(-1)}>
          بازگشت
        </Button>
      </Paper>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          دستورات سریع
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <CommandPanel
          deviceId={parseInt(deviceId!)}
          onSent={(result) => {
            setSnackbarMsg('دستور با موفقیت ارسال شد');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setCommandResults(result);
            fetchLogs();
          }}
        />
        {commandResults && (
          <Alert severity="info" sx={{ mt: 2 }}>
            نتیجه: {JSON.stringify(commandResults)}
          </Alert>
        )}
      </Paper>
      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" gutterBottom>
        لاگ‌ها و تاریخچه فعالیت
      </Typography>
      {logsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
      ) : logsError ? (
        <Alert severity="error">{logsError}</Alert>
      ) : logs.length === 0 ? (
        <Alert severity="info">لاگی برای این دستگاه ثبت نشده است.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 2, maxWidth: '100vw', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>زمان</TableCell>
                <TableCell>نوع رویداد</TableCell>
                <TableCell>توضیحات</TableCell>
                <TableCell>وضعیت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString('fa-IR') : '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getEventIcon(log.event_type)}
                      <span>{log.event_type || '-'}</span>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={log.message || '-'}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: 180 }}>
                        {log.message || '-'}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{getStatusChip(log.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>تایید حذف دستگاه</DialogTitle>
        <DialogContent>
          <DialogContentText>
            آیا از حذف دستگاه "{device?.device_name || device?.device_id}" مطمئن هستید؟ این عملیات غیرقابل بازگشت است.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>انصراف</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">حذف</Button>
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

export default DeviceDetails; 