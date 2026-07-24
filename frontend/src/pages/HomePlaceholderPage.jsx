import { Box, Card, Typography } from '@mui/material'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import { useAuth } from '../context/useAuth'
import { ROLE_LABELS } from '../components/layout/menuConfig'
import { paletteRaw } from '../theme/theme'

export default function HomePlaceholderPage() {
  const { rol, nombre } = useAuth()
  const roleLabel = ROLE_LABELS[rol] || rol

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 2, sm: 6 } }}>
      <Card sx={{ p: 5, maxWidth: 480, textAlign: 'center' }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: paletteRaw.celesteXL,
            color: paletteRaw.azul,
          }}
        >
          <HourglassTopIcon fontSize="large" />
        </Box>
        <Typography variant="h6" fontWeight={800} color={paletteRaw.azulD} gutterBottom>
          ¡Bienvenido/a, {nombre}!
        </Typography>
        <Typography variant="body2" color={paletteRaw.gray}>
          El módulo para el rol {roleLabel} todavía no está disponible en esta
          versión. Vas a poder usarlo en una próxima entrega.
        </Typography>
      </Card>
    </Box>
  )
}
