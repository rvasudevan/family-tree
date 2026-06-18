import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createApp } from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3001)
const SERVE_STATIC = process.env.SERVE_STATIC === '1'

const app = createApp()

if (SERVE_STATIC) {
  const distDir = path.join(__dirname, '../dist')
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const server = app.listen(PORT, () => {
  console.log(`Family tree API listening on http://localhost:${PORT}`)
  if (SERVE_STATIC) {
    console.log('Serving frontend from dist/')
  }
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`)
    console.error(`Stop the other process: lsof -ti:${PORT} | xargs kill`)
    console.error(`Or use a different port: PORT=3002 npm run dev:server`)
  } else {
    console.error('Server failed to start:', err.message)
  }
  process.exit(1)
})
