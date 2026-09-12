import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { fileURLToPath, URL } from 'node:url'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const envPort = Number(process.env.PORT)

const devPort =
  Number.isInteger(envPort) && envPort > 0
    ? envPort
    : 3000

const config = defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      disableTypes: true,
      generatedRouteTree: './src/routeTree.gen.js',
    }),
    viteReact(),
  ],
  server: {
    port: devPort,
    strictPort: Boolean(process.env.PORT),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // shadcn components were generated with absolute "src/..." imports
      src: fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

export default config
