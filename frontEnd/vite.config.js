import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  // Disable CSS minification (lightningcss) because some Tailwind at-rules
  // used in this project (e.g. @theme) are not recognized by lightningcss
  // during the Vercel production build. This prevents the build error:
  // "[lightningcss minify] Unknown at rule: @theme".
  build: {
    cssMinify: false
  }
})

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'
// import basicSsl from '@vitejs/plugin-basic-ssl'

// export default {
//   plugins: [
//     basicSsl()
//   ]
// }
