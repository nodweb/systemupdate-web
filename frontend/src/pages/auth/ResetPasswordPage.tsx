import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppDispatch } from '../../../store/hooks';
import { showNotification } from '../../../store/slices/uiSlice';

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
  maxWidth: 500,
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

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

const ResetPasswordPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Check if token is valid on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setIsValidToken(false);
        return;
      }
      
      try {
        // Here you would typically make an API call to validate the token
        // For now, we'll just simulate a successful validation
        setIsValidToken(true);
      } catch (error) {
        console.error('Token validation failed:', error);
        setIsValidToken(false);
        
        dispatch(
          showNotification({
            type: 'error',
            message: 'This password reset link is invalid or has expired.',
          })
        );
      }
    };
    
    validateToken();
  }, [token, email, dispatch]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Must include uppercase, lowercase, and number';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !token || !email) {
      return;
    }

    setIsLoading(true);
    
    try {
      await resetPassword(token, email, password);
      
      dispatch(
        showNotification({
          type: 'success',
          message: 'Your password has been reset successfully!',
        })
      );
      
      setIsPasswordReset(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to reset password. Please try again.';
      
      dispatch(
        showNotification({
          type: 'error',
          message: errorMessage,
        })
      );
      
      // Set form errors from API response if available
      if (error.response?.data?.errors) {
        setErrors({
          ...errors,
          ...error.response.data.errors,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Show loading state while validating token
  if (isValidToken === null) {
    return (
      <AuthContainer>
        <AuthCard>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>
              Validating reset link...
            </Typography>
            <Typography color="textSecondary" variant="body2">
              Please wait while we verify your password reset link.
            </Typography>
          </Box>
        </AuthCard>
      </AuthContainer>
    );
  }

  // Show error if token is invalid
  if (!isValidToken || !token || !email) {
    return (
      <AuthContainer>
        <AuthCard>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </Box>
            <Typography variant="h6" gutterBottom>
              Invalid or Expired Link
            </Typography>
            <Typography color="textSecondary" paragraph>
              This password reset link is invalid or has expired.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/forgot-password')}
              sx={{ mt: 2 }}
            >
              Request New Link
            </Button>
            <Box sx={{ mt: 3 }}>
              <Link
                component="button"
                type="button"
                onClick={handleBackToLogin}
                color="primary"
                sx={{ fontWeight: 500 }}
              >
                Back to Login
              </Link>
            </Box>
          </Box>
        </AuthCard>
      </AuthContainer>
    );
  }

  // Show success state after password reset
  if (isPasswordReset) {
    return (
      <AuthContainer>
        <AuthCard>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </Box>
            <Typography variant="h6" gutterBottom>
              Password Reset Successful!
            </Typography>
            <Typography color="textSecondary" paragraph>
              Your password has been updated successfully.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBackToLogin}
              fullWidth={isMobile}
              sx={{ mt: 2 }}
            >
              Back to Login
            </Button>
          </Box>
        </AuthCard>
      </AuthContainer>
    );
  }

  // Show reset password form
  return (
    <AuthContainer>
      <AuthCard>
        <Box sx={{ mb: 4 }}>
          <IconButton
            onClick={handleBackToLogin}
            sx={{
              position: 'absolute',
              left: 24,
              top: 24,
              color: 'text.secondary',
            }}
          >
            <ArrowBack />
          </IconButton>
          
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
              Reset Password
            </Typography>
            <Typography color="textSecondary" variant="body2">
              Enter your new password below.
            </Typography>
          </LogoContainer>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              fullWidth
              id="password"
              name="password"
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password || 'At least 8 characters with uppercase, lowercase & number'}
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

            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              variant="outlined"
              size="medium"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="large"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

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
              Reset Password
            </LoadingButton>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Remember your password?{' '}
                <Link component={RouterLink} to="/login" color="primary">
                  Back to Login
                </Link>
              </Typography>
            </Box>
          </Stack>
        </Box>
      </AuthCard>
    </AuthContainer>
  );
};

export default ResetPasswordPage;
