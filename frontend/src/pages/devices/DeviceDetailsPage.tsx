import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, CardHeader, Chip, Divider, Grid, IconButton,
  List, ListItem, ListItemIcon, ListItemText, Tabs, Tab, Typography, useTheme,
  useMediaQuery, LinearProgress, Tooltip, Alert, AlertTitle, Breadcrumbs, Link as MuiLink
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Edit as EditIcon, Refresh as RefreshIcon, Delete as DeleteIcon,
  Computer as ComputerIcon, PhoneIphone as PhoneIcon, Tablet as TabletIcon, Watch as WatchIcon,
  MoreHoriz as OtherDeviceIcon, Cloud as OnlineIcon, CloudOff as OfflineIcon, Warning as WarningIcon,
  Error as ErrorIcon, CloudQueue as UnknownStatusIcon, CheckCircle as CheckCircleIcon,
  Memory as MemoryIcon, Storage as StorageIcon, Speed as CpuIcon, NetworkWifi as NetworkIcon,
  BatteryFull as BatteryFullIcon, Battery80 as Battery80Icon, Battery50 as Battery50Icon,
  Battery20 as Battery20Icon, BatteryAlert as BatteryAlertIcon, Security as SecurityIcon,
  Update as UpdateIcon, History as HistoryIcon, Settings as SettingsIcon, Info as InfoIcon,
  VpnKey as VpnKeyIcon, Group as GroupIcon, Wifi as WifiIcon, SsidChart as WifiSignalIcon,
  Dns as DnsIcon, Router as RouterIcon, Home as HomeIcon, Devices as DevicesIcon,
  Lock as LockIcon, LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Types
type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'disconnected' | 'error';
type DeviceType = 'computer' | 'phone' | 'tablet' | 'iot' | 'other';
type DeviceOS = 'windows' | 'linux' | 'android' | 'ios' | 'macos' | 'other';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  os: DeviceOS;
  osVersion: string;
  status: DeviceStatus;
  lastSeen: string;
  ipAddress: string;
  macAddress: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  cpuCores?: number;
  memoryTotal?: number;
  diskTotal?: number;
  diskUsed?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  isVirtual?: boolean;
  tags: string[];
  group?: string;
  network?: {
    ssid?: string;
    connectionType?: 'wifi' | 'ethernet' | 'cellular' | 'unknown';
    signalStrength?: number;
    ipv4?: string[];
    ipv6?: string[];
    gateway?: string;
  };
  security?: {
    isEncrypted?: boolean;
    isRooted?: boolean;
    vulnerabilities?: Array<{
      id: string;
      name: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
  };
  updates?: {
    pendingUpdates?: number;
    pendingSecurityUpdates?: number;
    lastChecked?: string;
    lastInstalled?: string;
  };
  performance?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };
}

// Mock API function
const fetchDevice = async (id: string): Promise<Device> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const types: DeviceType[] = ['computer', 'phone', 'tablet', 'iot', 'other'];
      const statuses: DeviceStatus[] = ['online', 'offline', 'maintenance', 'disconnected', 'error'];
      const osList: DeviceOS[] = ['windows', 'linux', 'android', 'ios', 'macos', 'other'];
      const manufacturers = ['Dell', 'HP', 'Lenovo', 'Apple', 'Samsung', 'Microsoft'];
      const models = ['XPS 13', 'MacBook Pro', 'ThinkPad X1', 'Surface Pro', 'Galaxy S21', 'iPhone 13'];
      
      const device: Device = {
        id,
        name: `${manufacturers[Math.floor(Math.random() * manufacturers.length)]} ${models[Math.floor(Math.random() * models.length)]}`,
        type: types[Math.floor(Math.random() * types.length)],
        os: osList[Math.floor(Math.random() * osList.length)],
        osVersion: `${Math.floor(Math.random() * 10) + 8}.${Math.floor(Math.random() * 10)}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        macAddress: Array.from({ length: 6 }, () => 
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':'),
        model: models[Math.floor(Math.random() * models.length)],
        manufacturer: manufacturers[Math.floor(Math.random() * manufacturers.length)],
        serialNumber: `SN${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        cpuCores: [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)],
        memoryTotal: [4, 8, 16, 32, 64][Math.floor(Math.random() * 5)] * 1024,
        diskTotal: [256, 512, 1000, 2000][Math.floor(Math.random() * 4)],
        diskUsed: Math.floor(Math.random() * 1000),
        batteryLevel: Math.random() > 0.3 ? Math.floor(Math.random() * 100) : undefined,
        isCharging: Math.random() > 0.7,
        isVirtual: Math.random() > 0.7,
        tags: ['IT', 'Office', 'Remote'].filter(() => Math.random() > 0.5),
        group: ['Engineering', 'Sales', 'Support', 'Management'][Math.floor(Math.random() * 4)],
        network: {
          ssid: `WiFi-${Math.floor(Math.random() * 100)}`,
          connectionType: ['wifi', 'ethernet', 'cellular', 'unknown'][Math.floor(Math.random() * 4)] as any,
          signalStrength: -Math.floor(Math.random() * 50) - 50,
          ipv4: [`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`],
          gateway: `192.168.${Math.floor(Math.random() * 255)}.1`,
        },
        security: {
          isEncrypted: Math.random() > 0.3,
          isRooted: Math.random() > 0.8,
          vulnerabilities: Math.random() > 0.5 ? [
            { id: 'CVE-2023-1234', name: 'Vulnerability 1', severity: 'high' },
            { id: 'CVE-2023-5678', name: 'Vulnerability 2', severity: 'medium' }
          ] : []
        },
        updates: {
          pendingUpdates: Math.floor(Math.random() * 10),
          pendingSecurityUpdates: Math.floor(Math.random() * 3),
          lastChecked: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)).toISOString(),
          lastInstalled: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)).toISOString(),
        },
        performance: {
          cpuUsage: Math.floor(Math.random() * 100),
          memoryUsage: 30 + Math.floor(Math.random() * 60),
          diskUsage: 20 + Math.floor(Math.random() * 70)
        },
      };
      
      resolve(device);
    }, 500);
  });
};

const DeviceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = React.useState(0);
  
  const { data: device, isLoading, error, refetch } = useQuery<Device>(
    ['device', id],
    () => fetchDevice(id || ''),
    { enabled: !!id }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBack = () => {
    navigate('/devices');
  };

  const handleEdit = () => {
    if (device) {
      navigate(`/devices/${device.id}/edit`);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case 'online': return <OnlineIcon color="success" />;
      case 'offline': return <OfflineIcon color="error" />;
      case 'maintenance': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <UnknownStatusIcon color="disabled" />;
    }
  };

  const getTypeIcon = (type: DeviceType) => {
    switch (type) {
      case 'computer': return <ComputerIcon />;
      case 'phone': return <PhoneIcon />;
      case 'tablet': return <TabletIcon />;
      case 'iot': return <WatchIcon />;
      default: return <OtherDeviceIcon />;
    }
  };

  const getBatteryIcon = (level: number | undefined, isCharging?: boolean) => {
    if (level === undefined) return <BatteryAlertIcon color="disabled" />;
    if (isCharging) return <BatteryFullIcon color="success" />;
    if (level > 80) return <BatteryFullIcon color="success" />;
    if (level > 50) return <Battery80Icon color="success" />;
    if (level > 20) return <Battery50Icon color="warning" />;
    return <Battery20Icon color="error" />;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !device) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        Failed to load device details. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <MuiLink component={Link} to="/" color="inherit" underline="hover">
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </MuiLink>
          <MuiLink component={Link} to="/devices" color="inherit" underline="hover">
            <DevicesIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Devices
          </MuiLink>
          <Typography color="text.primary">{device.name}</Typography>
        </Breadcrumbs>
      </Box>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              {device.name}
            </Typography>
            <Box display="flex" alignItems="center" mt={0.5}>
              <Box mr={1}>
                {getStatusIcon(device.status)}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                {device.network?.connectionType && ` • ${device.network.connectionType}`}
                {device.ipAddress && ` • ${device.ipAddress}`}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="device details tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" />
          <Tab label="Performance" />
          <Tab label="Network" />
          <Tab label="Security" />
          <Tab label="Updates" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Device Information */}
            <Grid item xs={12} md={6} lg={4}>
              <Card>
                <CardHeader title="Device Information" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon>{getTypeIcon(device.type)}</ListItemIcon>
                      <ListItemText 
                        primary="Device Type" 
                        secondary={device.type.charAt(0).toUpperCase() + device.type.slice(1)} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SettingsIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Model" 
                        secondary={device.model || 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><InfoIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Manufacturer" 
                        secondary={device.manufacturer || 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><VpnKeyIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Serial Number" 
                        secondary={device.serialNumber || 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><GroupIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Group" 
                        secondary={device.group || 'Ungrouped'} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* System Information */}
            <Grid item xs={12} md={6} lg={4}>
              <Card>
                <CardHeader title="System Information" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon><ComputerIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Operating System" 
                        secondary={`${device.os.charAt(0).toUpperCase() + device.os.slice(1)} ${device.osVersion}`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CpuIcon /></ListItemIcon>
                      <ListItemText 
                        primary="CPU Cores" 
                        secondary={device.cpuCores || 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><MemoryIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Memory" 
                        secondary={device.memoryTotal ? `${Math.round(device.memoryTotal / 1024)} GB` : 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><StorageIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Storage" 
                        secondary={
                          device.diskTotal !== undefined && device.diskUsed !== undefined
                            ? `${Math.round(device.diskUsed)} GB / ${device.diskTotal} GB (${Math.round((device.diskUsed / device.diskTotal) * 100)}%)`
                            : 'Unknown'
                        } 
                      />
                      {device.diskTotal !== undefined && device.diskUsed !== undefined && (
                        <LinearProgress 
                          variant="determinate" 
                          value={(device.diskUsed / device.diskTotal) * 100} 
                          sx={{ width: 100, ml: 2 }}
                        />
                      )}
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={6} lg={4}>
              <Card>
                <CardHeader title="Status" />
                <Divider />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon>{getStatusIcon(device.status)}</ListItemIcon>
                      <ListItemText 
                        primary="Status" 
                        secondary={
                          <Chip 
                            label={device.status.charAt(0).toUpperCase() + device.status.slice(1)} 
                            size="small"
                            color={
                              device.status === 'online' ? 'success' :
                              device.status === 'offline' ? 'error' :
                              device.status === 'maintenance' ? 'warning' : 'default'
                            }
                            variant="outlined"
                          />
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {getBatteryIcon(device.batteryLevel, device.isCharging)}
                      </ListItemIcon>
                      <ListItemText 
                        primary="Battery" 
                        secondary={
                          device.batteryLevel !== undefined 
                            ? `${device.batteryLevel}% ${device.isCharging ? '(Charging)' : ''}`
                            : 'N/A'
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><HistoryIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Last Seen" 
                        secondary={
                          <Tooltip title={format(parseISO(device.lastSeen), 'PPpp')}>
                            <span>{formatDistanceToNow(parseISO(device.lastSeen), { addSuffix: true })}</span>
                          </Tooltip>
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><UpdateIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Pending Updates" 
                        secondary={
                          device.updates?.pendingUpdates ? (
                            <Chip 
                              label={`${device.updates.pendingUpdates} updates available`} 
                              size="small"
                              color={
                                device.updates.pendingSecurityUpdates ? 'error' : 'default'
                              }
                              variant="outlined"
                            />
                          ) : 'Up to date'
                        } 
                      />
                      {device.updates?.pendingSecurityUpdates ? (
                        <Chip 
                          label={`${device.updates.pendingSecurityUpdates} security`} 
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      ) : null}
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SecurityIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Security Status" 
                        secondary={
                          device.security?.vulnerabilities?.length ? (
                            <Chip 
                              label={`${device.security.vulnerabilities.length} vulnerabilities`} 
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          ) : 'Secure'
                        } 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Card>
            <CardHeader title="Performance Metrics" />
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>CPU Usage</Typography>
                  <Box display="flex" alignItems="center">
                    <Box width="100%" mr={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={device.performance?.cpuUsage || 0} 
                        color={
                          (device.performance?.cpuUsage || 0) > 80 ? 'error' :
                          (device.performance?.cpuUsage || 0) > 60 ? 'warning' : 'primary'
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {device.performance?.cpuUsage || 0}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>Memory Usage</Typography>
                  <Box display="flex" alignItems="center">
                    <Box width="100%" mr={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={device.performance?.memoryUsage || 0} 
                        color={
                          (device.performance?.memoryUsage || 0) > 80 ? 'error' :
                          (device.performance?.memoryUsage || 0) > 60 ? 'warning' : 'primary'
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {device.performance?.memoryUsage || 0}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>Disk Usage</Typography>
                  <Box display="flex" alignItems="center">
                    <Box width="100%" mr={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={device.performance?.diskUsage || 0} 
                        color={
                          (device.performance?.diskUsage || 0) > 80 ? 'error' :
                          (device.performance?.diskUsage || 0) > 60 ? 'warning' : 'primary'
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {device.performance?.diskUsage || 0}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && device.network && (
          <Card>
            <CardHeader title="Network Information" />
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemIcon><NetworkIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Connection Type" 
                        secondary={device.network.connectionType ? 
                          device.network.connectionType.charAt(0).toUpperCase() + device.network.connectionType.slice(1) : 
                          'Unknown'} 
                      />
                    </ListItem>
                    {device.network.ssid && (
                      <ListItem>
                        <ListItemIcon><WifiIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Wi-Fi Network" 
                          secondary={device.network.ssid} 
                        />
                      </ListItem>
                    )}
                    {device.network.signalStrength !== undefined && (
                      <ListItem>
                        <ListItemIcon><WifiSignalIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Signal Strength" 
                          secondary={`${device.network.signalStrength} dBm`} 
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemIcon><DnsIcon /></ListItemIcon>
                      <ListItemText 
                        primary="IP Address" 
                        secondary={device.ipAddress} 
                      />
                    </ListItem>
                    {device.network.ipv4?.length ? (
                      <ListItem>
                        <ListItemIcon><DnsIcon /></ListItemIcon>
                        <ListItemText 
                          primary="IPv4 Addresses" 
                          secondary={device.network.ipv4.join(', ')} 
                        />
                      </ListItem>
                    ) : null}
                    {device.network.gateway && (
                      <ListItem>
                        <ListItemIcon><RouterIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Default Gateway" 
                          secondary={device.network.gateway} 
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {activeTab === 3 && (
          <Card>
            <CardHeader title="Security Status" />
            <Divider />
            <CardContent>
              {device.security?.vulnerabilities?.length ? (
                <>
                  <Alert severity="error" sx={{ mb: 3 }}>
                    <AlertTitle>Security Vulnerabilities Detected</AlertTitle>
                    {device.security.vulnerabilities.length} security issues found that require attention.
                  </Alert>
                  
                  <List>
                    {device.security.vulnerabilities.map((vuln, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={vuln.name} 
                          secondary={
                            <>
                              <Chip 
                                label={vuln.severity} 
                                size="small" 
                                color={
                                  vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' :
                                  vuln.severity === 'medium' ? 'warning' : 'default'
                                }
                                sx={{ mr: 1 }}
                              />
                              {vuln.id}
                            </>
                          } 
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              ) : (
                <Alert severity="success">
                  <AlertTitle>No Security Issues Detected</AlertTitle>
                  This device is secure and up to date.
                </Alert>
              )}
              
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>Device Security</Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      {device.security?.isEncrypted ? (
                        <LockIcon color="success" />
                      ) : (
                        <LockOpenIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Disk Encryption" 
                      secondary={
                        device.security?.isEncrypted ? 'Enabled' : 'Not Enabled'
                      } 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {device.security?.isRooted ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <CheckCircleIcon color="success" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Root Access" 
                      secondary={
                        device.security?.isRooted ? 'Device is rooted' : 'No root access detected'
                      } 
                    />
                  </ListItem>
                </List>
              </Box>
            </CardContent>
          </Card>
        )}

        {activeTab === 4 && (
          <Card>
            <CardHeader title="Software Updates" />
            <Divider />
            <CardContent>
              {device.updates?.pendingUpdates ? (
                <>
                  <Alert 
                    severity={
                      device.updates.pendingSecurityUpdates ? 'error' : 'info'
                    } 
                    sx={{ mb: 3 }}
                  >
                    <AlertTitle>
                      {device.updates.pendingUpdates} Update{device.updates.pendingUpdates !== 1 ? 's' : ''} Available
                    </AlertTitle>
                    {device.updates.pendingSecurityUpdates ? (
                      <>{device.updates.pendingSecurityUpdates} security update{device.updates.pendingSecurityUpdates !== 1 ? 's' : ''} included</>
                    ) : (
                      <>All updates are non-security related</>
                    )}
                  </Alert>
                  
                  <Button variant="contained" color="primary">
                    Install All Updates
                  </Button>
                  
                  <Box mt={3}>
                    <List>
                      <ListItem>
                        <ListItemIcon><HistoryIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Last Checked" 
                          secondary={
                            device.updates?.lastChecked 
                              ? formatDistanceToNow(parseISO(device.updates.lastChecked), { addSuffix: true })
                              : 'Never'
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><UpdateIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Last Installed" 
                          secondary={
                            device.updates?.lastInstalled 
                              ? formatDistanceToNow(parseISO(device.updates.lastInstalled), { addSuffix: true })
                              : 'Never'
                          } 
                        />
                      </ListItem>
                    </List>
                  </Box>
                </>
              ) : (
                <Alert severity="success">
                  <AlertTitle>Device is Up to Date</AlertTitle>
                  No pending updates are available for this device.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default DeviceDetailsPage;
