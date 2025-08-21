import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery, Box, CssBaseline, Toolbar, useScrollTrigger, Slide, AppBar, IconButton, Drawer, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Button, Avatar, Menu, MenuItem, Tooltip, Badge, styled } from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  SystemUpdate as SystemUpdateIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  ArrowDropDown as ArrowDropDownIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSidebar, toggleMobileSidebar, selectSidebarOpen, selectMobileSidebarOpen } from '../store/slices/uiSlice';
import { selectCurrentUser, logout as logoutAction } from '../store/slices/authSlice';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 260;
const collapsedWidth = 72;

interface DashboardLayoutProps {
  window?: () => Window;
  children?: React.ReactNode;
}

interface NavItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  roles?: string[];
  permissions?: string[];
  divider?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ window, children }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  const user = useAppSelector(selectCurrentUser);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const mobileSidebarOpen = useAppSelector(selectMobileSidebarOpen);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Navigation items
  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon />,
    },
    {
      title: 'Devices',
      path: '/devices',
      icon: <DevicesIcon />,
      children: [
        { title: 'All Devices', path: '/devices' },
        { title: 'Device Groups', path: '/devices/groups' },
        { title: 'Add New', path: '/devices/new' },
      ],
    },
    {
      title: 'Updates',
      path: '/updates',
      icon: <SystemUpdateIcon />,
      children: [
        { title: 'Update Catalog', path: '/updates' },
        { title: 'Upload Update', path: '/updates/upload' },
        { title: 'Update History', path: '/updates/history' },
      ],
    },
    {
      title: 'Deployments',
      path: '/deployments',
      icon: <HistoryIcon />,
      children: [
        { title: 'All Deployments', path: '/deployments' },
        { title: 'New Deployment', path: '/deployments/new' },
        { title: 'Scheduled', path: '/deployments/scheduled' },
      ],
    },
    {
      title: 'Users',
      path: '/users',
      icon: <PersonIcon />,
      roles: ['admin'],
      children: [
        { title: 'All Users', path: '/users' },
        { title: 'Roles', path: '/users/roles' },
        { title: 'Permissions', path: '/users/permissions' },
      ],
    },
    {
      title: 'Teams',
      path: '/teams',
      icon: <GroupIcon />,
      roles: ['admin'],
    },
    {
      title: 'Security',
      path: '/security',
      icon: <SecurityIcon />,
      roles: ['admin'],
      children: [
        { title: 'API Keys', path: '/security/api-keys' },
        { title: 'Audit Logs', path: '/security/audit-logs' },
        { title: 'Security Policies', path: '/security/policies' },
      ],
    },
    { title: 'divider', icon: <Divider />, divider: true },
    {
      title: 'Settings',
      path: '/settings',
      icon: <SettingsIcon />,
      children: [
        { title: 'Profile', path: '/settings/profile' },
        { title: 'Account', path: '/settings/account' },
        { title: 'Notifications', path: '/settings/notifications' },
      ],
    },
    {
      title: 'Help & Support',
      path: '/help',
      icon: <HelpIcon />,
      children: [
        { title: 'Documentation', path: '/help/docs' },
        { title: 'API Reference', path: '/help/api' },
        { title: 'Contact Support', path: '/help/contact' },
      ],
    },
  ];

  // Handle scroll for app bar shadow
  const handleScroll = () => {
    if (window) {
      const isScrolled = window.scrollY > 0;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    }
  };

  useEffect(() => {
    window?.addEventListener('scroll', handleScroll);
    return () => {
      window?.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // Auto-expand parent menu items when a child is active
  useEffect(() => {
    const newOpenItems: { [key: string]: boolean } = {};
    
    const checkAndOpenParents = (items: NavItem[]) => {
      for (const item of items) {
        if (item.children) {
          const hasActiveChild = item.children.some(child => 
            child.path && location.pathname.startsWith(child.path)
          );
          
          if (hasActiveChild) {
            newOpenItems[item.title] = true;
          }
          
          checkAndOpenParents(item.children);
        }
      }
    };
    
    checkAndOpenParents(navItems);
    setOpenItems(prev => ({
      ...prev,
      ...newOpenItems,
    }));
  }, [location.pathname]);

  const toggleItem = (title: string) => {
    setOpenItems(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleDrawerToggle = () => {
    if (isMobile) {
      dispatch(toggleMobileSidebar());
    } else {
      dispatch(toggleSidebar());
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotificationsAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isMenuItemVisible = (item: NavItem): boolean => {
    // Always show items with no role or permission requirements
    if (!item.roles?.length && !item.permissions?.length) return true;
    
    // Check user roles
    if (item.roles?.length && item.roles.some(role => user?.roles?.includes(role))) {
      return true;
    }
    
    // Check user permissions
    if (item.permissions?.length && item.permissions.some(perm => user?.permissions?.includes(perm))) {
      return true;
    }
    
    return false;
  };

  const renderNavItems = (items: NavItem[], level = 0) => {
    return items
      .filter(item => isMenuItemVisible(item))
      .map((item, index) => {
        if (item.divider) {
          return <Divider key={`divider-${index}`} sx={{ my: 1 }} />;
        }

        const isActive = item.path && location.pathname.startsWith(item.path);
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openItems[item.title] || false;
        const showText = sidebarOpen || level > 0;

        return (
          <React.Fragment key={item.title}>
            <ListItem 
              disablePadding 
              sx={{ 
                display: 'block',
                pl: level > 0 ? level * 2 : 0,
              }}
            >
              <Tooltip 
                title={!sidebarOpen && level === 0 ? item.title : ''} 
                placement="right"
                arrow
                disableHoverListener={sidebarOpen || level > 0}
              >
                <ListItemButton
                  selected={isActive}
                  onClick={() => {
                    if (hasChildren) {
                      toggleItem(item.title);
                    } else if (item.path) {
                      navigate(item.path);
                      if (isMobile) {
                        dispatch(toggleMobileSidebar());
                      }
                    }
                  }}
                  sx={{
                    minHeight: 48,
                    justifyContent: sidebarOpen || level > 0 ? 'flex-start' : 'center',
                    px: 2.5,
                    py: 1,
                    my: 0.5,
                    mx: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: sidebarOpen || level > 0 ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? 'primary.contrastText' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  
                  {(sidebarOpen || level > 0) && (
                    <ListItemText 
                      primary={item.title} 
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  )}
                  
                  {hasChildren && (sidebarOpen || level > 0) && (
                    isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
            
            {hasChildren && (
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {renderNavItems(item.children || [], level + 1)}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        );
      });
  };

  const drawer = (
    <div>
      <Toolbar 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="SystemUpdate"
            sx={{
              height: 32,
              width: 'auto',
              mr: 1,
              display: sidebarOpen ? 'block' : 'none',
            }}
          />
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: sidebarOpen ? 'block' : 'none',
            }}
          >
            SystemUpdate
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} size="small">
          {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        <List component="nav">
          {renderNavItems(navItems.filter(item => !item.divider))}
        </List>
      </Box>
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Tooltip title={!sidebarOpen ? 'Logout' : ''} placement="right" arrow>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              minHeight: 48,
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              px: 2.5,
              py: 1,
              my: 0.5,
              mx: 1,
              borderRadius: 1,
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.light',
                color: 'error.contrastText',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: sidebarOpen ? 2 : 'auto',
                justifyContent: 'center',
                color: 'inherit',
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {sidebarOpen && (
              <ListItemText 
                primary="Logout" 
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: 500,
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
        
        {sidebarOpen && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              v{process.env.REACT_APP_VERSION || '1.0.0'}
            </Typography>
          </Box>
        )}
      </Box>
    </div>
  );

  const container = window !== undefined ? () => window.document.body : undefined;

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={scrolled ? 4 : 0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(sidebarOpen && !isMobile && {
            width: `calc(100% - ${drawerWidth}px)`,
            marginLeft: `${drawerWidth}px`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
          ...(!sidebarOpen && !isMobile && {
            width: `calc(100% - ${collapsedWidth}px)`,
            marginLeft: `${collapsedWidth}px`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            {location.pathname.split('/')[1] || 'Dashboard'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Toggle Theme">
              <IconButton
                color="inherit"
                onClick={() => {
                  // Toggle theme logic here
                }}
                sx={{ mr: 1 }}
              >
                {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={handleNotificationsMenuOpen}
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={4} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Button
              onClick={handleProfileMenuOpen}
              color="inherit"
              startIcon={
                <Avatar
                  alt={user?.name || 'User'}
                  src={user?.avatar}
                  sx={{ width: 32, height: 32 }}
                />
              }
              endIcon={<ArrowDropDownIcon />}
              sx={{ textTransform: 'none' }}
            >
              <Box sx={{ display: { xs: 'none', md: 'block' }, ml: 1 }}>
                <Typography variant="subtitle2" noWrap>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.email || 'user@example.com'}
                </Typography>
              </Box>
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: sidebarOpen ? drawerWidth : collapsedWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          '& .MuiDrawer-paper': {
            width: isMobile ? '80%' : (sidebarOpen ? drawerWidth : collapsedWidth),
            boxSizing: 'border-box',
            borderRight: 'none',
            backgroundColor: 'background.paper',
            boxShadow: theme.shadows[3],
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          container={container}
          variant="temporary"
          open={mobileSidebarOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: '80%',
              maxWidth: 320,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? drawerWidth : collapsedWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : collapsedWidth}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: { md: `${sidebarOpen ? drawerWidth : collapsedWidth}px` },
          marginTop: '64px', // Height of the app bar
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: 'background.default',
        }}
      >
        {children || <Outlet />}
      </Box>
      
      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate('/profile')}>
          <Avatar /> Profile
        </MenuItem>
        <MenuItem onClick={() => navigate('/settings')}>
          <Avatar> <SettingsIcon fontSize="small" /> </Avatar> Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            width: 360,
            maxWidth: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            mt: 1.5,
            '& .MuiList-root': {
              p: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You have 4 new notifications
          </Typography>
        </Box>
        
        <List>
          {[1, 2, 3, 4].map((item) => (
            <ListItemButton key={item}>
              <ListItemIcon>
                <Avatar>
                  <NotificationsIcon />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary="New update available"
                secondary="A new version of the app is available for download."
              />
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                2h ago
              </Typography>
            </ListItemButton>
          ))}
        </List>
        
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
          <Button color="primary" size="small">
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default DashboardLayout;
