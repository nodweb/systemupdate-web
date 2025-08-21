import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Visibility, VisibilityOff, GitHub, Google, Twitter } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch } from '../../store/hooks';
import { showNotification } from '../../store/slices/uiSlice';

const AuthContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
  position: 'relative',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 10% 20%, ${theme.palette.primary.light}20 0%, transparent 20%),
                radial-gradient(circle at 90% 80%, ${theme.palette.secondary.light}20 0%, transparent 30%)`,
    zIndex: 0,
  },
}));

const AuthCard = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: 460,
  margin: 'auto',
  padding: theme.spacing(4, 4, 6),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3, 2, 4),
    margin: theme.spacing(2),
    maxWidth: 'calc(100% - 32px)',
  },
}));

const LogoContainer = styled(Box)({
  textAlign: 'center',
  marginBottom: 24,
  '& svg': {
    width: 60,
    height: 60,
  },
});

const SocialButton = styled(Button)(({ theme }) => ({
  padding: '10px 16px',
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  fontWeight: 500,
  '&:not(:last-child)': {
    marginRight: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      marginRight: 0,
      marginBottom: theme.spacing(1),
      width: '100%',
    },
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    marginBottom: theme.spacing(1),
  },
}));

const LoginPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { login, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await login(email, password);
      
      dispatch(
        showNotification({
          type: 'success',
          message: 'Login successful! Redirecting...',
        })
      );
      
      // The navigation will be handled by the useEffect hook
    } catch (error: any) {
      console.error('Login failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      
      dispatch(
        showNotification({
          type: 'error',
          message: errorMessage,
        })
      );
      
      // Set form errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (errorMessage.includes('email')) {
        setErrors({ email: errorMessage });
      } else if (errorMessage.includes('password')) {
        setErrors({ password: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      // Use demo credentials
      await login('demo@systemupdate.com', 'demo123');
      
      dispatch(
        showNotification({
          type: 'success',
          message: 'Logged in with demo account!',
        })
      );
    } catch (error) {
      console.error('Demo login failed:', error);
      dispatch(
        showNotification({
          type: 'error',
          message: 'Demo login failed. Please try again.',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <LogoContainer>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
          </svg>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, mt: 2 }}>
            Welcome Back
          </Typography>
          <Typography color="textSecondary" variant="body2">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" color="primary">
              Sign up
            </Link>
          </Typography>
        </LogoContainer>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              autoComplete="email"
              autoFocus
              variant="outlined"
              size="medium"
            />

            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              autoComplete="current-password"
              variant="outlined"
              size="medium"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="large"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    name="rememberMe"
                    color="primary"
                  />
                }
                label="Remember me"
              />
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                color="primary"
                sx={{ textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>

            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              color="primary"
              loading={isLoading}
              loadingPosition="start"
              startIcon={<span />}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              Sign In
            </LoadingButton>

            <LoadingButton
              fullWidth
              size="large"
              variant="outlined"
              color="primary"
              onClick={handleDemoLogin}
              loading={isLoading}
              loadingPosition="start"
              startIcon={<span />}
              sx={{
                py: 1.5,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.9375rem',
              }}
            >
              Try Demo Account
            </LoadingButton>
          </Stack>
        </Box>

        <Box sx={{ my: 3 }}>
          <Divider sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary">
              OR CONTINUE WITH
            </Typography>
          </Divider>

          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 2,
            }}
          >
            <SocialButton
              variant="outlined"
              startIcon={<Google />}
              onClick={() => {
                // Handle Google login
              }}
              disabled={isLoading}
              fullWidth={isMobile}
            >
              Google
            </SocialButton>
            <SocialButton
              variant="outlined"
              startIcon={<GitHub />}
              onClick={() => {
                // Handle GitHub login
              }}
              disabled={isLoading}
              fullWidth={isMobile}
            >
              GitHub
            </SocialButton>
            {!isMobile && (
              <SocialButton
                variant="outlined"
                startIcon={<Twitter />}
                onClick={() => {
                  // Handle Twitter login
                }}
                disabled={isLoading}
              >
                Twitter
              </SocialButton>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            By signing in, you agree to our{' '}
            <Link href="/terms" color="primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" color="primary">
              Privacy Policy
            </Link>
            .
          </Typography>
        </Box>
      </AuthCard>
    </AuthContainer>
  );
};

export default LoginPage;
