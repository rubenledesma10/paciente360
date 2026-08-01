// import { useEffect, useState } from 'react'
// import { useForm, Controller } from 'react-hook-form'
// import { yupResolver } from '@hookform/resolvers/yup'
// import * as yup from 'yup'
// import {
//   Alert,
//   Avatar,
//   Box,
//   Button,
//   Card,
//   Chip,
//   Dialog,
//   DialogActions,
//   DialogContent,
//   DialogTitle,
//   Grid,
//   MenuItem,
//   TextField,
//   Typography,
// } from '@mui/material'
// import AddIcon from '@mui/icons-material/Add'
// import { getPatients } from '../../api/patients'
// import {
//   getFollowUps,
//   createFollowUp,
//   toggleFollowUpFinish,
// } from '../../api/followUps'
// import { useAuth } from '../../context/useAuth'
// import { formatDate, formatDateTime } from '../../utils/dateFormat'
// import { paletteRaw } from '../../theme/theme'

// const schema = yup.object({
//   id_patient: yup.number().typeError('Elegí un paciente').required(),
//   observations: yup.string().required('Ingresá las observaciones'),
//   next_check_up: yup.string().nullable(),
// })

// export default function SeguimientoPage() {
//   const { userId } = useAuth()
//   const [rows, setRows] = useState([])
//   const [patients, setPatients] = useState([])
//   const [loadError, setLoadError] = useState('')
//   const [open, setOpen] = useState(false)
//   const [formError, setFormError] = useState('')

//   const {
//     register,
//     handleSubmit,
//     control,
//     reset,
//     formState: { errors, isSubmitting },
//   } = useForm({ resolver: yupResolver(schema) })

//   const patientName = (id) => {
//     const p = patients.find((x) => x.id_user === id)
//     return p ? `${p.first_name} ${p.last_name}` : '—'
//   }

//   const loadAll = async () => {
//     setLoadError('')
//     try {
//       const [followUpsRes, patientsRes] = await Promise.all([
//         getFollowUps(),
//         getPatients(),
//       ])
//       setRows(followUpsRes.data)
//       setPatients(patientsRes.data)
//     } catch {
//       setLoadError('No se pudo cargar la información. Reintentá más tarde.')
//     }
//   }

//   useEffect(() => {
//     let ignore = false
//     ;(async () => {
//       setLoadError('')
//       try {
//         const [followUpsRes, patientsRes] = await Promise.all([
//           getFollowUps(),
//           getPatients(),
//         ])
//         if (!ignore) {
//           setRows(followUpsRes.data)
//           setPatients(patientsRes.data)
//         }
//       } catch {
//         if (!ignore) {
//           setLoadError('No se pudo cargar la información. Reintentá más tarde.')
//         }
//       }
//     })()
//     return () => {
//       ignore = true
//     }
//   }, [])

//   const openDialog = () => {
//     setFormError('')
//     reset({ id_patient: '', observations: '', next_check_up: '' })
//     setOpen(true)
//   }

//   const onSubmit = async (values) => {
//     setFormError('')
//     try {
//       await createFollowUp({
//         id_patient: values.id_patient,
//         id_nurse: userId,
//         observations: values.observations,
//         next_check_up: values.next_check_up || null,
//         finish: false,
//       })
//       setOpen(false)
//       loadAll()
//     } catch (err) {
//       setFormError(
//         err.response?.data?.error || err.response?.data?.msg || 'No se pudo guardar el seguimiento.',
//       )
//     }
//   }

//   const toggle = async (id) => {
//     try {
//       await toggleFollowUpFinish(id)
//       loadAll()
//     } catch {
//       setLoadError('No se pudo actualizar el estado del seguimiento.')
//     }
//   }

//   const pendingCount = rows.filter((r) => !r.finish).length

//   return (
//     <Box>
//       <Box
//         sx={{
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           mb: 3,
//         }}
//       >
//         <Box>
//           <Typography variant="h5" fontWeight={800} color={paletteRaw.azulD}>
//             Seguimiento del paciente
//           </Typography>
//           <Typography variant="body2" color={paletteRaw.gray}>
//             Evolución y recordatorios
//           </Typography>
//         </Box>
//         <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
//           Nuevo
//         </Button>
//       </Box>

//       {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
//       {pendingCount > 0 && (
//         <Alert severity="info" sx={{ mb: 2 }}>
//           Tenés {pendingCount} paciente(s) con seguimiento pendiente
//         </Alert>
//       )}

//       <Grid container spacing={2}>
//         {rows.map((fu) => (
//           <Grid key={fu.id_follow_up} size={{ xs: 12, md: 6 }}>
//             <Card sx={{ p: 2.5 }}>
//               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
//                   <Avatar sx={{ bgcolor: paletteRaw.celesteXL, color: paletteRaw.azul, fontWeight: 700 }}>
//                     {patientName(fu.id_patient).charAt(0)}
//                   </Avatar>
//                   <Box>
//                     <Typography fontWeight={700} color={paletteRaw.azulD}>
//                       {patientName(fu.id_patient)}
//                     </Typography>
//                     <Typography variant="caption" color={paletteRaw.gray}>
//                       {formatDateTime(fu.date_time)}
//                     </Typography>
//                   </Box>
//                 </Box>
//                 <Chip
//                   size="small"
//                   label={fu.finish ? 'Finalizado' : 'Activo'}
//                   color={fu.finish ? 'success' : 'warning'}
//                 />
//               </Box>
//               <Typography variant="body2" sx={{ mt: 2 }} color={paletteRaw.ink}>
//                 {fu.observations}
//               </Typography>
//               {fu.next_check_up && (
//                 <Typography variant="caption" sx={{ mt: 1, display: 'block' }} color={paletteRaw.celeste} fontWeight={700}>
//                   Próximo control: {formatDate(fu.next_check_up)}
//                 </Typography>
//               )}
//               <Button
//                 size="small"
//                 variant="outlined"
//                 sx={{ mt: 2 }}
//                 onClick={() => toggle(fu.id_follow_up)}
//               >
//                 {fu.finish ? 'Reabrir' : 'Marcar finalizado'}
//               </Button>
//             </Card>
//           </Grid>
//         ))}
//         {rows.length === 0 && (
//           <Grid size={{ xs: 12 }}>
//             <Typography color={paletteRaw.gray}>Todavía no hay seguimientos.</Typography>
//           </Grid>
//         )}
//       </Grid>

//       <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
//         <DialogTitle>Nuevo seguimiento</DialogTitle>
//         <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
//           <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//             {formError && <Alert severity="error">{formError}</Alert>}
//             <Controller
//               name="id_patient"
//               control={control}
//               defaultValue=""
//               render={({ field }) => (
//                 <TextField
//                   {...field}
//                   select
//                   label="Paciente"
//                   error={!!errors.id_patient}
//                   helperText={errors.id_patient?.message}
//                 >
//                   {patients.map((p) => (
//                     <MenuItem key={p.id_user} value={p.id_user}>
//                       {p.first_name} {p.last_name}
//                     </MenuItem>
//                   ))}
//                 </TextField>
//               )}
//             />
//             <TextField
//               label="Observaciones de evolución"
//               multiline
//               minRows={2}
//               {...register('observations')}
//               error={!!errors.observations}
//               helperText={errors.observations?.message}
//             />
//             <TextField
//               label="Próximo control"
//               type="date"
//               slotProps={{ inputLabel: { shrink: true } }}
//               {...register('next_check_up')}
//             />
//           </DialogContent>
//           <DialogActions sx={{ px: 3, pb: 2 }}>
//             <Button onClick={() => setOpen(false)}>Cancelar</Button>
//             <Button type="submit" variant="contained" disabled={isSubmitting}>
//               Guardar
//             </Button>
//           </DialogActions>
//         </Box>
//       </Dialog>
//     </Box>
//   )
// }
