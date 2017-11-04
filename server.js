'use strict'
const opbeat = require('opbeat').start({
  appId: process.env.OPBEAT_APP_ID,
  organizationId: process.env.OPBEAT_ORG_ID,
  secretToken: process.env.OPBEAT_TOKEN
})
const Express = require('express')
const Raven = require('raven')
const Sharp = require('sharp')
const PassThrough = require('stream').PassThrough
const url = require('url')
const http = require('http')
const https = require('https')
const zlib = require('zlib')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const DEFAULT_TIMEOUT = 5000
const MIN_COMPRESS_LENGTH = 512
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = Express()
app.use(Raven.requestHandler())
app.use(opbeat.middleware.express())
app.get('/', (req, res) => {
  let queryUrl = req.query.url
  if (Array.isArray(queryUrl)) queryUrl = queryUrl.join('&url=')
  if (!queryUrl) return res.end('https://github.com/ayastreb/bandwidth-hero-proxy')
  const imageUrl = url.parse(queryUrl)
  if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') return terminate()

  const protocol = imageUrl.protocol === 'https:' ? https : http
  const proxyReq = protocol.get(
    {
      protocol: imageUrl.protocol,
      host: imageUrl.host,
      path: imageUrl.path,
      headers: {
        Cookie: req.headers.cookie || '',
        'User-Agent': USER_AGENT,
        'X-Forwarded-For': req.ip
      }
    },
    proxied => {
      proxied
        .pipe(decodeTransformer(proxied.headers['content-encoding']))
        .pipe(imageTransformer(proxied))
        .pipe(res)
        .on('error', terminate)
    }
  )

  proxyReq.on('error', terminate)
  proxyReq.setTimeout(DEFAULT_TIMEOUT, terminate)

  function terminate() {
    return res.status(400).end()
  }

  function decodeTransformer(encoding) {
    switch (encoding) {
      case 'gzip':
        return zlib.createGunzip()
      case 'deflate':
        return zlib.createDeflate()
      default:
        return new PassThrough()
    }
  }

  function imageTransformer(origin) {
    const originSize = origin.headers['content-length']
    if (origin.statusCode !== 200 || originSize < MIN_COMPRESS_LENGTH) return new PassThrough()

    const format = !!req.query.jpeg ? 'jpeg' : 'webp'
    const isGrayscale = req.query.bw != 0
    const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

    const transformer = Sharp()
      .grayscale(isGrayscale)
      .toFormat(format, { quality })

    transformer.on('error', terminate)
    transformer.on('info', info => {
      if (!info) return
      if (res.headersSent) return

      for (const header in origin.headers) {
        res.setHeader(header, origin.headers[header])
      }
      res.setHeader('Content-Type', `image/${format}`)
      res.setHeader('Content-Length', info.size)
      res.setHeader('Content-Encoding', 'identity')

      if (originSize > 0) {
        res.setHeader('X-Original-Size', originSize)
        res.setHeader('X-Bytes-Saved', originSize - info.size)
      }
    })

    return transformer
  }
})

app.use(Raven.errorHandler())
if (PORT > 0) app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app
