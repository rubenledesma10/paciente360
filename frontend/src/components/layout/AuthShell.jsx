import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpIcon from '@mui/icons-material/Help';
import { useAuth } from '../../context/useAuth';
import { menuForRole, routeTitle, ROLE_LABELS } from './menuConfig';
import { paletteRaw } from '../../theme/theme';
import NotificationsBell from '../NotificationsBell';
import Logo from '../Logo';
import { mediaUrl } from '../../utils/mediaUrl';
import GuidedTour from '../tour/GuidedTour';
import { isTourDone, markTourDone } from '../tour/tourStorage';
import { PATIENT_TOUR_STEPS, patientTourKey } from '../tour/tourSteps';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;
const COLLAPSED_KEY = 'sidebar-collapsed';

// La preferencia es una comodidad: si el navegador bloquea el storage, la
// barra simplemente arranca desplegada.
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
};

// Nombre de anclaje del tutorial para cada item del menu: '/mis-turnos' -> 'nav-mis-turnos'
const navTourName = (path) =>
  `nav-${path.replace(/^\//, '').replace(/\//g, '-')}`;

export default function AuthShell() {
  const { rol, nombre, foto, logout, userId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // collapsed = barra en modo "auto-ocultar": reposa angosta (solo íconos) y se
  // despliega encima del contenido mientras el mouse está sobre ella.
  // collapsed = false = barra fija (siempre desplegada).
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [hovered, setHovered] = useState(false);

  const toggleCollapsed = () => {
    setHovered(false);
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // sin storage: el cambio vale solo para esta sesión
      }
      return next;
    });
  };

  const menu = menuForRole(rol);
  const roleLabel = ROLE_LABELS[rol] || rol;
  const photoUrl = mediaUrl(foto) || undefined;

  // Tutorial: por ahora solo existe el del paciente. Se ofrece la primera vez
  // que cada paciente inicia sesion en cada arranque de la app, y se puede
  // volver a abrir con el boton de ayuda de la barra superior.
  // Se calcula en cada render (no una sola vez al montar) por si los datos
  // de la sesion tardan un instante en estar disponibles.
  const isPatient = roleLabel === 'Paciente';
  const tourKey = patientTourKey(userId);
  const [manualTour, setManualTour] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tourOpen =
    manualTour ||
    (isPatient && userId != null && !dismissed && !isTourDone(tourKey));

  // dismissed fuerza el redibujado al cerrar el tutorial que se abrio solo
  // (setManualTour(false) no alcanza: ya valia false y React no redibuja)
  const closeTour = () => {
    markTourDone(tourKey);
    setDismissed(true);
    setManualTour(false);
  };

  const goToProfile = () => {
    setMobileOpen(false);
    navigate('/perfil');
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // compact = solo íconos (barra de escritorio oculta). El cajón del celular
  // siempre se dibuja completo y sin botón de ocultar (showToggle = false).
  const renderDrawer = (compact, showToggle) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start',
          gap: 1.5,
          px: compact ? 1 : 2.5,
          py: 2,
          borderBottom: '1px solid #E3EEF6',
        }}
      >
        {showToggle ? (
          // El logo fija o auto-oculta la barra (mismo efecto que el botón de al lado).
          <Tooltip title={collapsed ? 'Fijar menú' : 'Ocultar menú'} placement="right">
            <ButtonBase
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Fijar menú' : 'Ocultar menú'}
              sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2 }}
            >
              <Logo size={40} />
            </ButtonBase>
          </Tooltip>
        ) : (
          <Logo size={40} />
        )}
        {!compact && (
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
        )}
        {showToggle && !compact && (
          <Tooltip title={collapsed ? 'Fijar menú' : 'Ocultar menú'} placement="right">
            <IconButton
              size="small"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Fijar menú' : 'Ocultar menú'}
              sx={{ ml: 'auto', color: paletteRaw.azul }}
            >
              {collapsed ? <PushPinOutlinedIcon /> : <KeyboardDoubleArrowLeftIcon />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
        {menu.map((item) => {
          const active = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Tooltip
              key={item.id}
              title={compact ? item.label : ''}
              placement="right"
            >
              <ListItemButton
                component={NavLink}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                selected={active}
                data-tour={navTourName(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  justifyContent: compact ? 'center' : 'flex-start',
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
                    minWidth: compact ? 0 : 36,
                  }}
                >
                  <Icon fontSize="small" />
                </ListItemIcon>
                {!compact && (
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { fontWeight: 600, fontSize: 14 } }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, borderTop: '1px solid #E3EEF6' }}>
        <Tooltip title={compact ? 'Ver mi perfil' : ''} placement="right">
          <Box
            onClick={goToProfile}
            data-tour="profile-sidebar"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: compact ? 'center' : 'flex-start',
              gap: 1.5,
              borderRadius: 2,
              px: compact ? 0 : 1.5,
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
            {!compact && (
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
            )}
          </Box>
        </Tooltip>
        <Tooltip title={compact ? 'Cerrar sesión' : ''} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: paletteRaw.danger,
              justifyContent: compact ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon
              sx={{ color: paletteRaw.danger, minWidth: compact ? 0 : 36 }}
            >
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {!compact && (
              <ListItemText
                primary="Cerrar sesión"
                slotProps={{ primary: { fontWeight: 600, fontSize: 14 } }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;
  const peeking = collapsed && hovered;

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
        {renderDrawer(false, false)}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: sidebarWidth,
          flexShrink: 0,
          transition: 'width 0.2s',
          // El contenedor siempre reserva el ancho de reposo; al pasar el mouse
          // la barra se despliega encima del contenido sin empujarlo.
          '& .MuiDrawer-paper': {
            width: peeking ? DRAWER_WIDTH : sidebarWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid #E3EEF6',
            overflowX: 'hidden',
            transition: 'width 0.2s, box-shadow 0.2s',
            boxShadow: peeking ? '4px 0 16px rgba(14, 76, 130, 0.15)' : 'none',
          },
        }}
        slotProps={{
          paper: {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          },
        }}
        open
      >
        {renderDrawer(collapsed && !peeking, true)}
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
                aria-label="Abrir menú"
                data-tour="menu-button"
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
              {isPatient && (
                <Tooltip title="Ver tutorial">
                  <IconButton
                    onClick={() => setManualTour(true)}
                    aria-label="Ver tutorial"
                    data-tour="tour-replay"
                    sx={{ color: paletteRaw.azul }}
                  >
                    <HelpIcon />
                  </IconButton>
                </Tooltip>
              )}
              {/* Envoltorio para que el tutorial pueda resaltar la campana */}
              <Box data-tour="notifications" sx={{ display: 'flex' }}>
                <NotificationsBell />
              </Box>
              <Box
                onClick={goToProfile}
                data-tour="profile-topbar"
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

      {/* Vive en el layout para seguir abierto mientras navega entre paginas */}
      {tourOpen && (
        <GuidedTour steps={PATIENT_TOUR_STEPS} onClose={closeTour} />
      )}
    </Box>
  );
}
