'use strict'
require('newrelic')
const express = require('express')
const Raven = require('raven')
const sharp = require('sharp')
const http = require('http')
const https = require('https')
const url = require('url')

const PORT = process.env.PORT
const DEFAULT_QUALITY = 40
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = express()
app.use(Raven.requestHandler())
app.get('/', (req, res) => {
  const imageUrl = url.parse(req.query.url)
  if (!imageUrl) {
    res.write('https://github.com/ayastreb/bandwidth-hero-proxy')
    return res.end()
  }
  const jpegOnly = !!req.query.jpeg
  const isGrayscale = req.query.bw != 0
  const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') {
    return res.status(400).end()
  }

  try {
    const protocol = imageUrl.protocol === 'https:' ? https : http
    protocol
      .get(
        {
          protocol: imageUrl.protocol,
          host: imageUrl.host,
          path: imageUrl.path,
          headers: {
            'User-Agent': USER_AGENT,
            Cookie: req.headers.cookie,
            'X-Forwarded-For': req.ip
          }
        },
        proxied => {
          const originSize = proxied.headers['content-length']
          if (proxied.statusCode !== 200) {
            res.writeHead(400)
            return res.end()
          }

          if (originSize < 1000) {
            res.writeHead(proxied.statusCode, proxied.headers)
            return proxied.pipe(res)
          }

          const transformer = sharp()
            .grayscale(isGrayscale)
            .toFormat(jpegOnly ? 'jpeg' : 'webp', { quality })
          transformer.on('error', () => res.status(400).end())
          transformer.on('info', info => {
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

          proxied.pipe(transformer).pipe(res)
        }
      )
      .on('error', err => res.status(400).end())
  } catch (e) {
    Raven.captureException(e)
  }
})

app.use(Raven.errorHandler())
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app
