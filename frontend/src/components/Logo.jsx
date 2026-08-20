import logo from '../assets/logo.png';

/**
 * Logo de Paciente360º.
 *
 * Usa el PNG oficial con fondo transparente, asi se ve bien tanto sobre
 * blanco como sobre el celeste del login. Se exporta a 512px para que no
 * se vea borroso en pantallas de alta densidad aunque se muestre chico.
 */
export default function Logo({ size = 40, ...props }) {
  return (
    <img
      src={logo}
      width={size}
      height={size}
      alt="Paciente360º"
      style={{ display: 'block', objectFit: 'contain' }}
      {...props}
    />
  );
}
