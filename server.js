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
const DEFAULT_TIMEOUT = 5000
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
  if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') return res.status(400).end()

  const protocol = imageUrl.protocol === 'https:' ? https : http
  protocol
    .get(
      {
        protocol: imageUrl.protocol,
        host: imageUrl.host,
        path: imageUrl.path,
        headers: {
          Cookie: req.headers.cookie || '',
          'User-Agent': USER_AGENT,
          'X-Forwarded-For': req.ip
        },
        timeout: DEFAULT_TIMEOUT
      },
      proxied => {
        proxied
          .pipe(decodeTransformer(req, proxied.headers['content-encoding']))
          .pipe(imageTransformer(req, res, proxied))
          .pipe(res)
          .on('error', err => res.status(400).end())
      }
    )
    .on('error', err => res.status(400).end())
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

function imageTransformer(req, res, proxied) {
  const originSize = proxied.headers['content-length']
  if (proxied.statusCode !== 200 || originSize < MIN_COMPRESS_LENGTH) return new PassThrough()

  const jpegOnly = !!req.query.jpeg
  const isGrayscale = req.query.bw != 0
  const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  const transformer = Sharp()
    .grayscale(isGrayscale)
    .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality })

  transformer.on('error', () => res.status(400).end())
  transformer.on('info', info => {
    if (!info) return

    let headers = Object.assign({}, proxied.headers, {
      'Content-Type': jpegOnly ? 'image/jpeg' : 'image/webp',
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
