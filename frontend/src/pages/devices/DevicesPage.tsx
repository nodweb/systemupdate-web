import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  Box, Button, Card, CardContent, CardHeader, 
  Chip, Divider, Grid, IconButton, Paper, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TablePagination, TableRow, TableSortLabel, 
  TextField, Toolbar, Tooltip, Typography, 
  useTheme, useMediaQuery, InputAdornment, Menu, 
  MenuItem, Checkbox, FormControlLabel, Switch
} from '@mui/material';
import { 
  Add as AddIcon, Search as SearchIcon, FilterList as FilterListIcon, 
  Refresh as RefreshIcon, MoreVert as MoreVertIcon, Delete as DeleteIcon,
  Edit as EditIcon, Visibility as VisibilityIcon, Download as DownloadIcon,
  ArrowDownward as ArrowDownwardIcon, ArrowUpward as ArrowUpwardIcon,
  Computer as ComputerIcon, PhoneIphone as PhoneIcon, Tablet as TabletIcon,
  Watch as WatchIcon, MoreHoriz as OtherDeviceIcon, Cloud as OnlineIcon,
  CloudOff as OfflineIcon, Warning as WarningIcon, Error as ErrorIcon,
  CloudQueue as UnknownStatusIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Types
type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'disconnected' | 'error';
type DeviceType = 'computer' | 'phone' | 'tablet' | 'iot' | 'other';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeen: string;
  ipAddress: string;
  model: string;
  os: string;
  osVersion: string;
  tags: string[];
}

// Mock data generator
const createMockDevices = (count: number): Device[] => {
  const types: DeviceType[] = ['computer', 'phone', 'tablet', 'iot', 'other'];
  const statuses: DeviceStatus[] = ['online', 'offline', 'maintenance', 'disconnected', 'error'];
  const osList = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
  const models = ['XPS 13', 'iPhone 13', 'iPad Pro', 'Raspberry Pi', 'Custom'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `device-${i}`,
    name: `Device ${i + 1}`,
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    lastSeen: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    model: models[Math.floor(Math.random() * models.length)],
    os: osList[Math.floor(Math.random() * osList.length)],
    osVersion: `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
    tags: ['IT', 'Office', 'Remote'].filter(() => Math.random() > 0.5)
  }));
};

// Mock API function
const fetchDevices = async (): Promise<Device[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(createMockDevices(50)), 500);
  });
};

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Device>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const { data: devices = [], isLoading, refetch } = useQuery('devices', fetchDevices);

  const handleRequestSort = (property: keyof Device) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = devices.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, device: Device) => {
    setSelectedDevice(device);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDevice(null);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = 
        device.name.toLowerCase().includes(searchText.toLowerCase()) ||
        device.model.toLowerCase().includes(searchText.toLowerCase()) ||
        device.ipAddress.includes(searchText);
      
      const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
      const matchesType = filterType === 'all' || device.type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [devices, searchText, filterStatus, filterType, orderBy, order]);

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredDevices.length) : 0;

  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case 'online': return <OnlineIcon color="success" fontSize="small" />;
      case 'offline': return <OfflineIcon color="error" fontSize="small" />;
      case 'maintenance': return <WarningIcon color="warning" fontSize="small" />;
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      default: return <UnknownStatusIcon color="disabled" fontSize="small" />;
    }
  };

  const getTypeIcon = (type: DeviceType) => {
    switch (type) {
      case 'computer': return <ComputerIcon fontSize="small" />;
      case 'phone': return <PhoneIcon fontSize="small" />;
      case 'tablet': return <TabletIcon fontSize="small" />;
      case 'iot': return <WatchIcon fontSize="small" />;
      default: return <OtherDeviceIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader 
          title="Devices" 
          action={
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => {}}
            >
              Add Device
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search devices..."
                value={searchText}
                onChange={handleSearchChange}
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
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
                <option value="error">Error</option>
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
                <option value="computer">Computer</option>
                <option value="phone">Phone</option>
                <option value="tablet">Tablet</option>
                <option value="iot">IoT</option>
                <option value="other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={() => {}}
              >
                Export
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<FilterListIcon />}
                onClick={() => {}}
              >
                Filters
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => refetch()}
              >
                <RefreshIcon />
              </Button>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
              <Table stickyHeader aria-label="devices table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < filteredDevices.length}
                        checked={filteredDevices.length > 0 && selected.length === filteredDevices.length}
                        onChange={handleSelectAllClick}
                      />
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'name'}
                        direction={orderBy === 'name' ? order : 'asc'}
                        onClick={() => handleRequestSort('name')}
                      >
                        Device Name
                        {orderBy === 'name' ? (
                          <span style={{ display: 'none' }}>
                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                          </span>
                        ) : null}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>OS</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        Loading devices...
                      </TableCell>
                    </TableRow>
                  ) : filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        No devices found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((device) => {
                        const isItemSelected = isSelected(device.id);
                        const labelId = `device-${device.id}-checkbox`;

                        return (
                          <TableRow
                            hover
                            role="checkbox"
                            aria-checked={isItemSelected}
                            tabIndex={-1}
                            key={device.id}
                            selected={isItemSelected}
                            sx={{ '&:hover .device-actions': { opacity: 1 } }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isItemSelected}
                                inputProps={{ 'aria-labelledby': labelId }}
                                onClick={(event) => handleClick(event, device.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Box mr={1}>
                                  {getTypeIcon(device.type)}
                                </Box>
                                <Box>
                                  <Typography variant="body2" noWrap>
                                    {device.name}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" noWrap>
                                    {device.model}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={device.type.charAt(0).toUpperCase() + device.type.slice(1)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Box mr={1}>
                                  {getStatusIcon(device.status)}
                                </Box>
                                <Typography variant="body2">
                                  {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {device.os} {device.osVersion}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {device.ipAddress}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={new Date(device.lastSeen).toLocaleString()} arrow>
                                <Typography variant="body2" noWrap>
                                  {formatDistanceToNow(parseISO(device.lastSeen), { addSuffix: true })}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Box className="device-actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleMenuOpen(e, device)}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                  {emptyRows > 0 && (
                    <TableRow style={{ height: 53 * emptyRows }}>
                      <TableCell colSpan={8} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredDevices.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </CardContent>
      </Card>

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
        <MenuItem 
          onClick={() => {
            if (selectedDevice) {
              navigate(`/devices/${selectedDevice.id}`);
            }
            handleMenuClose();
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedDevice) {
              navigate(`/devices/${selectedDevice.id}/edit`);
            }
            handleMenuClose();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => {
            // TODO: Implement delete confirmation
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DevicesPage;
