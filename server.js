'use strict'
require('newrelic')
const Express = require('express')
const Raven = require('raven')
const Sharp = require('sharp')
const http = require('http')
const https = require('https')
const url = require('url')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = Express()
app.use(Raven.requestHandler())
app.get('/', (req, res) => {
  let queryUrl = req.query.url
  if (Array.isArray(queryUrl)) queryUrl = queryUrl.join('&url=')
  if (!queryUrl) {
    res.write('https://github.com/ayastreb/bandwidth-hero-proxy')
    return res.end()
  }
  const imageUrl = url.parse(queryUrl)

  const jpegOnly = !!req.query.jpeg
  const isGrayscale = req.query.bw != 0
  const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') {
    return res.status(400).end()
  }

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
        }
      },
      proxied => {
        const originSize = proxied.headers['content-length']
        if (proxied.statusCode !== 200) {
          res.writeHead(proxied.statusCode)
          return res.end()
        }
        if (originSize < 1024) {
          return proxied.pipe(res).on('error', () => res.status(400).end())
        }

        const transformer = Sharp()
          .grayscale(isGrayscale)
          .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality })
        transformer.on('error', () => res.status(400).end())
        transformer.on('info', info => {
          if (!info) return

          let responseHeaders = Object.assign({}, proxied.headers, {
            'Content-Type': jpegOnly ? 'image/jpeg' : 'image/webp',
            'Content-Length': info.size
          })

          if (proxied.headers['content-length'] > 0) {
            responseHeaders['X-Original-Size'] = originSize
            responseHeaders['X-Bytes-Saved'] = originSize - info.size
          }
          res.writeHead(200, responseHeaders)
        })

        proxied
          .pipe(transformer)
          .pipe(res)
          .on('error', () => res.status(400).end())
      }
    )
    .on('error', err => res.status(400).end())
})

app.use(Raven.errorHandler())
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app
