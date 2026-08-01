import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { createPatient } from '../api/patients'
import { gradients, paletteRaw } from '../theme/theme'

const schema = yup.object({
  first_name: yup.string().required('Ingresá tu nombre'),
  last_name: yup.string().required('Ingresá tu apellido'),
  username: yup.string().required('Elegí un usuario'),
  dni: yup.string().required('Ingresá tu DNI'),
  email: yup.string().email('Email inválido').required('Ingresá tu email'),
  password: yup.string().min(6, 'Mínimo 6 caracteres').required('Ingresá una contraseña'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
    .required('Confirmá tu contraseña'),
  date_of_birth: yup.string().required('Ingresá tu fecha de nacimiento'),
  phone_number: yup.string().nullable(),
  gender: yup.string().nullable(),
  address: yup.string().nullable(),
  health_plan_status: yup.boolean(),
  health_plan_name: yup.string().nullable(),
  member_number: yup.string().nullable(),
})

export default function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { health_plan_status: false },
  })

  const hasHealthPlan = useWatch({ control, name: 'health_plan_status' })

  const onSubmit = async (values) => {
    setServerError('')
    try {
      const { confirmPassword, ...payload } = values
      void confirmPassword
      await createPatient(payload)
      setSuccess(true)
    } catch (err) {
      setServerError(err.response?.data?.msg || 'No se pudo crear la cuenta.')
    }
  }

  if (success) {
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
        <Paper sx={{ p: 5, maxWidth: 420, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={800} color={paletteRaw.azulD} gutterBottom>
            ¡Cuenta creada!
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray} sx={{ mb: 3 }}>
            Ya podés iniciar sesión con tu usuario y contraseña.
          </Typography>
          <Button variant="contained" fullWidth onClick={() => navigate('/login', { replace: true })}>
            Ir a iniciar sesión
          </Button>
        </Paper>
      </Box>
    )
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
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
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
            <LocalHospitalIcon sx={{ fontSize: 34, color: paletteRaw.celeste }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="#fff">
            Crear cuenta de paciente
          </Typography>
        </Box>
        <Paper sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}

            <Typography variant="subtitle2" fontWeight={700} color={paletteRaw.azulD} sx={{ mt: 1, mb: 1 }}>
              Datos personales
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Nombre"
                fullWidth
                margin="dense"
                {...register('first_name')}
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
              />
              <TextField
                label="Apellido"
                fullWidth
                margin="dense"
                {...register('last_name')}
                error={!!errors.last_name}
                helperText={errors.last_name?.message}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="DNI"
                fullWidth
                margin="dense"
                {...register('dni')}
                error={!!errors.dni}
                helperText={errors.dni?.message}
              />
              <TextField
                label="Fecha de nacimiento"
                type="date"
                fullWidth
                margin="dense"
                slotProps={{ inputLabel: { shrink: true } }}
                {...register('date_of_birth')}
                error={!!errors.date_of_birth}
                helperText={errors.date_of_birth?.message}
              />
            </Box>
            <TextField
              select
              label="Género"
              fullWidth
              margin="dense"
              defaultValue=""
              {...register('gender')}
            >
              <MenuItem value="">Prefiero no decir</MenuItem>
              <MenuItem value="F">Femenino</MenuItem>
              <MenuItem value="M">Masculino</MenuItem>
              <MenuItem value="Otro">Otro</MenuItem>
            </TextField>

            <Typography variant="subtitle2" fontWeight={700} color={paletteRaw.azulD} sx={{ mt: 2, mb: 1 }}>
              Contacto
            </Typography>
            <TextField
              label="Email"
              fullWidth
              margin="dense"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Teléfono" fullWidth margin="dense" {...register('phone_number')} />
              <TextField label="Dirección" fullWidth margin="dense" {...register('address')} />
            </Box>

            <Typography variant="subtitle2" fontWeight={700} color={paletteRaw.azulD} sx={{ mt: 2, mb: 1 }}>
              Cobertura de salud (opcional)
            </Typography>
            <FormControlLabel
              control={<Checkbox {...register('health_plan_status')} />}
              label="Tengo obra social / prepaga"
            />
            {hasHealthPlan && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Obra social" fullWidth margin="dense" {...register('health_plan_name')} />
                <TextField label="N° de afiliado" fullWidth margin="dense" {...register('member_number')} />
              </Box>
            )}

            <Typography variant="subtitle2" fontWeight={700} color={paletteRaw.azulD} sx={{ mt: 2, mb: 1 }}>
              Acceso
            </Typography>
            <TextField
              label="Usuario"
              fullWidth
              margin="dense"
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Contraseña"
                type="password"
                fullWidth
                margin="dense"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                label="Confirmar contraseña"
                type="password"
                fullWidth
                margin="dense"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 3 }}
            >
              {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
            <Typography variant="body2" align="center" sx={{ mt: 2 }} color={paletteRaw.gray}>
              ¿Ya tenés cuenta?{' '}
              <Link component={RouterLink} to="/login">
                Iniciar sesión
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
