import React from 'react';
import { useTheme } from '@mui/material/styles';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader, 
  IconButton, 
  Button, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  ListItemSecondaryAction, 
  Divider, 
  LinearProgress, 
  useMediaQuery,
  Tooltip,
  Chip,
  Stack,
  Skeleton
} from '@mui/material';
import {
  Devices as DevicesIcon,
  SystemUpdate as SystemUpdateIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  ArrowForward as ArrowForwardIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Group as GroupIcon,
  Computer as ComputerIcon,
  CloudDownload as CloudDownloadIcon,
  Update as UpdateIcon,
  History as HistoryIcon,
  Schedule as ScheduleIcon,
  NotificationsActive as NotificationsActiveIcon,
  Storage as StorageOutlinedIcon,
  Memory as MemoryOutlinedIcon,
  Speed as SpeedOutlinedIcon,
  Security as SecurityOutlinedIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Mock data - replace with real API calls
const useDashboardData = () => {
  return useQuery('dashboardData', async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      stats: {
        totalDevices: 1242,
        onlineDevices: 987,
        offlineDevices: 255,
        pendingUpdates: 342,
        failedUpdates: 28,
        deployedUpdates: 124,
        storageUsed: 65,
        securityIssues: 12,
      },
      recentActivities: [
        { 
          id: 1, 
          type: 'update', 
          title: 'Security Update 2.1.3 deployed', 
          description: 'Successfully deployed to 124 devices', 
          timestamp: '2023-06-15T10:30:00Z',
          status: 'success',
        },
        { 
          id: 2, 
          type: 'alert', 
          title: 'High CPU usage detected', 
          description: 'Device "Office-PC-42" is at 92% CPU', 
          timestamp: '2023-06-15T09:15:00Z',
          status: 'warning',
        },
        { 
          id: 3, 
          type: 'device', 
          title: 'New device registered', 
          description: 'Device "Meeting-Room-TV" was added', 
          timestamp: '2023-06-14T16:45:00Z',
          status: 'info',
        },
        { 
          id: 4, 
          type: 'update', 
          title: 'Update failed', 
          description: 'Failed to update device "Reception-PC-01"', 
          timestamp: '2023-06-14T14:20:00Z',
          status: 'error',
        },
        { 
          id: 5, 
          type: 'maintenance', 
          title: 'Scheduled maintenance', 
          description: 'System maintenance completed successfully', 
          timestamp: '2023-06-14T03:00:00Z',
          status: 'info',
        },
      ],
      deviceStatus: [
        { name: 'Online', value: 987 },
        { name: 'Offline', value: 255 },
      ],
      updateStatus: [
        { name: 'Pending', value: 342 },
        { name: 'Deployed', value: 124 },
        { name: 'Failed', value: 28 },
      ],
      resourceUsage: [
        { name: 'Storage', value: 65, color: '#8884d8' },
        { name: 'Memory', value: 45, color: '#82ca9d' },
        { name: 'CPU', value: 72, color: '#ffc658' },
        { name: 'Network', value: 38, color: '#ff8042' },
      ],
      performanceData: [
        { name: 'Mon', devices: 4000, updates: 2400, issues: 2400 },
        { name: 'Tue', devices: 3000, updates: 1398, issues: 2210 },
        { name: 'Wed', devices: 2000, updates: 9800, issues: 2290 },
        { name: 'Thu', devices: 2780, updates: 3908, issues: 2000 },
        { name: 'Fri', devices: 1890, updates: 4800, issues: 2181 },
        { name: 'Sat', devices: 2390, updates: 3800, issues: 2500 },
        { name: 'Sun', devices: 3490, updates: 4300, issues: 2100 },
      ],
      securityAlerts: [
        { id: 1, severity: 'high', title: 'Critical Security Update Required', count: 5 },
        { id: 2, severity: 'medium', title: 'Outdated Certificates', count: 12 },
        { id: 3, severity: 'low', title: 'Recommended Security Settings', count: 8 },
      ],
    };
  });
};

const StatusChip = ({ status }: { status: string }) => {
  switch (status) {
    case 'success':
      return <Chip icon={<CheckCircleIcon fontSize="small" />} label="Success" color="success" size="small" />;
    case 'warning':
      return <Chip icon={<WarningIcon fontSize="small" />} label="Warning" color="warning" size="small" />;
    case 'error':
      return <Chip icon={<ErrorIcon fontSize="small" />} label="Error" color="error" size="small" />;
    case 'info':
    default:
      return <Chip icon={<InfoIcon fontSize="small" />} label="Info" color="info" size="small" />;
  }
};

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  trend,
  trendText,
  onClick
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  onClick?: () => void;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const colors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
  };
  
  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };
  
  const trendColors = {
    up: theme.palette.success.main,
    down: theme.palette.error.main,
    neutral: theme.palette.text.secondary,
  };
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, p: isMobile ? 2 : 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight={600}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: `${colors[color]}10`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors[color],
            }}
          >
            {icon}
          </Box>
        </Box>
        
        {(trend || trendText) && (
          <Box display="flex" alignItems="center" mt={1}>
            {trend && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: trendColors[trend],
                  fontWeight: 600,
                  mr: 1,
                }}
              >
                {trendIcons[trend]} {trendText}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const { data, isLoading, error, refetch } = useDashboardData();
  
  const handleRefresh = () => {
    refetch();
  };
  
  const handleViewAll = (path: string) => {
    navigate(path);
  };
  
  const handleStatClick = (path: string) => {
    navigate(path);
  };
  
  if (isLoading) {
    return (
      <Box p={3}>
        <Grid container spacing={3}>
          {[...Array(8)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" gutterBottom>
          Error loading dashboard data. Please try again.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  if (!data) return null;
  
  const { stats, recentActivities, deviceStatus, updateStatus, resourceUsage, performanceData, securityAlerts } = data;
  
  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom={false}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening with your devices.
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            size={isMobile ? 'small' : 'medium'}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SystemUpdateIcon />}
            onClick={() => handleViewAll('/deployments/new')}
            size={isMobile ? 'small' : 'medium'}
          >
            Deploy Update
          </Button>
        </Box>
      </Box>
      
      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Devices" 
            value={stats.totalDevices.toLocaleString()} 
            icon={<DevicesIcon />}
            color="primary"
            trend="up"
            trendText="5% from last month"
            onClick={() => handleStatClick('/devices')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Online Devices" 
            value={`${stats.onlineDevices.toLocaleString()}`} 
            icon={<CheckCircleIcon />}
            color="success"
            trend="up"
            trendText="3% from yesterday"
            onClick={() => handleStatClick('/devices?status=online')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Pending Updates" 
            value={stats.pendingUpdates.toLocaleString()} 
            icon={<UpdateIcon />}
            color="warning"
            trend="down"
            trendText="12% from last week"
            onClick={() => handleStatClick('/updates?status=pending')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Security Issues" 
            value={stats.securityIssues.toLocaleString()} 
            icon={<SecurityIcon />}
            color="error"
            trend="up"
            trendText="2 new today"
            onClick={() => handleStatClick('/security')}
          />
        </Grid>
      </Grid>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader 
              title="Performance Overview" 
              subheader="Last 7 days"
              action={
                <IconButton onClick={handleRefresh} size="small">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              }
            />
            <Divider />
            <Box sx={{ p: 2, height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={performanceData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: theme.palette.text.secondary }}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke={theme.palette.primary.main}
                    tick={{ fill: theme.palette.text.secondary }}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={theme.palette.secondary.main}
                    tick={{ fill: theme.palette.text.secondary }}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      boxShadow: theme.shadows[3],
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="devices"
                    name="Active Devices"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="updates"
                    name="Updates Deployed"
                    stroke={theme.palette.secondary.main}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
        
        {/* Device Status */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader 
              title="Device Status" 
              action={
                <Button 
                  size="small" 
                  color="primary"
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  onClick={() => handleViewAll('/devices')}
                >
                  View All
                </Button>
              }
            />
            <Divider />
            <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Online
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.onlineDevices} ({Math.round((stats.onlineDevices / stats.totalDevices) * 100)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(stats.onlineDevices / stats.totalDevices) * 100} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Offline
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.offlineDevices} ({Math.round((stats.offlineDevices / stats.totalDevices) * 100)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(stats.offlineDevices / stats.totalDevices) * 100} 
                  color="error"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={deviceStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {deviceStatus.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? theme.palette.success.main : theme.palette.error.main} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [
                        value,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>
        
        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Recent Activities" 
              subheader={`Last ${recentActivities.length} activities`}
              action={
                <Button 
                  size="small" 
                  color="primary"
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  onClick={() => handleViewAll('/activity')}
                >
                  View All
                </Button>
              }
            />
            <Divider />
            <List sx={{ p: 0 }}>
              {recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => {
                      // Handle activity click
                      console.log('Activity clicked:', activity.id);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: theme.palette.background.paper,
                          color: theme.palette.getContrastText(theme.palette.background.paper),
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        {activity.type === 'update' && <SystemUpdateIcon color="primary" />}
                        {activity.type === 'alert' && <WarningIcon color="warning" />}
                        {activity.type === 'device' && <DevicesIcon color="info" />}
                        {activity.type === 'maintenance' && <ScheduleIcon color="secondary" />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" component="div">
                          {activity.title}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            display="block"
                            mb={0.5}
                          >
                            {activity.description}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <StatusChip status={activity.status} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        </Grid>
        
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader 
              title="System Status" 
              action={
                <IconButton onClick={handleRefresh} size="small">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              }
            />
            <Divider />
            <Box sx={{ p: 3, flexGrow: 1 }}>
              <Grid container spacing={3}>
                {/* Resource Usage */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Resource Usage
                  </Typography>
                  <Grid container spacing={2}>
                    {resourceUsage.map((resource, index) => (
                      <Grid item xs={6} key={index}>
                        <Box mb={2}>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              {resource.name}
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                              {resource.value}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={resource.value} 
                            color={
                              resource.value > 80 ? 'error' : 
                              resource.value > 60 ? 'warning' : 'primary'
                            }
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              backgroundColor: theme.palette.action.hover,
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                
                {/* Update Status */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Update Status
                  </Typography>
                  <Box sx={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={updateStatus}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                        <XAxis 
                          type="number" 
                          tick={{ fill: theme.palette.text.secondary }}
                          axisLine={{ stroke: theme.palette.divider }}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          scale="band"
                          tick={{ fill: theme.palette.text.secondary }}
                          axisLine={{ stroke: theme.palette.divider }}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: theme.shape.borderRadius,
                            boxShadow: theme.shadows[3],
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill={theme.palette.primary.main}
                          radius={[0, 4, 4, 0]}
                        >
                          {updateStatus.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                index === 0 ? theme.palette.warning.main :
                                index === 1 ? theme.palette.success.main :
                                theme.palette.error.main
                              } 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                
                {/* Security Alerts */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Security Alerts
                  </Typography>
                  <Stack spacing={1}>
                    {securityAlerts.map((alert, index) => (
                      <Paper 
                        key={index} 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderLeft: `4px solid ${
                            alert.severity === 'high' ? theme.palette.error.main :
                            alert.severity === 'medium' ? theme.palette.warning.main :
                            theme.palette.info.main
                          }`,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            cursor: 'pointer',
                          },
                        }}
                        onClick={() => handleViewAll(`/security?alert=${alert.id}`)}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {alert.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.count} {alert.count === 1 ? 'device' : 'devices'} affected
                            </Typography>
                          </Box>
                          <Box>
                            <Chip 
                              label={alert.severity.toUpperCase()} 
                              size="small" 
                              color={
                                alert.severity === 'high' ? 'error' :
                                alert.severity === 'medium' ? 'warning' : 'info'
                              }
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
