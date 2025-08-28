import React from 'react';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Container,
} from '@mui/material';
import {
  Devices,
  Wifi,
  WifiOff,
  BatteryChargingFull,
  BatteryFull,
  TrendingUp,
  Error,
  Refresh,
  Security,
  Speed,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { analyticsAPI, devicesAPI } from '../services/api';
import CommandResults from '../components/CommandResults';
import { connect as wsConnect, on as wsOn, off as wsOff, isConnected as wsIsConnected, getLastHeartbeat } from '../services/websocket';


const Dashboard: React.FC = () => {
  const [wsConnected, setWsConnected] = React.useState<boolean>(false);
  const [lastHeartbeat, setLastHeartbeat] = React.useState<string | null>(null);

  // Fetch real-time metrics
  const { data: realTimeData, isLoading: realTimeLoading, refetch: refetchRealTime } = useQuery(
    'realTimeMetrics',
    () => analyticsAPI.getRealTimeMetrics(),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch device stats
  const { data: deviceStats, isLoading: deviceStatsLoading } = useQuery(
    'deviceStats',
    () => devicesAPI.getDeviceStats()
  );

  // Fetch overview analytics
  const { data: overviewData, isLoading: overviewLoading } = useQuery(
    'overview',
    () => analyticsAPI.getOverview(7) // Last 7 days
  );

  // WebSocket lifecycle and event hooks
  React.useEffect(() => {
    const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || undefined;
    wsConnect(token || undefined);

    const handleConnected = () => setWsConnected(true);
    const handleDisconnected = () => setWsConnected(false);
    const handleAuthenticated = () => {
      setWsConnected(true);
      refetchRealTime();
    };
    const handleHeartbeat = () => {
      setLastHeartbeat(getLastHeartbeat());
      refetchRealTime();
    };
    const handleDataOrCmd = () => {
      refetchRealTime();
    };

    wsOn('ws_connected', handleConnected);
    wsOn('ws_disconnected', handleDisconnected);
    wsOn('authenticated', handleAuthenticated);
    wsOn('heartbeat_ack', handleHeartbeat);
    wsOn('data_received', handleDataOrCmd);
    wsOn('command_result', handleDataOrCmd);

    // initialize local state
    setWsConnected(wsIsConnected());
    setLastHeartbeat(getLastHeartbeat());

    return () => {
      wsOff('ws_connected', handleConnected);
      wsOff('ws_disconnected', handleDisconnected);
      wsOff('authenticated', handleAuthenticated);
      wsOff('heartbeat_ack', handleHeartbeat);
      wsOff('data_received', handleDataOrCmd);
      wsOff('command_result', handleDataOrCmd);
    };
  }, [refetchRealTime]);

  const handleRefresh = () => {
    refetchRealTime();
  };

  // Phase 1: simple test command sender (optional utility)
  const sendTestCommand = async () => {
    try {
      const devicesRes = await devicesAPI.getDevices({ per_page: 50 });
      const list = devicesRes?.data?.devices || devicesRes?.devices || [];
      const target = list.find((d: any) => d.device_id === 'test-device-001');
      if (!target) return;
      await devicesAPI.createCommand(target.id, {
        command_type: 'ping',
        command_data: { message: 'hello' },
        priority: 'normal',
      });
    } catch (e) {
      // swallow for now in Phase 1
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    loading?: boolean;
  }> = ({ title, value, icon, color, subtitle, loading }) => (
    <Card className="card-hover" sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
              {loading ? <CircularProgress size={24} /> : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const DeviceStatusCard: React.FC = () => {
    const onlineCount = realTimeData?.real_time?.online_devices || 0;
    const totalCount = deviceStats?.stats?.total_devices || 0;
    const offlineCount = totalCount - onlineCount;

    return (
      <Card className="card-hover">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            وضعیت دستگاه‌ها
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip
              icon={<Wifi />}
              label={`${onlineCount} آنلاین`}
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<WifiOff />}
              label={`${offlineCount} آفلاین`}
              color="error"
              variant="outlined"
            />
            <Chip
              icon={<Devices />}
              label={`${totalCount} کل`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  const RecentActivityCard: React.FC = () => {
    const recentCommands = realTimeData?.real_time?.recent_commands || 0;
    const recentData = realTimeData?.real_time?.recent_data_collections || 0;
    const recentErrors = realTimeData?.real_time?.recent_errors || 0;

    return (
      <Card className="card-hover">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            فعالیت اخیر (ساعت گذشته)
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">دستورات اجرا شده:</Typography>
              <Chip label={recentCommands} size="small" color="primary" />
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">جمع‌آوری داده:</Typography>
              <Chip label={recentData} size="small" color="success" />
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">خطاها:</Typography>
              <Chip label={recentErrors} size="small" color="error" />
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const PerformanceCard: React.FC = () => {
    const successRate = realTimeData?.real_time?.success_rate_last_hour || 0;

    return (
      <Card className="card-hover">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            نرخ موفقیت
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress
              variant="determinate"
              value={successRate}
              size={60}
              sx={{ color: successRate > 80 ? 'success.main' : successRate > 60 ? 'warning.main' : 'error.main' }}
            />
            <Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {successRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                دستورات موفق
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          داشبورد SystemUpdate
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            size="small"
            color={wsConnected ? 'success' : 'default'}
            label={wsConnected ? 'WS Connected' : 'WS Disconnected'}
          />
          {lastHeartbeat && (
            <Chip size="small" color="primary" label={`HB: ${new Date(lastHeartbeat).toLocaleTimeString()}`} />
          )}
          <Tooltip title="بروزرسانی">
            <IconButton onClick={handleRefresh} disabled={realTimeLoading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="دستگاه‌های آنلاین"
            value={realTimeData?.real_time?.online_devices || 0}
            icon={<Wifi />}
            color="#4caf50"
            loading={realTimeLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="دستورات اخیر"
            value={realTimeData?.real_time?.recent_commands || 0}
            icon={<TrendingUp />}
            color="#2196f3"
            subtitle="ساعت گذشته"
            loading={realTimeLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="جمع‌آوری داده"
            value={realTimeData?.real_time?.recent_data_collections || 0}
            icon={<BatteryFull />}
            color="#ff9800"
            subtitle="ساعت گذشته"
            loading={realTimeLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="خطاها"
            value={realTimeData?.real_time?.recent_errors || 0}
            icon={<Error />}
            color="#f44336"
            subtitle="ساعت گذشته"
            loading={realTimeLoading}
          />
        </Grid>
      </Grid>

      {/* Additional Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <DeviceStatusCard />
        </Grid>
        <Grid item xs={12} md={4}>
          <RecentActivityCard />
        </Grid>
        <Grid item xs={12} md={4}>
          <PerformanceCard />
        </Grid>
        <Grid item xs={12}>
          <CommandResults />
        </Grid>
      </Grid>

      {/* Phase 1 utility: trigger a test command roundtrip */}
      <Box mt={2} display="flex" justifyContent="flex-end">
        <Tooltip title="ارسال فرمان آزمایشی به test-device-001">
          <IconButton onClick={sendTestCommand}>
            <Speed />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Last Updated */}
      <Box mt={3} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          آخرین بروزرسانی: {realTimeData?.timestamp ? 
            formatDistanceToNow(new Date(realTimeData.timestamp), {
              addSuffix: true,
              locale: faIR,
            }) : 'نامشخص'}
        </Typography>
      </Box>
    </Container>
  );
};

export default Dashboard; 