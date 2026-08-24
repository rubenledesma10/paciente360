import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import Logo from '../Logo';
import { paletteRaw } from '../../theme/theme';

const NAV_LINKS = [
  { label: 'Sacar turno', to: '/turnos' },
  { label: 'Noticias', to: '/noticias' },
];

export default function PublicShell() {
  const location = useLocation();

  return (
    <Box sx={{ minHeight: '100vh', background: paletteRaw.bg }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: '1px solid #E3EEF6' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          {/* El logo hace de "inicio": lleva a la pantalla principal */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
            }}
          >
            <Logo size={40} />
            <Typography
              variant="subtitle1"
              fontWeight={800}
              color={paletteRaw.azulD}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              Paciente<span style={{ color: paletteRaw.celeste }}>360º</span>
            </Typography>
          </Box>

          {/* Navegación pública: sin esto nadie llega a /turnos */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexGrow: 1, ml: { xs: 0, sm: 2 } }}
          >
            {NAV_LINKS.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  sx={{
                    fontWeight: 700,
                    color: active ? paletteRaw.azul : paletteRaw.gray,
                    borderBottom: active
                      ? `2px solid ${paletteRaw.celeste}`
                      : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>

          {/* La pantalla de login es '/', no '/login' */}
          <Button component={RouterLink} to="/" variant="contained">
            Iniciar sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 4 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
