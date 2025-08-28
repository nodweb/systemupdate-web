import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  Analytics as AnalyticsIcon,
  Apps as AppsIcon,
  TouchApp as RemoteIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SystemUpdate Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              backgroundColor: isActive('/dashboard') ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            داشبورد
          </Button>
          
          <Button
            color="inherit"
            startIcon={<DevicesIcon />}
            onClick={() => navigate('/devices')}
            sx={{ 
              backgroundColor: isActive('/devices') ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            دستگاه‌ها
          </Button>
          
          <Button
            color="inherit"
            startIcon={<AppsIcon />}
            onClick={() => navigate('/apps')}
            sx={{ 
              backgroundColor: isActive('/apps') ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            مدیریت اپلیکیشن‌ها
          </Button>
          
          <Button
            color="inherit"
            startIcon={<RemoteIcon />}
            onClick={() => navigate('/remote')}
            sx={{ 
              backgroundColor: isActive('/remote') ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            کنترل از راه دور
          </Button>
          
          <Button
            color="inherit"
            startIcon={<AnalyticsIcon />}
            onClick={() => navigate('/analytics')}
            sx={{ 
              backgroundColor: isActive('/analytics') ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            آمار
          </Button>
          
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            خروج
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 