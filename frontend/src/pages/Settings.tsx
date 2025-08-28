import React from 'react';
import { Box, Typography, Paper, Divider, Switch, FormControlLabel, Button, Avatar } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          تنظیمات
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            تنظیمات نمایش
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={toggleTheme}
                color="primary"
              />
            }
            label={mode === 'dark' ? <><DarkModeIcon sx={{ ml: 1 }} /> حالت تاریک</> : <><LightModeIcon sx={{ ml: 1 }} /> حالت روشن</>}
          />
        </Box>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            اطلاعات کاربری
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              {user?.name ? user.name[0] : '?'}
            </Avatar>
            <Box>
              <Typography><b>نام:</b> {user?.name || '-'}</Typography>
              <Typography><b>ایمیل:</b> {user?.email || '-'}</Typography>
              <Typography><b>نقش:</b> {user?.role || '-'}</Typography>
            </Box>
          </Box>
          <Button variant="outlined" color="error" sx={{ mt: 2 }} onClick={handleLogout}>
            خروج از حساب کاربری
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings; 