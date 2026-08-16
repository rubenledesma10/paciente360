import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { getPatients } from '../../api/patients'
import { getMedicalProducts, createMedicalProduct } from '../../api/medicalProducts'
import { getStockMovements, createStockMovement } from '../../api/stockMovements'
import { getTraceabilities, createTraceability } from '../../api/traceabilities'
import { getWaitingPatients } from '../../api/signsAndSymptoms'
import { formatDate, formatDateTime } from '../../utils/dateFormat'
import { getPatientAge, getPatientDni } from '../../utils/patientDisplay'
import { paletteRaw } from '../../theme/theme'

const movementSchema = yup.object({
  id_product: yup.number().typeError('Elegí un producto').required(),
  type_movement: yup.string().oneOf(['Entrada', 'Desechado']).required(),
  quantity: yup
    .number()
    .typeError('Ingresá la cantidad')
    .positive('La cantidad debe ser mayor a 0')
    .required(),
})

const traceSchema = yup.object({
  id_patient: yup.number().typeError('Elegí un paciente').required(),
  id_product: yup.number().typeError('Elegí un producto').required(),
  quantity: yup
    .number()
    .typeError('Ingresá la cantidad')
    .positive('La cantidad debe ser mayor a 0')
    .integer('Debe ser un número entero')
    .required('Ingresá la cantidad'),
})

const PRODUCT_TYPES = [
  // Medicamentos
  'Analgésicos',
  'Antibióticos',
  'Antivirales',
  'Antiinflamatorios',
  'Antipiréticos',
  'Antihistamínicos',
  'Antihipertensivos',
  'Anestésicos',
  'Vacunas',
  'Soluciones y sueros',
  // Insumos y material
  'Descartables',
  'Material de curación',
  'Material de sutura',
  'Instrumental médico',
  'Equipos de protección personal (EPP)',
  'Prótesis',
  'Oxígeno y gases medicinales',
  'Reactivos de laboratorio',
  'Otro',
]

const productSchema = yup.object({
  name_product: yup.string().required('Ingresá el nombre del producto'),
  type_product: yup.string().nullable(),
  batch_number: yup.string().nullable(),
  expiration_date: yup
    .string()
    .nullable()
    .test(
      'not-expired',
      'La fecha de vencimiento no puede ser anterior a hoy',
      (value) => !value || value >= dayjs().format('YYYY-MM-DD'),
    ),
  current_stock: yup
    .number()
    .typeError('Ingresá el stock inicial')
    .min(0, 'No puede ser negativo')
    .required(),
  minimum_stock_level: yup
    .number()
    .typeError('Ingresá el stock mínimo')
    .min(0, 'No puede ser negativo')
    .required(),
})

export default function StockPage() {
  const [tab, setTab] = useState('inv')
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [traceabilities, setTraceabilities] = useState([])
  const [patients, setPatients] = useState([])
  const [waitingPatients, setWaitingPatients] = useState([])
  const [loadError, setLoadError] = useState('')
  const [movOpen, setMovOpen] = useState(false)
  const [movError, setMovError] = useState('')
  const [traceOpen, setTraceOpen] = useState(false)
  const [traceError, setTraceError] = useState('')
  const [productOpen, setProductOpen] = useState(false)
  const [productError, setProductError] = useState('')
  const [highlightedProductId, setHighlightedProductId] = useState(null)
  const [duplicateNotice, setDuplicateNotice] = useState('')
  const productRowRefs = useRef({})

  const movForm = useForm({
    resolver: yupResolver(movementSchema),
    defaultValues: { type_movement: 'Entrada' },
  })
  const traceForm = useForm({ resolver: yupResolver(traceSchema) })
  const productForm = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: { current_stock: 0, minimum_stock_level: 0 },
  })

  const productName = (id) => {
    const p = products.find((x) => x.id_product === id)
    return p ? p.name_product : '—'
  }
  const patientName = (id) => {
    const p = patients.find((x) => x.id_user === id)
    return p ? `${p.first_name} ${p.last_name}` : '—'
  }

  const loadAll = async () => {
    setLoadError('')
    try {
      const [productsRes, movementsRes, traceRes, patientsRes] = await Promise.all([
        getMedicalProducts(),
        getStockMovements(),
        getTraceabilities(),
        getPatients(),
      ])
      setProducts(productsRes.data)
      setMovements(movementsRes.data)
      setTraceabilities(traceRes.data)
      setPatients(patientsRes.data)
    } catch {
      setLoadError('No se pudo cargar la información de stock. Reintentá más tarde.')
    }
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoadError('')
      try {
        const [productsRes, movementsRes, traceRes, patientsRes] = await Promise.all([
          getMedicalProducts(),
          getStockMovements(),
          getTraceabilities(),
          getPatients(),
        ])
        if (!ignore) {
          setProducts(productsRes.data)
          setMovements(movementsRes.data)
          setTraceabilities(traceRes.data)
          setPatients(patientsRes.data)
        }
      } catch {
        if (!ignore) {
          setLoadError('No se pudo cargar la información de stock. Reintentá más tarde.')
        }
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (highlightedProductId == null) return
    productRowRefs.current[highlightedProductId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    const timeoutId = setTimeout(() => {
      setHighlightedProductId(null)
      setDuplicateNotice('')
    }, 4000)
    return () => clearTimeout(timeoutId)
  }, [highlightedProductId])

  const lowStock = useMemo(
    () => products.filter((p) => p.current_stock <= p.minimum_stock_level),
    [products],
  )

  const expiringProducts = useMemo(() => products.filter((p) => p.por_vencer), [products])
  const expiredProducts = useMemo(() => products.filter((p) => p.vencido), [products])

  const watchedTraceProductId = useWatch({
    control: traceForm.control,
    name: 'id_product',
  })
  const selectedTraceProduct = products.find(
    (p) => p.id_product === Number(watchedTraceProductId),
  )

  const openMovDialog = () => {
    setMovError('')
    movForm.reset({ id_product: '', type_movement: 'Entrada', quantity: '' })
    setMovOpen(true)
  }

  const openTraceDialog = async () => {
    setTraceError('')
    traceForm.reset({ id_patient: '', id_product: '', quantity: 1 })
    try {
      const res = await getWaitingPatients()
      setWaitingPatients(res.data)
    } catch {
      setTraceError('No se pudo cargar la lista de pacientes en espera.')
    }
    setTraceOpen(true)
  }

  const openProductDialog = () => {
    setProductError('')
    productForm.reset({
      name_product: '',
      type_product: '',
      batch_number: '',
      expiration_date: '',
      current_stock: 0,
      minimum_stock_level: 0,
    })
    setProductOpen(true)
  }

  const onMovSubmit = async (values) => {
    setMovError('')
    try {
      await createStockMovement(values)
      setMovOpen(false)
      loadAll()
    } catch (err) {
      setMovError(err.response?.data?.msg || 'No se pudo registrar el movimiento.')
    }
  }

  const onTraceSubmit = async (values) => {
    setTraceError('')
    try {
      await createTraceability(values)
      setTraceOpen(false)
      loadAll()
    } catch (err) {
      setTraceError(err.response?.data?.msg || 'No se pudo registrar el uso.')
    }
  }

  const onProductSubmit = async (values) => {
    setProductError('')
    const normalizedName = values.name_product.trim().toLowerCase()
    const duplicate = products.find(
      (p) => p.name_product.trim().toLowerCase() === normalizedName,
    )
    if (duplicate) {
      setProductOpen(false)
      setTab('inv')
      setDuplicateNotice(
        `Ya existe "${duplicate.name_product}" en el inventario. Te mostramos su fila abajo.`,
      )
      setHighlightedProductId(duplicate.id_product)
      return
    }
    try {
      await createMedicalProduct({
        ...values,
        expiration_date: values.expiration_date || null,
      })
      setProductOpen(false)
      loadAll()
    } catch (err) {
      setProductError(err.response?.data?.msg || 'No se pudo crear el producto.')
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color={paletteRaw.azulD}>
            Control de stock
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray}>
            Insumos, movimientos y trazabilidad
          </Typography>
        </Box>
        {tab === 'inv' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openProductDialog}>
              Nuevo producto
            </Button>
          </Box>
        )}
        {tab === 'mov' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openMovDialog}>
            Movimiento
          </Button>
        )}
        {tab === 'trz' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openTraceDialog}>
            Registrar uso
          </Button>
        )}
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      {duplicateNotice && <Alert severity="info" sx={{ mb: 2 }}>{duplicateNotice}</Alert>}
      {lowStock.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Stock bajo: {lowStock.map((p) => p.name_product).join(', ')}
        </Alert>
      )}
      {expiringProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          PM por vencer: {expiringProducts.map((p) => p.name_product).join(', ')}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="inv" label="Inventario" />
        <Tab value="mov" label="Movimientos" />
        <Tab value="trz" label="Trazabilidad" />
      </Tabs>

      {tab === 'inv' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Mínimo</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell>Vence</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => {
                const low = p.current_stock <= p.minimum_stock_level
                return (
                  <TableRow
                    key={p.id_product}
                    ref={(el) => {
                      productRowRefs.current[p.id_product] = el
                    }}
                    sx={{
                      backgroundColor:
                        highlightedProductId === p.id_product ? 'action.selected' : undefined,
                      transition: 'background-color 0.3s',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{p.name_product}</TableCell>
                    <TableCell><Chip size="small" label={p.type_product || '—'} /></TableCell>
                    <TableCell sx={{ color: low ? paletteRaw.danger : 'inherit', fontWeight: 700 }}>
                      {p.current_stock}
                    </TableCell>
                    <TableCell sx={{ color: paletteRaw.gray }}>{p.minimum_stock_level}</TableCell>
                    <TableCell>{p.batch_number || '—'}</TableCell>
                    <TableCell>{formatDate(p.expiration_date)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={low ? 'Reponer' : 'OK'} color={low ? 'error' : 'success'} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'mov' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Fecha/Hora</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id_stock_movement}>
                  <TableCell sx={{ fontWeight: 600 }}>{productName(m.id_product)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={m.type_movement}
                      color={
                        m.type_movement === 'Entrada'
                          ? 'success'
                          : m.type_movement === 'Desechado'
                            ? 'error'
                            : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell sx={{ color: paletteRaw.gray }}>{formatDateTime(m.date_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'trz' && (
        <>
          {expiredProducts.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              PM vencidos: {expiredProducts.map((p) => p.name_product).join(', ')}
            </Alert>
          )}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Paciente</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Edad</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell>Vence</TableCell>
                <TableCell>Fecha de uso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {traceabilities.map((t) => {
                const product = products.find((p) => p.id_product === t.id_product)
                const patient = patients.find((p) => p.id_user === t.id_patient)
                return (
                  <TableRow key={t.id_traceability}>
                    <TableCell sx={{ fontWeight: 600 }}>{patientName(t.id_patient)}</TableCell>
                    <TableCell>{getPatientDni(patient)}</TableCell>
                    <TableCell>{getPatientAge(patient?.date_of_birth) ?? '—'}</TableCell>
                    <TableCell>{productName(t.id_product)}</TableCell>
                    <TableCell>{t.quantity}</TableCell>
                    <TableCell><Chip size="small" label={product?.batch_number || '—'} /></TableCell>
                    <TableCell>{formatDate(product?.expiration_date)}</TableCell>
                    <TableCell sx={{ color: paletteRaw.gray }}>{formatDateTime(t.date_of_use)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}

      <Dialog open={movOpen} onClose={() => setMovOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Movimiento de stock</DialogTitle>
        <Box component="form" onSubmit={movForm.handleSubmit(onMovSubmit)} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {movError && <Alert severity="error">{movError}</Alert>}
            <Controller
              name="id_product"
              control={movForm.control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Producto"
                  error={!!movForm.formState.errors.id_product}
                  helperText={movForm.formState.errors.id_product?.message}
                >
                  {products.map((p) => (
                    <MenuItem key={p.id_product} value={p.id_product}>
                      {p.name_product} (stock {p.current_stock})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="type_movement"
                control={movForm.control}
                render={({ field }) => (
                  <TextField {...field} select label="Tipo" fullWidth>
                    <MenuItem value="Entrada">Entrada</MenuItem>
                    <MenuItem value="Desechado">Desechado</MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label="Cantidad"
                type="number"
                fullWidth
                {...movForm.register('quantity')}
                error={!!movForm.formState.errors.quantity}
                helperText={movForm.formState.errors.quantity?.message}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMovOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={movForm.formState.isSubmitting}>
              Aplicar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={traceOpen} onClose={() => setTraceOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar uso de producto</DialogTitle>
        <Box component="form" onSubmit={traceForm.handleSubmit(onTraceSubmit)} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {traceError && <Alert severity="error">{traceError}</Alert>}
            <Controller
              name="id_patient"
              control={traceForm.control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Paciente"
                  error={!!traceForm.formState.errors.id_patient}
                  helperText={
                    traceForm.formState.errors.id_patient?.message ||
                    (waitingPatients.length === 0
                      ? 'No hay pacientes en espera en este momento.'
                      : '')
                  }
                >
                  {waitingPatients.map((p) => (
                    <MenuItem key={p.id_patient} value={p.id_patient}>
                      {p.patient_name} — DNI {p.dni}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="id_product"
              control={traceForm.control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Producto"
                  error={!!traceForm.formState.errors.id_product}
                  helperText={traceForm.formState.errors.id_product?.message}
                >
                  {products.map((p) => (
                    <MenuItem key={p.id_product} value={p.id_product}>
                      {p.name_product} — Lote {p.batch_number || '—'}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Cantidad (cajas)"
              type="number"
              fullWidth
              {...traceForm.register('quantity')}
              error={!!traceForm.formState.errors.quantity}
              helperText={traceForm.formState.errors.quantity?.message}
            />
            {selectedTraceProduct && (
              <Alert severity="info">
                Lote {selectedTraceProduct.batch_number || '—'} · Vence{' '}
                {formatDate(selectedTraceProduct.expiration_date)}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTraceOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={traceForm.formState.isSubmitting}>
              Registrar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={productOpen} onClose={() => setProductOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo producto médico</DialogTitle>
        <Box component="form" onSubmit={productForm.handleSubmit(onProductSubmit)} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {productError && <Alert severity="error">{productError}</Alert>}
            <TextField
              label="Nombre del producto"
              fullWidth
              {...productForm.register('name_product')}
              error={!!productForm.formState.errors.name_product}
              helperText={productForm.formState.errors.name_product?.message}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="type_product"
                control={productForm.control}
                defaultValue=""
                render={({ field }) => (
                  <TextField {...field} select label="Tipo" fullWidth>
                    {PRODUCT_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Número de lote"
                fullWidth
                {...productForm.register('batch_number')}
              />
            </Box>
            <TextField
              label="Fecha de vencimiento"
              type="date"
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: dayjs().format('YYYY-MM-DD') },
              }}
              {...productForm.register('expiration_date')}
              error={!!productForm.formState.errors.expiration_date}
              helperText={productForm.formState.errors.expiration_date?.message}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Stock inicial"
                type="number"
                fullWidth
                {...productForm.register('current_stock')}
                error={!!productForm.formState.errors.current_stock}
                helperText={productForm.formState.errors.current_stock?.message}
              />
              <TextField
                label="Stock mínimo"
                type="number"
                fullWidth
                {...productForm.register('minimum_stock_level')}
                error={!!productForm.formState.errors.minimum_stock_level}
                helperText={productForm.formState.errors.minimum_stock_level?.message}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProductOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={productForm.formState.isSubmitting}>
              Crear
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
