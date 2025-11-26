import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isPopup = process.env.BUILD_TARGET === 'popup'
const isContent = process.env.BUILD_TARGET === 'content'
const isBackground = process.env.BUILD_TARGET === 'background'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  publicDir: isPopup ? 'public' : false,
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: isPopup,
    cssCodeSplit: false,
    target: 'esnext',
    minify: true,
    rollupOptions: {
      input: isPopup
        ? { popup: resolve(__dirname, 'src/popup/index.html') }
        : isContent
        ? { content: resolve(__dirname, 'src/content/index.tsx') }
        : isBackground
        ? { background: resolve(__dirname, 'src/background/index.ts') }
        : {},
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') return 'content-script.js'
          if (chunkInfo.name === 'background') return 'background.js'
          return 'popup/[name].js'
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'popup/styles.css'
          }
          return 'assets/[name][extname]'
        },
        // For content script, bundle everything together
        ...(isContent && {
          inlineDynamicImports: true,
        }),
      },
    },
  },
})
