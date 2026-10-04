import { createServer } from 'node:http'

// Stands in for api.resend.com during QA. Captures every message and can be told to fail the next N requests.
const sent = []
let failNext = 0

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const json = (code, body) => {
    res.writeHead(code, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  if (req.method === 'GET' && url.pathname === '/sent') return json(200, sent)
  if (req.method === 'POST' && url.pathname === '/reset') {
    sent.length = 0
    failNext = 0
    return json(200, { ok: true })
  }
  if (req.method === 'POST' && url.pathname === '/fail') {
    failNext = Number(url.searchParams.get('n') ?? 1)
    return json(200, { failNext })
  }
  if (req.method === 'POST' && url.pathname === '/emails') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      if (failNext > 0) {
        failNext--
        return json(500, { message: 'simulated outage' })
      }
      const mail = JSON.parse(body)
      sent.push({ ...mail, idempotencyKey: req.headers['idempotency-key'] ?? null, at: Date.now() })
      json(200, { id: `mock_${sent.length}` })
    })
    return
  }
  json(404, { error: 'not found' })
}).listen(4010, '127.0.0.1', () => console.log('mock resend on 4010'))
