import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  alpha,
  styled,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  SystemUpdate as SystemUpdateIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSidebarOpen, toggleSidebar } from '../store/slices/uiSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;
const collapsedWidth = 72;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open: boolean }>(({ theme, open }) => ({
  width: open ? drawerWidth : collapsedWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: open ? drawerWidth : collapsedWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    borderRight: 'none',
    boxShadow: theme.shadows[3],
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      '& .MuiListItemIcon-root': {
        color: theme.palette.primary.main,
      },
    },
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  minHeight: 48,
  justifyContent: 'center',
  px: 2.5,
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
    },
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
  },
}));

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  roles?: string[];
  permissions?: string[];
  divider?: boolean;
}

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  const user = useAppSelector(selectCurrentUser);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  // Menu items configuration
  const menuItems: MenuItem[] = [
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

  // Toggle submenu
  const handleClick = (title: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Check if a menu item should be visible based on user roles/permissions
  const isMenuItemVisible = (item: MenuItem): boolean => {
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

  // Check if a path is active
  const isActive = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname.startsWith(path);
  };

  // Handle navigation
  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  // Toggle sidebar
  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Auto-expand parent menu items when a child is active
  useEffect(() => {
    const newOpenItems: { [key: string]: boolean } = {};
    
    const checkAndOpenParents = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.children) {
          const hasActiveChild = item.children.some(child => 
            child.path && isActive(child.path)
          );
          
          if (hasActiveChild) {
            newOpenItems[item.title] = true;
          }
          
          checkAndOpenParents(item.children);
        }
      }
    };
    
    checkAndOpenParents(menuItems);
    setOpenItems(prev => ({
      ...prev,
      ...newOpenItems,
    }));
  }, [location.pathname]);

  // Render menu items recursively
  const renderMenuItems = (items: MenuItem[], level = 0) => {
    return items
      .filter(item => isMenuItemVisible(item))
      .map((item, index) => {
        const hasChildren = item.children && item.children.length > 0;
        const isItemOpen = openItems[item.title] || false;
        const isItemActive = isActive(item.path);
        const showText = sidebarOpen || level > 0;
        
        if (item.divider) {
          return (
            <Divider key={`divider-${index}`} sx={{ my: 1 }} />
          );
        }

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
                title={!sidebarOpen ? item.title : ''} 
                placement="right"
                arrow
              >
                <StyledListItemButton
                  selected={isItemActive}
                  onClick={() => {
                    if (hasChildren) {
                      handleClick(item.title);
                    } else {
                      handleNavigate(item.path);
                    }
                  }}
                  sx={{
                    justifyContent: sidebarOpen ? 'initial' : 'center',
                    px: 2.5,
                    py: 1,
                    my: 0.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: sidebarOpen ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isItemActive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  
                  {showText && (
                    <ListItemText 
                      primary={item.title} 
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isItemActive ? 600 : 400,
                      }}
                    />
                  )}
                  
                  {hasChildren && showText && (
                    isItemOpen ? <ExpandLess /> : <ExpandMore />
                  )}
                </StyledListItemButton>
              </Tooltip>
            </ListItem>
            
            {hasChildren && (
              <Collapse in={isItemOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {renderMenuItems(item.children, level + 1)}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        );
      });
  };

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: sidebarOpen ? drawerWidth : collapsedWidth },
        flexShrink: { sm: 0 },
      }}
      aria-label="sidebar"
    >
      <StyledDrawer
        variant="permanent"
        open={sidebarOpen}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: sidebarOpen ? drawerWidth : collapsedWidth,
            borderRight: 'none',
            background: theme.palette.background.paper,
            boxShadow: theme.shadows[3],
          },
        }}
      >
        <DrawerHeader>
          {sidebarOpen ? (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Typography variant="h6" noWrap component="div">
                SystemUpdate
              </Typography>
              <IconButton onClick={handleToggleSidebar} size="small" sx={{ ml: 'auto' }}>
                {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Box>
          ) : (
            <IconButton onClick={handleToggleSidebar} size="small">
              <MenuIcon />
            </IconButton>
          )}
        </DrawerHeader>
        
        <Divider />
        
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          <List component="nav">
            {renderMenuItems(menuItems.filter(item => !item.divider))}
          </List>
        </Box>
        
        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Tooltip title={!sidebarOpen ? 'Logout' : ''} placement="right" arrow>
            <StyledListItemButton
              onClick={handleLogout}
              sx={{
                justifyContent: sidebarOpen ? 'initial' : 'center',
                px: 2.5,
                py: 1,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarOpen ? 2 : 'auto',
                  justifyContent: 'center',
                  color: 'error.main',
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
            </StyledListItemButton>
          </Tooltip>
          
          {sidebarOpen && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                v{process.env.REACT_APP_VERSION || '1.0.0'}
              </Typography>
            </Box>
          )}
        </Box>
      </StyledDrawer>
    </Box>
  );
};

export default Sidebar;
