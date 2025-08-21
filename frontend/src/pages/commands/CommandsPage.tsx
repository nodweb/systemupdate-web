import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Box, Button, Card, CardContent, CardHeader, 
  Chip, Divider, Grid, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TablePagination, 
  TableRow, TableSortLabel, TextField, Typography,
  useTheme, useMediaQuery, InputAdornment, IconButton,
  Menu, MenuItem, Checkbox, LinearProgress, Tooltip, 
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  FormControl, InputLabel, Select, FormHelperText
} from '@mui/material';
import { 
  Add as AddIcon, Search as SearchIcon, FilterList as FilterListIcon, 
  Refresh as RefreshIcon, MoreVert as MoreVertIcon, Delete as DeleteIcon,
  Edit as EditIcon, Visibility as VisibilityIcon, PlayArrow as PlayArrowIcon,
  Stop as StopIcon, Schedule as ScheduleIcon, CheckCircle as CheckCircleIcon, 
  Error as ErrorIcon, Pending as PendingIcon, HourglassEmpty as HourglassEmptyIcon,
  ArrowDropDown as ArrowDropDownIcon, ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Types
type CommandStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type CommandType = 'shell' | 'restart' | 'shutdown' | 'custom' | 'script';

interface Command {
  id: string;
  name: string;
  description: string;
  type: CommandType;
  status: CommandStatus;
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  targetDevices: string[];
  targetGroups: string[];
  parameters: Record<string, any>;
  output?: string;
  error?: string;
  progress?: number;
}

// Mock data generator
const createMockCommands = (count: number): Command[] => {
  const statuses: CommandStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
  const types: CommandType[] = ['shell', 'restart', 'shutdown', 'custom', 'script'];
  const commands = [
    { name: 'Check Disk Space', description: 'Check available disk space on target devices' },
    { name: 'Restart Service', description: 'Restart a specific service' },
    { name: 'Install Package', description: 'Install a software package' },
    { name: 'Run Script', description: 'Execute a custom script' },
    { name: 'System Reboot', description: 'Reboot the system' },
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const cmd = commands[Math.floor(Math.random() * commands.length)];
    const now = new Date();
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const startedAt = status !== 'pending' ? new Date(createdAt.getTime() + 1000 * 60 * 5) : undefined;
    const completedAt = ['completed', 'failed', 'cancelled'].includes(status) 
      ? new Date((startedAt || new Date()).getTime() + Math.random() * 24 * 60 * 60 * 1000)
      : undefined;
    
    const targetCount = Math.floor(Math.random() * 10) + 1;
    const targetDevices = Array.from({ length: targetCount }, (_, i) => `device-${Math.floor(Math.random() * 1000)}`);
    const groupCount = Math.floor(Math.random() * 3);
    const targetGroups = groupCount > 0 
      ? Array.from({ length: groupCount }, (_, i) => `group-${Math.floor(Math.random() * 5) + 1}`)
      : [];
    
    return {
      id: `cmd-${i}`,
      name: cmd.name,
      description: cmd.description,
      type,
      status,
      createdBy: `user${Math.floor(Math.random() * 5) + 1}@example.com`,
      createdAt: createdAt.toISOString(),
      startedAt: startedAt?.toISOString(),
      completedAt: completedAt?.toISOString(),
      targetDevices,
      targetGroups,
      parameters: {
        command: type === 'shell' ? 'df -h' : type === 'restart' ? 'systemctl restart nginx' : '',
        timeout: Math.floor(Math.random() * 300) + 60,
        runAs: 'root',
      },
      output: status === 'completed' ? 'Command executed successfully' : undefined,
      error: status === 'failed' ? 'Command failed with exit code 1' : undefined,
      progress: status === 'completed' ? 100 : status === 'pending' ? 0 : Math.floor(Math.random() * 100),
    };
  });
};

// Mock API functions
const fetchCommands = async (): Promise<Command[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(createMockCommands(20)), 500);
  });
};

const executeCommand = async (command: Partial<Command>): Promise<Command> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const newCommand: Command = {
        id: `cmd-${Date.now()}`,
        name: command.name || 'New Command',
        description: command.description || '',
        type: command.type || 'shell',
        status: 'pending',
        createdBy: 'current-user@example.com',
        createdAt: new Date().toISOString(),
        targetDevices: command.targetDevices || [],
        targetGroups: command.targetGroups || [],
        parameters: command.parameters || {},
        progress: 0,
      };
      resolve(newCommand);
    }, 500);
  });
};

const CommandsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Command>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newCommand, setNewCommand] = useState<Partial<Command>>({
    name: '',
    description: '',
    type: 'shell',
    parameters: {
      command: '',
      timeout: 60,
      runAs: 'root',
    },
  });

  // Fetch commands
  const { data: commands = [], isLoading, refetch } = useQuery('commands', fetchCommands);
  
  // Mutation for executing a new command
  const executeCommandMutation = useMutation(executeCommand, {
    onSuccess: () => {
      queryClient.invalidateQueries('commands');
      setIsNewDialogOpen(false);
      setNewCommand({
        name: '',
        description: '',
        type: 'shell',
        parameters: {
          command: '',
          timeout: 60,
          runAs: 'root',
        },
      });
    },
  });

  // Handle sorting
  const handleRequestSort = (property: keyof Command) => {
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
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, command: Command) => {
    setSelectedCommand(command);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCommand(null);
  };

  // Handle new command dialog
  const handleNewCommandOpen = () => {
    setIsNewDialogOpen(true);
  };

  const handleNewCommandClose = () => {
    setIsNewDialogOpen(false);
    setNewCommand({
      name: '',
      description: '',
      type: 'shell',
      parameters: {
        command: '',
        timeout: 60,
        runAs: 'root',
      },
    });
  };

  const handleNewCommandSubmit = () => {
    executeCommandMutation.mutate(newCommand);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCommand(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleParameterChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (!name) return;
    
    setNewCommand(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [name]: value,
      },
    }));
  };

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    return commands
      .filter(command => {
        const matchesSearch = 
          command.name.toLowerCase().includes(searchText.toLowerCase()) ||
          command.description.toLowerCase().includes(searchText.toLowerCase()) ||
          command.parameters?.command?.toLowerCase().includes(searchText.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || command.status === filterStatus;
        const matchesType = filterType === 'all' || command.type === filterType;
        
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
  }, [commands, searchText, filterStatus, filterType, orderBy, order]);

  // Get status color
  const getStatusColor = (status: CommandStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: CommandStatus) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'running': return <PlayArrowIcon color="info" />;
      case 'pending': return <HourglassEmptyIcon color="warning" />;
      case 'failed': return <ErrorIcon color="error" />;
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
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Get command type label
  const getTypeLabel = (type: CommandType) => {
    switch (type) {
      case 'shell': return 'Shell Command';
      case 'restart': return 'Restart';
      case 'shutdown': return 'Shutdown';
      case 'custom': return 'Custom';
      case 'script': return 'Script';
      default: return type;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader 
          title="Commands" 
          subheader={`${filteredCommands.length} commands found`}
          action={
            <Box display="flex" gap={1}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleNewCommandOpen}
              >
                New Command
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
                placeholder="Search commands..."
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
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
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
                <option value="shell">Shell Command</option>
                <option value="restart">Restart</option>
                <option value="shutdown">Shutdown</option>
                <option value="script">Script</option>
                <option value="custom">Custom</option>
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
              <Table stickyHeader aria-label="commands table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name / Description</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'type'}
                        direction={orderBy === 'type' ? order : 'asc'}
                        onClick={() => handleRequestSort('type')}
                      >
                        Type
                      </TableSortLabel>
                    </TableCell>
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
                        active={orderBy === 'createdAt'}
                        direction={orderBy === 'createdAt' ? order : 'desc'}
                        onClick={() => handleRequestSort('createdAt')}
                      >
                        Created
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Targets</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        Loading commands...
                      </TableCell>
                    </TableRow>
                  ) : filteredCommands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        No commands found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommands
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((command) => (
                        <TableRow hover key={command.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {command.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {command.description}
                              </Typography>
                              {command.parameters?.command && (
                                <Tooltip title={command.parameters.command} arrow>
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{
                                      display: 'block',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: 200,
                                    }}
                                  >
                                    {command.parameters.command}
                                  </Typography>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getTypeLabel(command.type)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(command.status)}
                              <Chip 
                                label={command.status.charAt(0).toUpperCase() + command.status.slice(1)}
                                size="small"
                                color={getStatusColor(command.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Box width="100%" maxWidth={100}>
                                <LinearProgress 
                                  variant={command.status === 'running' ? 'indeterminate' : 'determinate'}
                                  value={command.progress} 
                                  color={
                                    command.status === 'failed' ? 'error' : 
                                    command.status === 'completed' ? 'success' : 'primary'
                                  }
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {command.progress}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(command.createdAt)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              by {command.createdBy}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {command.startedAt ? (
                              command.completedAt ? (
                                formatDuration(command.startedAt, command.completedAt)
                              ) : (
                                formatDuration(command.startedAt)
                              )
                            ) : '--'}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {command.targetDevices.length} device{command.targetDevices.length !== 1 ? 's' : ''}
                              </Typography>
                              {command.targetGroups.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {command.targetGroups.length} group{command.targetGroups.length !== 1 ? 's' : ''}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={(e) => handleMenuOpen(e, command)}
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
              count={filteredCommands.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </CardContent>
      </Card>

      {/* Command actions menu */}
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
          disabled={!['pending'].includes(selectedCommand?.status || '')}
        >
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Execute Now</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleMenuClose}
          disabled={!['running'].includes(selectedCommand?.status || '')}
        >
          <ListItemIcon>
            <StopIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cancel</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleMenuClose}
          disabled={['running', 'pending'].includes(selectedCommand?.status || '')}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* New Command Dialog */}
      <Dialog open={isNewDialogOpen} onClose={handleNewCommandClose} maxWidth="sm" fullWidth>
        <DialogTitle>New Command</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={newCommand.name}
                onChange={handleInputChange}
                required
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={newCommand.description}
                onChange={handleInputChange}
                multiline
                rows={2}
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={newCommand.type}
                  onChange={handleInputChange}
                  label="Type"
                >
                  <MenuItem value="shell">Shell Command</MenuItem>
                  <MenuItem value="restart">Restart</MenuItem>
                  <MenuItem value="shutdown">Shutdown</MenuItem>
                  <MenuItem value="script">Script</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Run As"
                name="runAs"
                value={newCommand.parameters?.runAs || 'root'}
                onChange={handleParameterChange}
                margin="dense"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Command"
                name="command"
                value={newCommand.parameters?.command || ''}
                onChange={handleParameterChange}
                multiline
                rows={3}
                margin="dense"
                required
                placeholder="Enter the command to execute on the target devices"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Timeout (seconds)"
                name="timeout"
                type="number"
                value={newCommand.parameters?.timeout || 60}
                onChange={handleParameterChange}
                margin="dense"
                inputProps={{ min: 10, max: 3600 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Target Devices
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter device IDs or select from the list"
                margin="dense"
                disabled
                helperText="Device selection will be implemented in a future update"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewCommandClose}>Cancel</Button>
          <Button 
            onClick={handleNewCommandSubmit} 
            variant="contained" 
            color="primary"
            disabled={!newCommand.name || !newCommand.parameters?.command}
          >
            Execute Command
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommandsPage;
