#!/usr/bin/env node
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
app.get('/', (req, res) => {
  let queryUrl = req.query.url
  if (Array.isArray(queryUrl)) queryUrl = queryUrl.join('&url=')
  if (!queryUrl) {
    res.setHeader('Location', 'https://bandwidth-hero.com')
    return res.status(302).end()
  }
  const image = url.parse(queryUrl)
  if (image.protocol !== 'https:' && image.protocol !== 'http:') return terminate()

  const protocol = image.protocol === 'https:' ? https : http
  const proxyReq = protocol.get(
    {
      protocol: image.protocol,
      hostname: image.hostname,
      port: image.port,
      path: image.path,
      headers: proxyHeaders()
    },
    proxied => {
      if (
        proxied.statusCode !== 200 ||
        (proxied.headers['content-type'] && !proxied.headers['content-type'].startsWith('image'))
      ) {
        if (!res.headersSent) res.setHeader('Location', queryUrl)
        res.status(302).end()
      } else {
        proxied
          .pipe(decodeTransformer(proxied.headers['content-encoding']))
          .pipe(imageTransformer(proxied))
          .pipe(res)
          .on('error', terminate)
      }
    }
  )

  proxyReq.on('error', terminate)
  proxyReq.setTimeout(DEFAULT_TIMEOUT, terminate)

  function terminate(error) {
    return res.status(400).end()
  }

  function proxyHeaders() {
    const headers = {
      'User-Agent': USER_AGENT
    }

    headers['X-Forwarded-For'] = req.headers['X-Forwarded-For']
      ? `${req.ip}, ${req.headers['X-Forwarded-For']}`
      : req.ip

    if (req.headers.cookie) headers['Cookie'] = req.headers.cookie

    return headers
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
    if (originSize < MIN_COMPRESS_LENGTH) return new PassThrough()

    const format = !!req.query.jpeg ? 'jpeg' : 'webp'
    const isGrayscale = req.query.bw != 0
    const quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

    const transformer = Sharp()
      .grayscale(isGrayscale)
      .toFormat(format, { quality })

    transformer.on('error', terminate)
    transformer.on('info', info => {
      if (!info || res.headersSent) return

      for (const header in origin.headers) {
        try {
          res.setHeader(header, origin.headers[header])
        } catch (e) {
          Raven.captureException(e)
        }
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
app.use(opbeat.middleware.express())
if (PORT > 0) app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app
