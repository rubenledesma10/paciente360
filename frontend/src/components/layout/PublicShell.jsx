import { Link as RouterLink, Outlet } from 'react-router-dom';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { paletteRaw } from '../../theme/theme';

export default function PublicShell() {
  return (
    <Box sx={{ minHeight: '100vh', background: paletteRaw.bg }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: '1px solid #E3EEF6' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box
            component={RouterLink}
            to="/noticias"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: paletteRaw.celesteXL,
                color: paletteRaw.azul,
              }}
            >
              <LocalHospitalIcon fontSize="small" />
            </Box>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              color={paletteRaw.azulD}
            >
              Paciente<span style={{ color: paletteRaw.celeste }}>360º</span>
            </Typography>
          </Box>
          <Button component={RouterLink} to="/login" variant="contained">
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
