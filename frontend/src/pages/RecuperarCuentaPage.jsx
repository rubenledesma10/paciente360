import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { gradients, paletteRaw } from '../theme/theme'
import { forgotPassword } from '../api/auth'

const schema = yup.object({
  email: yup.string().email('Ingresá un email válido').required('Ingresá tu email'),
})

export default function RecuperarCuentaPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async ({ email }) => {
    try {
      await forgotPassword(email)
    } catch {
      // Se ignora el error (incluido 404 "User not found") a propósito:
      // no debe revelarse si un email está registrado o no.
    } finally {
      setSent(true)
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
            Recuperar usuario y contraseña
          </Typography>
        </Box>
        <Paper sx={{ p: 4 }}>
          {sent ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Si el email ingresado corresponde a una cuenta registrada, te enviaremos las
                instrucciones para recuperar tu usuario y contraseña.
              </Alert>
              <Typography variant="body2" align="center">
                <Link component={RouterLink} to="/login">
                  Volver a iniciar sesión
                </Link>
              </Typography>
            </>
          ) : (
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Typography variant="body2" sx={{ mb: 2 }} color={paletteRaw.gray}>
                Ingresá el email con el que te registraste y te enviaremos las instrucciones para
                recuperar tu usuario y contraseña.
              </Typography>
              <TextField
                label="Email"
                fullWidth
                margin="normal"
                autoFocus
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
                sx={{ mt: 2 }}
              >
                Recuperar contraseña
              </Button>
              <Typography variant="body2" align="center" sx={{ mt: 2 }} color={paletteRaw.gray}>
                <Link component={RouterLink} to="/login">
                  Volver a iniciar sesión
                </Link>
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
