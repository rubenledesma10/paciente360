import { createTheme } from '@mui/material/styles'

export const paletteRaw = {
  celeste: '#29ABE2',
  celesteL: '#5CC4EE',
  celesteXL: '#E3F3FB',
  azul: '#1565A8',
  azulD: '#0E4C82',
  azulXD: '#0A3A64',
  bg: '#EEF6FC',
  ok: '#22a06b',
  warn: '#E9A23B',
  danger: '#D9534F',
  ink: '#0f2b45',
  gray: '#5b7387',
}

export const gradients = {
  header: `linear-gradient(120deg, ${paletteRaw.azulD}, ${paletteRaw.azul} 55%, ${paletteRaw.celeste})`,
  login: `linear-gradient(135deg, ${paletteRaw.azulD} 0%, ${paletteRaw.azul} 45%, ${paletteRaw.celeste} 100%)`,
}

const theme = createTheme({
  palette: {
    primary: {
      main: paletteRaw.celeste,
      light: paletteRaw.celesteL,
      dark: paletteRaw.azul,
      contrastText: '#ffffff',
    },
    secondary: {
      main: paletteRaw.azulD,
      dark: paletteRaw.azulXD,
      light: paletteRaw.celeste,
      contrastText: '#ffffff',
    },
    error: { main: paletteRaw.danger },
    warning: { main: paletteRaw.warn },
    success: { main: paletteRaw.ok },
    background: {
      default: paletteRaw.bg,
      paper: '#ffffff',
    },
    text: {
      primary: paletteRaw.ink,
      secondary: paletteRaw.gray,
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      'system-ui',
      '-apple-system',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 14px rgba(21,101,168,0.08)',
          border: `1px solid #E3EEF6`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #E3EEF6',
        },
      },
    },
  },
})

export default theme
