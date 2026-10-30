import { createServer } from 'node:http'
import sirv from 'sirv'
import { attachRoomServer } from './rooms'

const assets = sirv('dist', { single: true })
const http = createServer((request, response) => {
  if (request.url === '/health') { response.writeHead(200, { 'Content-Type': 'text/plain' }); response.end('ok'); return }
  assets(request, response)
})
const rooms = attachRoomServer(http)
const port = Number(process.env.PORT ?? 3000)
http.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`Orlog: http://localhost:${port}`))
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => { await rooms.close(); process.exit(0) })
