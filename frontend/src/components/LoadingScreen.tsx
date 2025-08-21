import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    opacity: 0.05,
    zIndex: -1,
  },
}));

const SpinnerContainer = styled(Box)({
  position: 'relative',
  display: 'inline-flex',
  '& .MuiCircularProgress-root': {
    width: '80px !important',
    height: '80px !important',
  },
});

const Logo = styled('div')({
  width: 60,
  height: 60,
  marginBottom: 24,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
});

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  progress?: number;
  showProgress?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = true,
  progress,
  showProgress = false,
}) => {
  const theme = useTheme();

  return (
    <LoadingContainer
      sx={{
        position: fullScreen ? 'fixed' : 'absolute',
        backgroundColor: fullScreen ? theme.palette.background.default : 'transparent',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          textAlign: 'center',
          px: 2,
        }}
      >
        <Logo>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
          </svg>
        </Logo>
        
        <SpinnerContainer sx={{ mb: 3 }}>
          <CircularProgress 
            variant={showProgress && progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
            thickness={4}
            sx={{
              color: theme.palette.primary.main,
              position: 'relative',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
          
          {showProgress && progress !== undefined && (
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="caption"
                component="div"
                color="text.secondary"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {`${Math.round(progress || 0)}%`}
              </Typography>
            </Box>
          )}
        </SpinnerContainer>
        
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 1,
          }}
        >
          {message}
        </Typography>
        
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            maxWidth: 320,
            lineHeight: 1.6,
          }}
        >
          Please wait while we load the application...
        </Typography>
      </Box>
    </LoadingContainer>
  );
};

export default LoadingScreen;
