import React from 'react';
import { Box, Container, Typography, Link, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import RssFeedIcon from '@mui/icons-material/RssFeed';

const FooterContainer = styled('footer')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(3, 0),
  marginTop: 'auto',
}));

const FooterContent = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  [theme.breakpoints.up('md')]: {
    flexDirection: 'row',
  },
}));

const FooterLinks = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: theme.spacing(2),
  margin: theme.spacing(2, 0),
  [theme.breakpoints.up('md')]: {
    margin: 0,
  },
}));

const SocialLinks = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    marginTop: 0,
  },
}));

const StyledLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  fontSize: '0.875rem',
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
  },
}));

const Footer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { text: 'Documentation', url: 'https://docs.systemupdate.com' },
    { text: 'API Reference', url: 'https://api-docs.systemupdate.com' },
    { text: 'Support', url: '/support' },
    { text: 'Blog', url: 'https://blog.systemupdate.com' },
    { text: 'Status', url: 'https://status.systemupdate.com' },
    { text: 'Privacy Policy', url: '/privacy' },
    { text: 'Terms of Service', url: '/terms' },
  ];

  const socialLinks = [
    { icon: <GitHubIcon />, url: 'https://github.com/systemupdate' },
    { icon: <TwitterIcon />, url: 'https://twitter.com/systemupdate' },
    { icon: <LinkedInIcon />, url: 'https://linkedin.com/company/systemupdate' },
    { icon: <RssFeedIcon />, url: '/rss' },
  ];

  return (
    <FooterContainer>
      <FooterContent maxWidth="lg">
        <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
          <Typography variant="body2" color="text.secondary">
            © {currentYear} SystemUpdate. All rights reserved.
          </Typography>
          <Typography variant="caption" color="text.disabled" display="block">
            v{process.env.REACT_APP_VERSION || '1.0.0'}
          </Typography>
        </Box>

        <FooterLinks>
          {footerLinks.map((link, index) => (
            <React.Fragment key={link.text}>
              <StyledLink 
                href={link.url} 
                target={link.url.startsWith('http') ? '_blank' : '_self'}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.text}
              </StyledLink>
              {index < footerLinks.length - 1 && (
                <Typography component="span" color="text.disabled" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  •
                </Typography>
              )}
            </React.Fragment>
          ))}
        </FooterLinks>

        <SocialLinks>
          {socialLinks.map((social) => (
            <IconButton
              key={social.url}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {social.icon}
            </IconButton>
          ))}
        </SocialLinks>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
