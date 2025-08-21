import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Box, Card, CardContent, CardHeader, 
  Grid, Typography, Divider, useTheme,
  useMediaQuery, LinearProgress, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Menu, MenuItem,
  List, ListItem, ListItemText, ListItemIcon, Button
} from '@mui/material';
import { 
  Refresh as RefreshIcon, MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon,
  Equalizer as EqualizerIcon, Storage as StorageIcon,
  Update as UpdateIcon, Devices as DevicesIcon,
  CheckCircle as CheckCircleIcon, Error as ErrorIcon,
  Warning as WarningIcon, Info as InfoIcon,
  Timeline as TimelineIcon, BarChart as BarChartIcon,
  PieChart as PieChartIcon, TableChart as TableChartIcon,
  DateRange as DateRangeIcon, FilterList as FilterListIcon,
  Download as DownloadIcon, CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { 
  LineChart, Line, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, 
  YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, 
  Area, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { format, subDays, subMonths, subYears } from 'date-fns';

// Types
type TimeRange = '24h' | '7d' | '30d' | '90d' | '12m' | 'all';
type MetricType = 'updates' | 'devices' | 'deployments' | 'commands';

interface MetricData {
  date: string;
  value: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface TopItem {
  id: string;
  name: string;
  count: number;
  change: number;
}

// Mock data generators
const generateTimeSeriesData = (days: number, min: number, max: number): MetricData[] => {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - i - 1), 'MMM d'),
    value: Math.floor(Math.random() * (max - min + 1)) + min,
  }));
};

const generateStatusData = (statuses: string[]): StatusDistribution[] => {
  const total = 100;
  const counts = statuses.map(() => Math.floor(Math.random() * 50) + 10);
  const sum = counts.reduce((a, b) => a + b, 0);
  
  return statuses.map((status, i) => ({
    status,
    count: counts[i],
    percentage: Math.round((counts[i] / sum) * 100)
  }));
};

const generateTopItems = (count: number, prefix: string): TopItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    name: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} ${i + 1}`,
    count: Math.floor(Math.random() * 1000) + 100,
    change: Math.floor(Math.random() * 40) - 15, // -15% to +25%
  }));
};

// Mock API functions
const fetchUpdateMetrics = async (range: TimeRange = '30d') => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const days = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  
  return {
    installed: generateTimeSeriesData(days, 5, 50),
    failed: generateTimeSeriesData(days, 0, 10),
    pending: generateTimeSeriesData(days, 0, 30),
    status: generateStatusData(['Installed', 'Failed', 'Pending', 'Downloading']),
    topUpdates: generateTopItems(5, 'update'),
    topDevices: generateTopItems(5, 'device'),
  };
};

// Color palette
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'
];

const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState<MetricType>('updates');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMetric, setSelectedMetric] = useState<null | string>(null);

  // Fetch data based on active tab and time range
  const { data: updateData, isLoading, refetch } = useQuery(
    ['analytics', 'updates', timeRange],
    () => fetchUpdateMetrics(timeRange),
    { keepPreviousData: true }
  );

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: MetricType) => {
    setActiveTab(newValue);
  };

  // Handle time range change
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
  };

  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, metric: string) => {
    setSelectedMetric(metric);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMetric(null);
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!updateData) return null;
    
    const totalInstalled = updateData.installed.reduce((sum, item) => sum + item.value, 0);
    const totalFailed = updateData.failed.reduce((sum, item) => sum + item.value, 0);
    const totalPending = updateData.pending.reduce((sum, item) => sum + item.value, 0);
    const successRate = totalInstalled / (totalInstalled + totalFailed) * 100;
    
    return {
      totalInstalled,
      totalFailed,
      totalPending,
      successRate: isNaN(successRate) ? 0 : successRate,
      avgPerDay: Math.round(totalInstalled / updateData.installed.length)
    };
  }, [updateData]);

  // Time range options
  const timeRangeOptions = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '12m', label: '12 Months' },
    { value: 'all', label: 'All Time' },
  ];

  // Render metric card
  const renderMetricCard = (title: string, value: string | number, icon: React.ReactNode, color: string, change?: number) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Box display="flex" alignItems="flex-end" mt={1}>
          <Typography variant="h4" component="div">
            {typeof value === 'number' ? formatNumber(value) : value}
          </Typography>
          {change !== undefined && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                ml: 1,
                color: change >= 0 ? 'success.main' : 'error.main',
              }}
            >
              {change >= 0 ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
              <Typography variant="body2" sx={{ ml: 0.5 }}>
                {Math.abs(change)}%
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // Render status distribution chart
  const renderStatusChart = (data: StatusDistribution[]) => (
    <Card>
      <CardHeader 
        title="Status Distribution" 
        action={
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'status')}>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent>
        <Box display="flex" justifyContent="center" height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} (${Math.round((value / data.reduce((a, b) => a + b.count, 0)) * 100)}%)`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );

  // Render time series chart
  const renderTimeSeriesChart = (title: string, data: MetricData[], color: string) => (
    <Card>
      <CardHeader 
        title={title} 
        action={
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, title.toLowerCase())}>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent>
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`color${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                  boxShadow: theme.shadows[2],
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fillOpacity={1}
                fill={`url(#color${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );

  // Render top items table
  const renderTopItems = (title: string, items: TopItem[]) => (
    <Card>
      <CardHeader 
        title={title} 
        action={
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, title.toLowerCase())}>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Count</TableCell>
              <TableCell align="right">Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="body2">{item.name}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatNumber(item.count)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="flex-end"
                    color={item.change >= 0 ? 'success.main' : 'error.main'}
                  >
                    {item.change >= 0 ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {Math.abs(item.change)}%
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );

  // Loading state
  if (isLoading || !updateData || !summaryMetrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Box textAlign="center">
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Loading analytics data...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with title and actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<DateRangeIcon />}
            onClick={(e) => {
              const button = e.currentTarget;
              setAnchorEl(button);
            }}
          >
            {timeRangeOptions.find(opt => opt.value === timeRange)?.label}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Time range menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {timeRangeOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={timeRange === option.value}
            onClick={() => {
              handleTimeRangeChange(option.value as TimeRange);
              setAnchorEl(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Summary metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Total Installed Updates',
            summaryMetrics.totalInstalled,
            <CloudDownloadIcon />,
            theme.palette.primary.main,
            12.5
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Success Rate',
            `${summaryMetrics.successRate.toFixed(1)}%`,
            <CheckCircleIcon />,
            theme.palette.success.main,
            5.2
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Failed Updates',
            summaryMetrics.totalFailed,
            <ErrorIcon />,
            theme.palette.error.main,
            -2.3
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Avg. Per Day',
            summaryMetrics.avgPerDay,
            <EqualizerIcon />,
            theme.palette.warning.main,
            8.1
          )}
        </Grid>
      </Grid>

      {/* Main content */}
      <Grid container spacing={3}>
        {/* Left column */}
        <Grid item xs={12} lg={8}>
          {/* Time series chart */}
          <Box mb={3}>
            {renderTimeSeriesChart('Updates Over Time', updateData.installed, theme.palette.primary.main)}
          </Box>
          
          {/* Top updates */}
          <Box mb={3}>
            {renderTopItems('Top Updates', updateData.topUpdates)}
          </Box>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} lg={4}>
          {/* Status distribution */}
          <Box mb={3}>
            {renderStatusChart(updateData.status)}
          </Box>
          
          {/* Top devices */}
          <Box>
            {renderTopItems('Top Devices', updateData.topDevices)}
          </Box>
        </Grid>
      </Grid>

      {/* More analytics sections */}
      <Box mt={3}>
        <Card>
          <CardHeader 
            title="Detailed Analytics" 
            subheader="Additional metrics and insights"
          />
          <CardContent>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3 }}
            >
              <Tab label="Updates" value="updates" icon={<UpdateIcon />} iconPosition="start" />
              <Tab label="Devices" value="devices" icon={<DevicesIcon />} iconPosition="start" />
              <Tab label="Deployments" value="deployments" icon={<StorageIcon />} iconPosition="start" />
              <Tab label="Commands" value="commands" icon={<TimelineIcon />} iconPosition="start" />
            </Tabs>

            {activeTab === 'updates' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Update Analytics
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Detailed statistics and trends for system updates across your devices.
                </Typography>
                <Box height={300} mt={2}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={updateData.installed}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Updates" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}

            {activeTab === 'devices' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Device Analytics
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Insights into device health, status, and update compliance.
                </Typography>
              </Box>
            )}

            {activeTab === 'deployments' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Deployment Analytics
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Track deployment success rates, durations, and patterns.
                </Typography>
              </Box>
            )}

            {activeTab === 'commands' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Command Analytics
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Monitor command execution and performance metrics.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AnalyticsPage;
