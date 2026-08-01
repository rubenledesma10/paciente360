import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { useAuth } from '../context/useAuth'
import { roleHome } from '../utils/roleHome'
import { gradients, paletteRaw } from '../theme/theme'

const schema = yup.object({
  username: yup.string().required('Ingresá tu usuario'),
  password: yup.string().required('Ingresá tu contraseña'),
})

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async ({ username, password }) => {
    setServerError('')
    setSubmitting(true)
    try {
      const { rol } = await login(username, password)
      navigate(roleHome(rol), { replace: true })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: gradients.login,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 76,
              height: 76,
              mx: 'auto',
              mb: 2,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <LocalHospitalIcon sx={{ fontSize: 40, color: paletteRaw.celeste }} />
          </Box>
          <Typography variant="h4" fontWeight={800} color="#fff">
            Paciente<span style={{ color: paletteRaw.celesteL }}>360º</span>
          </Typography>
          <Typography variant="body2" sx={{ color: '#D7ECF8' }}>
            Ingresá con tu usuario y contraseña
          </Typography>
        </Box>
        <Paper sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}
            <TextField
              label="Usuario"
              fullWidth
              margin="normal"
              autoFocus
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting}
              sx={{ mt: 2 }}
            >
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
            <Typography variant="body2" align="center" sx={{ mt: 2 }} color={paletteRaw.gray}>
              ¿Sos paciente y no tenés cuenta?{' '}
              <Link component={RouterLink} to="/register">
                Crear cuenta
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
