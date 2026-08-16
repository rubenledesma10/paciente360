import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useAuth } from '../../context/useAuth';
import { menuForRole, routeTitle, ROLE_LABELS } from './menuConfig';
import { paletteRaw } from '../../theme/theme';
import NotificationsBell from '../NotificationsBell';
import { mediaUrl } from '../../utils/mediaUrl';

const DRAWER_WIDTH = 260;

export default function AuthShell() {
  const { rol, nombre, foto, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menu = menuForRole(rol);
  const roleLabel = ROLE_LABELS[rol] || rol;
  const photoUrl = mediaUrl(foto) || undefined;

  const goToProfile = () => {
    setMobileOpen(false);
    navigate('/perfil');
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderBottom: '1px solid #E3EEF6',
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
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            lineHeight={1}
            color={paletteRaw.azulD}
          >
            Paciente<span style={{ color: paletteRaw.celeste }}>360º</span>
          </Typography>
          <Typography variant="caption" color={paletteRaw.gray}>
            Salud digital
          </Typography>
        </Box>
      </Box>
      <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
        {menu.map((item) => {
          const active = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.id}
              component={NavLink}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: paletteRaw.azul,
                  color: '#fff',
                  '&:hover': { backgroundColor: paletteRaw.azul },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: active ? '#fff' : paletteRaw.celeste,
                  minWidth: 36,
                }}
              >
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { fontWeight: 600, fontSize: 14 } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, borderTop: '1px solid #E3EEF6' }}>
        <Box
          onClick={goToProfile}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: 2,
            px: 1.5,
            py: 1,
            mb: 1,
            background: paletteRaw.bg,
            cursor: 'pointer',
            '&:hover': { filter: 'brightness(0.97)' },
          }}
        >
          <Avatar
            src={photoUrl}
            sx={{
              width: 34,
              height: 34,
              bgcolor: paletteRaw.azul,
              fontSize: 14,
            }}
          >
            {(nombre || '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={700}
              color={paletteRaw.azulD}
              noWrap
            >
              {nombre}
            </Typography>
            <Typography variant="caption" color={paletteRaw.gray}>
              {roleLabel} · Ver mi perfil
            </Typography>
          </Box>
        </Box>
        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: 2, color: paletteRaw.danger }}
        >
          <ListItemIcon sx={{ color: paletteRaw.danger, minWidth: 36 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Cerrar sesión"
            slotProps={{ primary: { fontWeight: 600, fontSize: 14 } }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', background: paletteRaw.bg }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid #E3EEF6',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
      <Box
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <AppBar position="static" color="inherit">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  color: paletteRaw.azul,
                }}
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
              <Box>
                <Typography variant="caption" color={paletteRaw.gray}>
                  {roleLabel}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color={paletteRaw.azulD}
                >
                  {routeTitle(rol, location.pathname)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotificationsBell />
              <Box
                onClick={goToProfile}
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1,
                  background: paletteRaw.bg,
                  borderRadius: 10,
                  pl: 0.5,
                  pr: 1.5,
                  py: 0.25,
                  cursor: 'pointer',
                  '&:hover': { filter: 'brightness(0.97)' },
                }}
              >
                <Avatar
                  src={photoUrl}
                  sx={{
                    width: 26,
                    height: 26,
                    bgcolor: paletteRaw.azul,
                    fontSize: 12,
                  }}
                >
                  {(nombre || '?').charAt(0).toUpperCase()}
                </Avatar>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={paletteRaw.azulD}
                >
                  {nombre}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
