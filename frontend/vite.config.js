import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Id distinto en cada `npm run dev` o build: la intro se muestra una vez por arranque
  define: {
    __APP_SESSION__: JSON.stringify(Date.now().toString()),
  },
});
