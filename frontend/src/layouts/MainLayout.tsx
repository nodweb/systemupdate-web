import React, { ReactNode, useEffect } from 'react';
import { Box, Container, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSidebarOpen, selectMobileSidebarOpen, setMobileSidebarOpen } from '../store/slices/uiSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import LoadingScreen from '../components/LoadingScreen';

const MainRoot = styled(Box)({
  display: 'flex',
  minHeight: '100%',
  overflow: 'hidden',
});

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  [theme.breakpoints.up('lg')]: {
    marginLeft: 240,
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const mobileSidebarOpen = useAppSelector(selectMobileSidebarOpen);
  const user = useAppSelector(selectCurrentUser);
  const [loading, setLoading] = React.useState(true);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (mobileSidebarOpen) {
      dispatch(setMobileSidebarOpen(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Handle sidebar state based on screen size
  useEffect(() => {
    if (!isDesktop) {
      dispatch(setMobileSidebarOpen(false));
    } else {
      dispatch(setMobileSidebarOpen(true));
    }
  }, [isDesktop, dispatch]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <MainRoot>
      <CssBaseline />
      
      {/* Header */}
      <Header />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <MainContent
        sx={{
          ...(sidebarOpen && {
            [theme.breakpoints.up('lg')]: {
              marginLeft: 24,
              width: `calc(100% - ${240}px)`,
            },
          }),
          ...(!sidebarOpen && {
            [theme.breakpoints.up('lg')]: {
              marginLeft: 8,
              width: `calc(100% - ${72}px)`,
            },
          }),
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            minHeight: 'calc(100vh - 200px)',
            pt: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Container>
        
        {/* Footer */}
        <Footer />
      </MainContent>
    </MainRoot>
  );
};

export default MainLayout;
