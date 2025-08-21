import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Box, Button, Card, CardContent, CardHeader, 
  Chip, Divider, Grid, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TablePagination, 
  TableRow, TableSortLabel, TextField, Typography,
  useTheme, useMediaQuery, InputAdornment, LinearProgress
} from '@mui/material';
import { 
  Search as SearchIcon, FilterList as FilterListIcon, 
  Refresh as RefreshIcon, Security as SecurityIcon,
  SystemUpdate as SystemUpdateIcon, Warning as WarningIcon
} from '@mui/icons-material';

// Types
type UpdateSeverity = 'critical' | 'important' | 'moderate' | 'low';
type UpdateStatus = 'available' | 'downloading' | 'installing' | 'installed' | 'failed' | 'pending_restart';

interface SoftwareUpdate {
  id: string;
  title: string;
  severity: UpdateSeverity;
  status: UpdateStatus;
  releaseDate: string;
  size: number;
  kbArticleId?: string;
  requiresRestart: boolean;
  categories: string[];
}

// Mock data generator
const createMockUpdates = (count: number): SoftwareUpdate[] => {
  const severities: UpdateSeverity[] = ['critical', 'important', 'moderate', 'low'];
  const statuses: UpdateStatus[] = ['available', 'downloading', 'installing', 'installed', 'failed', 'pending_restart'];
  const categories = ['Security', 'Feature', 'Definition', 'Driver', 'Application'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `update-${i}`,
    title: `Update ${i + 1} for ${['Windows', 'Office', 'Edge', 'Defender'][i % 4]}`,
    severity: severities[Math.floor(Math.random() * severities.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    releaseDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
    size: [5, 10, 50, 100, 200, 500, 1000][Math.floor(Math.random() * 7)],
    kbArticleId: `KB${1000000 + i}`,
    requiresRestart: Math.random() > 0.5,
    categories: [
      `${categories[Math.floor(Math.random() * categories.length)]} Update`,
      ...(Math.random() > 0.7 ? ['Security Update'] : [])
    ].filter((v, i, a) => a.indexOf(v) === i),
  }));
};

// Mock API function
const fetchUpdates = async (): Promise<SoftwareUpdate[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(createMockUpdates(50)), 500);
  });
};

const UpdatesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof SoftwareUpdate>('title');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchText, setSearchText] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: updates = [], isLoading, refetch } = useQuery('updates', fetchUpdates);

  // Handle sorting
  const handleRequestSort = (property: keyof SoftwareUpdate) => {
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

  // Filter and sort updates
  const filteredUpdates = useMemo(() => {
    return updates
      .filter(update => {
        const matchesSearch = 
          update.title.toLowerCase().includes(searchText.toLowerCase()) ||
          update.kbArticleId?.toLowerCase().includes(searchText.toLowerCase());
        
        const matchesSeverity = filterSeverity === 'all' || update.severity === filterSeverity;
        const matchesStatus = filterStatus === 'all' || update.status === filterStatus;
        
        return matchesSearch && matchesSeverity && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (a[orderBy] > b[orderBy]) {
          comparison = 1;
        } else if (a[orderBy] < b[orderBy]) {
          comparison = -1;
        }
        return order === 'asc' ? comparison : -comparison;
      });
  }, [updates, searchText, filterSeverity, filterStatus, orderBy, order]);

  // Get severity color
  const getSeverityColor = (severity: UpdateSeverity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'important': return 'warning';
      case 'moderate': return 'info';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: UpdateStatus) => {
    switch (status) {
      case 'installed': return <SystemUpdateIcon color="success" />;
      case 'failed': return <WarningIcon color="error" />;
      case 'pending_restart': return <WarningIcon color="warning" />;
      default: return <SystemUpdateIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader 
          title="Software Updates" 
          subheader={`${filteredUpdates.length} updates available`}
          action={
            <Box display="flex" gap={1}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
              >
                Check for Updates
              </Button>
              <Button 
                variant="outlined"
                startIcon={<SystemUpdateIcon />}
              >
                Install All
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
                placeholder="Search updates..."
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
                label="Severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="important">Important</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </TextField>
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
                <option value="available">Available</option>
                <option value="downloading">Downloading</option>
                <option value="installing">Installing</option>
                <option value="installed">Installed</option>
                <option value="failed">Failed</option>
                <option value="pending_restart">Pending Restart</option>
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
              <Table stickyHeader aria-label="updates table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'title'}
                        direction={orderBy === 'title' ? order : 'asc'}
                        onClick={() => handleRequestSort('title')}
                      >
                        Update
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'severity'}
                        direction={orderBy === 'severity' ? order : 'asc'}
                        onClick={() => handleRequestSort('severity')}
                      >
                        Severity
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
                    <TableCell>Categories</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'releaseDate'}
                        direction={orderBy === 'releaseDate' ? order : 'desc'}
                        onClick={() => handleRequestSort('releaseDate')}
                      >
                        Release Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        Loading updates...
                      </TableCell>
                    </TableRow>
                  ) : filteredUpdates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        No updates found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUpdates
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((update) => (
                        <TableRow hover key={update.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {update.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {update.kbArticleId}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={update.severity.charAt(0).toUpperCase() + update.severity.slice(1)}
                              size="small"
                              color={getSeverityColor(update.severity) as any}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(update.status)}
                              <span>
                                {update.status.split('_').map(s => 
                                  s.charAt(0).toUpperCase() + s.slice(1)
                                ).join(' ')}
                              </span>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {update.categories.map((cat, i) => (
                                <Chip 
                                  key={i} 
                                  label={cat} 
                                  size="small" 
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {update.size < 1000 
                              ? `${update.size} MB` 
                              : `${(update.size / 1000).toFixed(1)} GB`}
                          </TableCell>
                          <TableCell>
                            {new Date(update.releaseDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              variant="outlined"
                              disabled={update.status === 'installed'}
                            >
                              {update.status === 'available' ? 'Install' : 'View'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredUpdates.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UpdatesPage;
