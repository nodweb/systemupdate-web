import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Login: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { login, register, isLoading } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('لطفاً تمام فیلدها را پر کنید');
      return;
    }

    const success = await login(formData.username, formData.password);
    if (!success) {
      setError('نام کاربری یا رمز عبور اشتباه است');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('لطفاً تمام فیلدها را پر کنید');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    if (formData.password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    const success = await register(formData.username, formData.email, formData.password);
    if (!success) {
      setError('خطا در ثبت نام');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          backgroundColor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              SystemUpdate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              سیستم مدیریت دستگاه‌های اندروید
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} centered>
              <Tab label="ورود" />
              <Tab label="ثبت نام" />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="نام کاربری"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="رمز عبور"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'ورود'}
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="نام کاربری"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="ایمیل"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="رمز عبور"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="تکرار رمز عبور"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={isLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'ثبت نام'}
              </Button>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login; 