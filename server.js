'use strict'
require('newrelic')
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
const DEFAULT_TIMEOUT = 3000
const MIN_COMPRESS_LENGTH = 512
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = Express()
app.use(Raven.requestHandler())
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
        .pipe(decodeTransformer(req, proxied.headers['content-encoding']))
        .pipe(imageTransformer(req, res, proxied))
        .pipe(res)
        .on('error', terminate)
    }
  )

  proxyReq.on('error', terminate)
  proxyReq.setTimeout(DEFAULT_TIMEOUT, terminate)

  function terminate() {
    return res.status(400).end()
  }
})

function decodeTransformer(req, encoding) {
  switch (encoding) {
    case 'gzip':
      return zlib.createGunzip()
    case 'deflate':
      return zlib.createDeflate()
    default:
      return new PassThrough()
  }
}

function imageTransformer(req, res, origin) {
  const originSize = origin.headers['content-length']
  if (origin.statusCode !== 200 || originSize < MIN_COMPRESS_LENGTH) return new PassThrough()

  const format = !!req.query.jpeg ? 'jpeg' : 'webp'
  const isGrayscale = req.query.bw != 0
  const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  const transformer = Sharp()
    .grayscale(isGrayscale)
    .toFormat(format, { quality })

  transformer.on('error', () => res.status(400).end())
  transformer.on('info', info => {
    if (!info) return

    let headers = Object.assign({}, origin.headers, {
      'Content-Type': `image/${format}`,
      'Content-Length': info.size,
      'Content-Encoding': 'identity'
    })

    if (originSize > 0) {
      headers['X-Original-Size'] = originSize
      headers['X-Bytes-Saved'] = originSize - info.size
    }
    res.writeHead(200, headers)
  })

  return transformer
}

app.use(Raven.errorHandler())
if (PORT > 0) app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app
