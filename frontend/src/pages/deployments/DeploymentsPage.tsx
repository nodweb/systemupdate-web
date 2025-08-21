import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Box, Button, Card, CardContent, CardHeader, 
  Chip, Divider, Grid, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TablePagination, 
  TableRow, TableSortLabel, TextField, Typography,
  useTheme, useMediaQuery, InputAdornment, IconButton,
  Menu, MenuItem, Checkbox, LinearProgress, Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, Search as SearchIcon, FilterList as FilterListIcon, 
  Refresh as RefreshIcon, MoreVert as MoreVertIcon, Delete as DeleteIcon,
  Edit as EditIcon, Visibility as VisibilityIcon, Download as DownloadIcon,
  PlayArrow as PlayArrowIcon, Pause as PauseIcon, Stop as StopIcon,
  Schedule as ScheduleIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon,
  HourglassEmpty as PendingIcon, Warning as WarningIcon, ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Types
type DeploymentStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'cancelled';
type DeploymentType = 'manual' | 'scheduled' | 'recurring';

interface Deployment {
  id: string;
  name: string;
  description: string;
  status: DeploymentStatus;
  type: DeploymentType;
  startTime: string;
  endTime?: string;
  createdBy: string;
  createdAt: string;
  targetDevices: number;
  completedDevices: number;
  failedDevices: number;
  progress: number;
  updateId: string;
  updateName: string;
  schedule?: {
    startAt: string;
    endAt?: string;
    repeat?: 'daily' | 'weekly' | 'monthly';
  };
}

// Mock data generator
const createMockDeployments = (count: number): Deployment[] => {
  const statuses: DeploymentStatus[] = ['scheduled', 'in_progress', 'completed', 'failed', 'paused', 'cancelled'];
  const types: DeploymentType[] = ['manual', 'scheduled', 'recurring'];
  const updates = [
    { id: 'update-1', name: 'Security Update 2023.10' },
    { id: 'update-2', name: 'Feature Update 23H2' },
    { id: 'update-3', name: 'Driver Package 1.2.3' },
    { id: 'update-4', name: 'Application Update v5.0' },
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const update = updates[Math.floor(Math.random() * updates.length)];
    const now = new Date();
    const startTime = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const endTime = status === 'in_progress' ? undefined : new Date(startTime.getTime() + Math.floor(Math.random() * 24 * 60 * 60 * 1000));
    const targetDevices = Math.floor(Math.random() * 1000) + 10;
    const completedDevices = status === 'completed' ? targetDevices : Math.floor(Math.random() * targetDevices);
    const failedDevices = status === 'completed' ? 0 : Math.floor(Math.random() * (targetDevices - completedDevices));
    
    return {
      id: `deploy-${i}`,
      name: `Deployment ${i + 1}: ${update.name}`,
      description: `Deployment of ${update.name} to ${targetDevices} devices`,
      status,
      type,
      startTime: startTime.toISOString(),
      endTime: endTime?.toISOString(),
      createdBy: `user${Math.floor(Math.random() * 5) + 1}@example.com`,
      createdAt: new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
      targetDevices,
      completedDevices,
      failedDevices,
      progress: Math.min(100, Math.floor((completedDevices / targetDevices) * 100)),
      updateId: update.id,
      updateName: update.name,
      ...(type !== 'manual' && {
        schedule: {
          startAt: startTime.toISOString(),
          ...(status === 'completed' && { endAt: endTime?.toISOString() }),
          ...(type === 'recurring' && {
            repeat: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)] as 'daily' | 'weekly' | 'monthly'
          })
        }
      })
    };
  });
};

// Mock API function
const fetchDeployments = async (): Promise<Deployment[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(createMockDeployments(25)), 500);
  });
};

const DeploymentsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Deployment>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  const { data: deployments = [], isLoading, refetch } = useQuery('deployments', fetchDeployments);

  // Handle sorting
  const handleRequestSort = (property: keyof Deployment) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDeployment(null);
  };

  // Filter and sort deployments
  const filteredDeployments = useMemo(() => {
    return deployments
      .filter(deployment => {
        const matchesSearch = 
          deployment.name.toLowerCase().includes(searchText.toLowerCase()) ||
          deployment.description.toLowerCase().includes(searchText.toLowerCase()) ||
          deployment.updateName.toLowerCase().includes(searchText.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || deployment.status === filterStatus;
        const matchesType = filterType === 'all' || deployment.type === filterType;
        
        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        let comparison = 0;
        const aValue = a[orderBy];
        const bValue = b[orderBy];
        
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        
        return order === 'asc' ? comparison : -comparison;
      });
  }, [deployments, searchText, filterStatus, filterType, orderBy, order]);

  // Get status color
  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'scheduled': return 'warning';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'in_progress': return <PlayArrowIcon color="info" />;
      case 'scheduled': return <ScheduleIcon color="warning" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'paused': return <PauseIcon color="warning" />;
      case 'cancelled': return <StopIcon color="disabled" />;
      default: return <PendingIcon />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format duration
  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader 
          title="Deployments" 
          subheader={`${filteredDeployments.length} deployments found`}
          action={
            <Box display="flex" gap={1}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {}}
              >
                New Deployment
              </Button>
            </Box>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search deployments..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="all">All Types</option>
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="recurring">Recurring</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                startIcon={<FilterListIcon />}
                fullWidth
              >
                More Filters
              </Button>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
              <Table stickyHeader aria-label="deployments table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name / Update</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'status'}
                        direction={orderBy === 'status' ? order : 'asc'}
                        onClick={() => handleRequestSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'startTime'}
                        direction={orderBy === 'startTime' ? order : 'desc'}
                        onClick={() => handleRequestSort('startTime')}
                      >
                        Start Time
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Devices</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        Loading deployments...
                      </TableCell>
                    </TableRow>
                  ) : filteredDeployments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        No deployments found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeployments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((deployment) => (
                        <TableRow hover key={deployment.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {deployment.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {deployment.updateName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(deployment.status)}
                              <Chip 
                                label={deployment.status.split('_').map(s => 
                                  s.charAt(0).toUpperCase() + s.slice(1)
                                ).join(' ')}
                                size="small"
                                color={getStatusColor(deployment.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Box width="100%" maxWidth={100}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={deployment.progress} 
                                  color={
                                    deployment.status === 'failed' ? 'error' : 
                                    deployment.status === 'completed' ? 'success' : 'primary'
                                  }
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {deployment.progress}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(deployment.startTime)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {deployment.schedule?.repeat && `(${deployment.schedule.repeat})`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {deployment.endTime 
                              ? formatDuration(deployment.startTime, deployment.endTime)
                              : formatDuration(deployment.startTime)}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {deployment.completedDevices}/{deployment.targetDevices} devices
                              </Typography>
                              {deployment.failedDevices > 0 && (
                                <Typography variant="caption" color="error">
                                  {deployment.failedDevices} failed
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={(e) => handleMenuOpen(e, deployment)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredDeployments.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </CardContent>
      </Card>

      {/* Deployment actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleMenuClose}
          disabled={!['scheduled', 'paused'].includes(selectedDeployment?.status || '')}
        >
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Start</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleMenuClose}
          disabled={selectedDeployment?.status !== 'in_progress'}
        >
          <ListItemIcon>
            <PauseIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Pause</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleMenuClose}
          disabled={!['in_progress', 'scheduled', 'paused'].includes(selectedDeployment?.status || '')}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <StopIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Cancel</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Report</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleMenuClose}
          disabled={!['completed', 'failed', 'cancelled'].includes(selectedDeployment?.status || '')}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DeploymentsPage;
