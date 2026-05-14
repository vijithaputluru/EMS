import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ["es2019", "edge88", "firefox78", "safari14"],
    cssTarget: ["edge88", "firefox78", "safari14"],
  },
})
