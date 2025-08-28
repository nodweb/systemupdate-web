import React, { useEffect, useRef, useState } from 'react';

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Box, Chip, Pagination, TextField, InputAdornment, IconButton, Button, MenuItem, Select, FormControl, InputLabel, TableSortLabel } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import TerminalIcon from '@mui/icons-material/Terminal';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import CircleIcon from '@mui/icons-material/Circle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useAuth } from '../hooks/useAuth';
import { getDevices, Device } from '../services/deviceService';
import { on as wsOn, off as wsOff } from '../services/websocket';

const DeviceList: React.FC = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const navigate = useNavigate();
  const [connectionFilter, setConnectionFilter] = useState('all');
  const [securityFilter, setSecurityFilter] = useState('all');
  const [orderBy, setOrderBy] = useState<keyof Device>('device_id');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const fetchDevices = async (showSuccess = true) => {
    setLoading(true);
    setError('');
    try {
      if (!token) throw new Error('No access token');
      const res = await getDevices(token, page, 10);
      let filtered = res.devices;
      if (search) {
        const s = search.trim().toLowerCase();
        filtered = filtered.filter(
          d =>
            d.device_id?.toLowerCase().includes(s) ||
            d.device_name?.toLowerCase().includes(s) ||
            d.manufacturer?.toLowerCase().includes(s) ||
            d.model?.toLowerCase().includes(s)
        );
      }
      if (connectionFilter !== 'all') {
        filtered = filtered.filter((d) => {
          if (connectionFilter === 'connected') {
            return d.is_connected;
          } if (connectionFilter === 'disconnected') {
            return !d.is_connected;
          }
          return true;
        });
      }
      if (securityFilter !== 'all') {
        filtered = filtered.filter((d) => d.security_level === securityFilter);
      }
      setDevices(filtered);
      setTotalPages(res.pagination.pages);
      if (showSuccess) {
        setSnackbarMsg('دستگاه‌ها با موفقیت بارگذاری شدند.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'خطا در دریافت دستگاه‌ها');
      setSnackbarMsg('خطا در دریافت دستگاه‌ها.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices(false);
  }, [token, page, search, connectionFilter, securityFilter]);

  // Debounced refetch to avoid bursts on multiple WS events
  const refetchTimer = useRef<number | null>(null);
  const debouncedRefresh = () => {
    if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(() => fetchDevices(false), 400);
  };

  // Helpers to update device list in place
  const updateDeviceStatus = (device_id: string, is_connected: boolean, last_seen?: string) => {
    setDevices(prev => prev.map(d => d.device_id === device_id ? { ...d, is_connected, last_seen: last_seen ?? d.last_seen } : d));
  };
  const updateDeviceInList = (partial: Partial<Device> & { device_id?: string }) => {
    if (!partial.device_id) return;
    setDevices(prev => prev.map(d => d.device_id === partial.device_id ? { ...d, ...partial } as Device : d));
  };

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const onAuthenticated = (data: any) => {
      // A device connected successfully
      if (data?.device?.device_id) {
        updateDeviceStatus(data.device.device_id, true, new Date().toISOString());
        debouncedRefresh();
      }
    };
    const onDeviceUpdate = (payload: any) => {
      // payload may contain fields like device_id, battery_level, last_seen, is_connected
      if (payload?.device_id) {
        updateDeviceInList(payload);
      }
    };
    const onDeviceOffline = (deviceId: string | { device_id?: string }) => {
      const id = typeof deviceId === 'string' ? deviceId : deviceId?.device_id;
      if (id) updateDeviceStatus(id, false, new Date().toISOString());
    };
    const onCommandResult = () => {
      debouncedRefresh();
    };

    wsOn('authenticated', onAuthenticated);
    wsOn('device_update', onDeviceUpdate);
    wsOn('device_offline', onDeviceOffline);
    wsOn('command_result', onCommandResult);

    return () => {
      wsOff('authenticated', onAuthenticated);
      wsOff('device_update', onDeviceUpdate);
      wsOff('device_offline', onDeviceOffline);
      wsOff('command_result', onCommandResult);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
    setSnackbarMsg('جستجو انجام شد.');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };

  const handleRefresh = () => {
    fetchDevices();
    setSnackbarMsg('در حال بارگذاری مجدد...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleRowClick = (device: Device) => {
    navigate(`/devices/${device.id}`);
  };

  const handleDeleteClick = (device: Device) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;
    try {
      if (!token) throw new Error('No access token');
      await (await import('../services/deviceService')).deleteDevice(token, deviceToDelete.id);
      setSnackbarMsg('دستگاه با موفقیت حذف شد.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
      fetchDevices(false);
    } catch (err: any) {
      setSnackbarMsg('خطا در حذف دستگاه.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeviceToDelete(null);
  };

  const handleRemoteCommand = (device: Device) => {
    navigate(`/remote/${device.id}`);
  };

  const handleDetails = (device: Device) => {
    navigate(`/devices/${device.id}`);
  };

  const filteredDevices = devices.filter((d) => {
    let match = true;
    if (connectionFilter !== 'all') {
      match = match && ((connectionFilter === 'connected' && d.is_connected) || (connectionFilter === 'disconnected' && !d.is_connected));
    }
    if (securityFilter !== 'all') {
      match = match && d.security_level === securityFilter;
    }
    return match;
  });

  const handleSort = (property: keyof Device) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  function sortDevices(array: Device[], comparator: (a: Device, b: Device) => number) {
    const stabilized = array.map((el, index) => [el, index] as [Device, number]);
    stabilized.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
  }

  function getComparator<Key extends keyof Device>(order: 'asc' | 'desc', orderBy: Key): (a: Device, b: Device) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] === undefined || b[orderBy] === null) return -1;
    if (a[orderBy] === undefined || a[orderBy] === null) return 1;
    if (typeof b[orderBy] === 'string' && typeof a[orderBy] === 'string') {
      return b[orderBy].localeCompare(a[orderBy]);
    }
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

  const sortedDevices = sortDevices(filteredDevices, getComparator(order, orderBy));

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          لیست دستگاه‌ها
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          بارگذاری مجدد
        </Button>
      </Box>
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="جستجو (نام، شناسه، سازنده، مدل)"
          variant="outlined"
          size="small"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton type="submit" edge="end">
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="connection-filter-label">وضعیت اتصال</InputLabel>
          <Select
            labelId="connection-filter-label"
            value={connectionFilter}
            label="وضعیت اتصال"
            onChange={e => setConnectionFilter(e.target.value)}
          >
            <MenuItem value="all">همه</MenuItem>
            <MenuItem value="connected">متصل</MenuItem>
            <MenuItem value="disconnected">قطع</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="security-filter-label">سطح امنیت</InputLabel>
          <Select
            labelId="security-filter-label"
            value={securityFilter}
            label="سطح امنیت"
            onChange={e => setSecurityFilter(e.target.value)}
          >
            <MenuItem value="all">همه</MenuItem>
            <MenuItem value="low">کم</MenuItem>
            <MenuItem value="medium">متوسط</MenuItem>
            <MenuItem value="high">زیاد</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ alignSelf: 'center', color: 'text.secondary', fontSize: 13, ml: 2 }}>
          تعداد: {filteredDevices.length}
        </Box>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'device_id'}
                      direction={orderBy === 'device_id' ? order : 'asc'}
                      onClick={() => handleSort('device_id')}
                    >
                      شناسه
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'device_name'}
                      direction={orderBy === 'device_name' ? order : 'asc'}
                      onClick={() => handleSort('device_name')}
                    >
                      نام دستگاه
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'manufacturer'}
                      direction={orderBy === 'manufacturer' ? order : 'asc'}
                      onClick={() => handleSort('manufacturer')}
                    >
                      سازنده
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'model'}
                      direction={orderBy === 'model' ? order : 'asc'}
                      onClick={() => handleSort('model')}
                    >
                      مدل
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'android_version'}
                      direction={orderBy === 'android_version' ? order : 'asc'}
                      onClick={() => handleSort('android_version')}
                    >
                      نسخه اندروید
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'is_connected'}
                      direction={orderBy === 'is_connected' ? order : 'asc'}
                      onClick={() => handleSort('is_connected')}
                    >
                      وضعیت اتصال
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'last_seen'}
                      direction={orderBy === 'last_seen' ? order : 'asc'}
                      onClick={() => handleSort('last_seen')}
                    >
                      آخرین مشاهده
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'security_level'}
                      direction={orderBy === 'security_level' ? order : 'asc'}
                      onClick={() => handleSort('security_level')}
                    >
                      سطح امنیت
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'battery_level'}
                      direction={orderBy === 'battery_level' ? order : 'asc'}
                      onClick={() => handleSort('battery_level')}
                    >
                      سطح باتری
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">اکشن‌ها</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedDevices.map((device) => (
                  <TableRow
                    key={device.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{device.device_id}</TableCell>
                    <TableCell>{device.device_name || '-'}</TableCell>
                    <TableCell>{device.manufacturer || '-'}</TableCell>
                    <TableCell>{device.model || '-'}</TableCell>
                    <TableCell>{device.android_version || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={device.is_connected ? <CircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                        label={device.is_connected ? 'متصل' : 'قطع'}
                        color={device.is_connected ? 'success' : 'default'}
                        size="small"
                        variant={device.is_connected ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>{device.last_seen ? new Date(device.last_seen).toLocaleString('fa-IR') : '-'}</TableCell>
                    <TableCell>{device.security_level || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={device.battery_level !== undefined && device.battery_level < 100 ? <BatteryChargingFullIcon /> : <BatteryFullIcon />}
                        label={device.battery_level !== undefined ? `${device.battery_level}%` : '-'}
                        size="small"
                        color={device.battery_level !== undefined ? (device.battery_level > 50 ? 'success' : device.battery_level > 20 ? 'warning' : 'error') : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="جزئیات دستگاه">
                        <IconButton size="small" onClick={() => handleDetails(device)}>
                          <InfoIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ارسال دستور">
                        <IconButton size="small" onClick={() => handleRemoteCommand(device)}>
                          <TerminalIcon color="secondary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف دستگاه">
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(device)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>تایید حذف دستگاه</DialogTitle>
        <DialogContent>
          <DialogContentText>
            آیا از حذف دستگاه "{deviceToDelete?.device_name || deviceToDelete?.device_id}" مطمئن هستید؟ این عملیات غیرقابل بازگشت است.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>انصراف</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceList; 