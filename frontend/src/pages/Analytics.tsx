import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Divider } from '@mui/material';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Doughnut, Line } from 'react-chartjs-2';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import DevicesIcon from '@mui/icons-material/Devices';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SecurityIcon from '@mui/icons-material/Security';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useAuth } from '../hooks/useAuth';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Analytics: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const [activityData, setActivityData] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [activityRange, setActivityRange] = useState('7d');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        if (!token) throw new Error('No access token');
        const res = await axios.get(`${API_URL}/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
        setSnackbarMsg('آمار با موفقیت بارگذاری شد.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'خطا در دریافت آمار');
        setSnackbarMsg('خطا در دریافت آمار.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  useEffect(() => {
    const fetchActivity = async () => {
      setActivityLoading(true);
      setActivityError('');
      try {
        if (!token) throw new Error('No access token');
        const res = await axios.get(`${API_URL}/analytics/device-activity?range=${activityRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActivityData(res.data);
      } catch (err: any) {
        setActivityError(err.response?.data?.error || err.message || 'خطا در دریافت داده فعالیت');
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivity();
  }, [token, activityRange]);

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
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
  if (!stats) {
    return null;
  }

  // داده‌های نمونه برای Pie و Bar (در صورت نبود داده واقعی)
  const osData = {
    labels: stats.android_versions?.map((v: any) => v.version) || [],
    datasets: [
      {
        label: 'تعداد دستگاه‌ها',
        data: stats.android_versions?.map((v: any) => v.count) || [],
        backgroundColor: [
          '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#f57c00'
        ],
      },
    ],
  };

  const securityData = {
    labels: ['پایین', 'متوسط', 'بالا'],
    datasets: [
      {
        label: 'تعداد دستگاه‌ها',
        data: [stats.security_levels?.low || 0, stats.security_levels?.medium || 0, stats.security_levels?.high || 0],
        backgroundColor: ['#d32f2f', '#fbc02d', '#388e3c'],
      },
    ],
  };

  // محاسبه آمار کلیدی
  const totalDevices = stats.total_devices || 0;
  const onlineDevices = stats.online_devices || 0;
  const offlineDevices = totalDevices - onlineDevices;
  const highSec = stats.security_levels?.high || 0;
  const highSecPercent = totalDevices ? Math.round((highSec / totalDevices) * 100) : 0;

  const onlinePieData = {
    labels: ['آنلاین', 'آفلاین'],
    datasets: [
      {
        data: [onlineDevices, offlineDevices],
        backgroundColor: ['#388e3c', '#d32f2f'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Box sx={{ mt: 4, maxWidth: 900, mx: 'auto' }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}><DevicesIcon /></Avatar>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">کل دستگاه‌ها</Typography>
              <Typography variant="h6">{totalDevices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <Avatar sx={{ bgcolor: '#388e3c', mr: 2 }}><WifiIcon /></Avatar>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">آنلاین</Typography>
              <Typography variant="h6">{onlineDevices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <Avatar sx={{ bgcolor: '#d32f2f', mr: 2 }}><WifiOffIcon /></Avatar>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">آفلاین</Typography>
              <Typography variant="h6">{offlineDevices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <Avatar sx={{ bgcolor: '#fbc02d', mr: 2 }}><SecurityIcon /></Avatar>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">امنیت بالا</Typography>
              <Typography variant="h6">{highSecPercent}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          آمار کلی دستگاه‌ها
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle1" gutterBottom>
              وضعیت آنلاین/آفلاین
            </Typography>
            <Doughnut data={onlinePieData} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              توزیع نسخه‌های اندروید
            </Typography>
            <Pie data={osData} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              سطح امنیت دستگاه‌ها
            </Typography>
            <Bar data={securityData} />
          </Box>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ flex: 1 }}>
            روند فعالیت دستگاه‌ها
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="activity-range-label">بازه زمانی</InputLabel>
            <Select
              labelId="activity-range-label"
              value={activityRange}
              label="بازه زمانی"
              onChange={e => setActivityRange(e.target.value)}
            >
              <MenuItem value="1d">۲۴ ساعت</MenuItem>
              <MenuItem value="7d">۷ روز</MenuItem>
              <MenuItem value="30d">۳۰ روز</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Divider sx={{ mb: 3 }} />
        {activityLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
        ) : activityError ? (
          <Typography color="error">{activityError}</Typography>
        ) : activityData && activityData.labels && activityData.data ? (
          <Line
            data={{
              labels: activityData.labels,
              datasets: [
                {
                  label: 'تعداد دستگاه‌های آنلاین',
                  data: activityData.data,
                  fill: false,
                  borderColor: '#1976d2',
                  backgroundColor: '#1976d2',
                  tension: 0.3,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { enabled: true },
              },
              scales: {
                x: { title: { display: true, text: 'تاریخ' } },
                y: { title: { display: true, text: 'تعداد آنلاین' }, beginAtZero: true },
              },
            }}
          />
        ) : (
          <Typography color="text.secondary">داده‌ای برای نمایش وجود ندارد.</Typography>
        )}
      </Paper>
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <MuiAlert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default Analytics; 