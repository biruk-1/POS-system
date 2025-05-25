import { Box, Typography, Container, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const FooterContainer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1.2, 0),
  marginTop: 'auto',
  position: 'relative',
  bottom: 0,
  width: '100%',
  boxShadow: '0px -2px 8px 0px rgba(0,0,0,0.08)',
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  zIndex: 10
}));

const Logo = styled('img')({
  height: '22px',
  marginRight: '8px',
  verticalAlign: 'middle',
  borderRadius: '4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
});

export default function Footer() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          <Logo src="/src/assets/icon.png" alt="Diamond Tech Logo" />
          <Typography variant="caption" sx={{ color: '#fff', opacity: 0.7, fontWeight: 400, fontSize: '0.95rem', letterSpacing: 0.2 }}>
            Built by Diamond Tech &copy; {currentYear}
          </Typography>
        </Box>
      </Container>
    </FooterContainer>
  );
} 