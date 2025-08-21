import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Container,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ArrowBack } from '@mui/icons-material';
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

const ForgotPasswordPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { forgotPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { email?: string } = {};
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
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
      await forgotPassword(email);
      
      dispatch(
        showNotification({
          type: 'success',
          message: 'Password reset link has been sent to your email address.',
        })
      );
      
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Password reset request failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to send reset link. Please try again.';
      
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
              Forgot Password
            </Typography>
            <Typography color="textSecondary" variant="body2">
              {isSubmitted 
                ? 'We\'ve sent you an email with instructions to reset your password.'
                : 'Enter your email address and we\'ll send you a link to reset your password.'}
            </Typography>
          </LogoContainer>
        </Box>

        {isSubmitted ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
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
              Check your email
            </Typography>
            <Typography color="textSecondary" paragraph>
              We've sent a password reset link to <strong>{email}</strong>
            </Typography>
            <Typography color="textSecondary" variant="body2" sx={{ mb: 4 }}>
              The link will expire in 1 hour for security reasons.
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
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Didn't receive the email?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  color="primary"
                  sx={{ fontWeight: 500 }}
                >
                  Resend
                </Link>
              </Typography>
            </Box>
          </Box>
        ) : (
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
                Send Reset Link
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
        )}
      </AuthCard>
    </AuthContainer>
  );
};

export default ForgotPasswordPage;
