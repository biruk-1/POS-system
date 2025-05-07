export default {
  root: '.',
  base: './',
  publicDir: 'public',
  cacheDir: 'node_modules/.vite',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  plugins: []
} 