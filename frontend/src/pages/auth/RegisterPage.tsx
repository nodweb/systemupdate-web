import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppDispatch } from '../../../store/hooks';
import { showNotification } from '../../../store/slices/uiSlice';

// Reuse the styled components from LoginPage
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

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

const RegisterPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, register } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    
    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!formData.terms) {
      newErrors.terms = 'You must accept the terms and conditions';
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
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      
      dispatch(
        showNotification({
          type: 'success',
          message: 'Registration successful! Please check your email to verify your account.',
        })
      );
      
      // Redirect to login page or dashboard based on your flow
      navigate('/login', { 
        state: { email: formData.email },
        replace: true 
      });
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      
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

  return (
    <AuthContainer>
      <AuthCard>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <IconButton
            component={RouterLink}
            to="/"
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
              Create an Account
            </Typography>
            <Typography color="textSecondary" variant="body2">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="primary">
                Sign in
              </Link>
            </Typography>
          </LogoContainer>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="firstName"
                name="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleChange}
                error={!!errors.firstName}
                helperText={errors.firstName}
                autoComplete="given-name"
                variant="outlined"
                size="medium"
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="lastName"
                name="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                error={!!errors.lastName}
                helperText={errors.lastName}
                autoComplete="family-name"
                variant="outlined"
                size="medium"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                autoComplete="email"
                variant="outlined"
                size="medium"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
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
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
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
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.terms}
                    onChange={handleChange}
                    name="terms"
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{' '}
                    <Link href="/terms" color="primary" target="_blank" rel="noopener">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" color="primary" target="_blank" rel="noopener">
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
              {errors.terms && (
                <Typography color="error" variant="caption" display="block" sx={{ mt: -1, ml: 4 }}>
                  {errors.terms}
                </Typography>
              )}
            </Grid>
          </Grid>

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
              mt: 3,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            Create Account
          </LoadingButton>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="textSecondary">
              OR CONTINUE WITH
            </Typography>
          </Divider>

          <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Box component="img" src="/images/google.svg" alt="Google" sx={{ width: 20, height: 20 }} />}
              onClick={() => {
                // Handle Google signup
              }}
              disabled={isLoading}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontSize: '0.9375rem',
              }}
            >
              Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Box component="img" src="/images/github.svg" alt="GitHub" sx={{ width: 20, height: 20 }} />}
              onClick={() => {
                // Handle GitHub signup
              }}
              disabled={isLoading}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontSize: '0.9375rem',
              }}
            >
              GitHub
            </Button>
          </Stack>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              By signing up, you agree to our{' '}
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
        </Box>
      </AuthCard>
    </AuthContainer>
  );
};

export default RegisterPage;
