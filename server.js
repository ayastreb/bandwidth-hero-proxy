#!/usr/bin/env node
'use strict'
const opbeat = require('opbeat')
if (process.env.OPBEAT_APP_ID) {
  opbeat.start({
    appId: process.env.OPBEAT_APP_ID,
    organizationId: process.env.OPBEAT_ORG_ID,
    secretToken: process.env.OPBEAT_TOKEN
  })
}

const auth = require('basic-auth')
const Express = require('express')
const Raven = require('raven')
const Request = require('request')
const Sharp = require('sharp')
const http = require('http')

const PORT = process.env.PORT
const LOGIN = process.env.LOGIN
const PASSWORD = process.env.PASSWORD
const DEFAULT_QUALITY = 40
const DEFAULT_TIMEOUT = 10000
const MIN_COMPRESS_LENGTH = 512
const USER_AGENT = 'Bandwidth-Hero Compressor'

Raven.config(process.env.SENTRY_DSN).install()

const app = Express()
const pool = new http.Agent()
pool.maxSockets = 100
pool.maxRedirects = 5

app.use(Raven.requestHandler())
app.get('/', (req, res) => {
  if (LOGIN && PASSWORD) {
    const credentials = auth(req)
    if (!credentials || credentials.name !== LOGIN || credentials.pass !== PASSWORD) {
      res.setHeader('WWW-Authenticate', `Basic realm="${USER_AGENT}"`)

      return res.status(401).end('Access denied')
    }
  }

  let imageUrl = req.query.url
  if (Array.isArray(imageUrl)) imageUrl = imageUrl.join('&url=')
  if (!imageUrl) {
    res.setHeader('Location', 'https://bandwidth-hero.com')
    return res.status(302).end()
  }
  const headers = {
    'User-Agent': USER_AGENT
  }
  headers['X-Forwarded-For'] = req.headers['X-Forwarded-For']
    ? `${req.ip}, ${req.headers['X-Forwarded-For']}`
    : req.ip
  if (req.headers.cookie) headers['Cookie'] = req.headers.cookie
  if (req.headers.dnt) headers['DNT'] = req.headers.dnt

  Request.get(
    imageUrl,
    {
      pool,
      headers,
      timeout: DEFAULT_TIMEOUT,
      encoding: null,
      jar: true,
      maxRedirects: 5
    },
    (err, proxied, image) => {
      if ((err || proxied.statusCode !== 200) && !res.headersSent) {
        res.setHeader('Location', encodeURI(imageUrl))
        return res.status(302).end()
      }

      if (
        proxied.headers['content-length'] > MIN_COMPRESS_LENGTH &&
        proxied.headers['content-type'] &&
        proxied.headers['content-type'].startsWith('image')
      ) {
        const format = !!req.query.jpeg ? 'jpeg' : 'webp'

        Sharp(image)
          .grayscale(req.query.bw != 0)
          .toFormat(format, {
            quality: parseInt(req.query.l, 10) || DEFAULT_QUALITY
          })
          .toBuffer((err, compressedImage, info) => {
            if (err || !info || res.headersSent) return res.status(400).end()
            copyHeaders(proxied, res)
            res.setHeader('Content-Type', `image/${format}`)
            res.setHeader('Content-Length', info.size)
            res.setHeader('X-Original-Size', proxied.headers['content-length'])
            res.setHeader('X-Bytes-Saved', proxied.headers['content-length'] - info.size)

            res.write(compressedImage)
            res.status(200).end()
          })
      } else {
        copyHeaders(proxied, res)
        res.write(image)
        res.status(200).end()
      }
    }
  )
})

function copyHeaders(from, to) {
  for (const header in from.headers) {
    try {
      to.setHeader(header, from.headers[header])
    } catch (e) {
      console.log(e)
    }
  }
}

app.use(Raven.errorHandler())
if (process.env.OPBEAT_APP_ID) app.use(opbeat.middleware.express())
if (PORT > 0) app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports = app
