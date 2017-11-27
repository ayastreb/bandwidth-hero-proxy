const request = require('request')
const omit = require('lodash').omit
const shouldCompress = require('./shouldCompress')
const redirect = require('./redirect')
const compress = require('./compress')
const bypass = require('./bypass')
const copyHeaders = require('./copyHeaders')

function proxy(req, res) {
  const start = process.hrtime()
  const headers = {
    ...omit(req.headers, [
      'host',
      'TE',
      'transfer-encoding',
      'connection',
      'keep-alive',
      'cf-ray',
      'cf-visitor',
      'cf-ipcountry',
      'cf-connecting-ip'
    ]),
    'user-agent': 'Bandwidth-Hero Compressor',
    'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
    'x-forwarded-proto': req.params.proto,
    'x-forwarded-host': req.params.host,
    'x-forwarded-port': req.params.port,
    via: '1.1 bandwidth-hero'
  }
  request.get(
    req.params.url,
    {
      headers,
      timeout: 10000,
      maxRedirects: 5,
      encoding: null,
      gzip: true,
      jar: true
    },
    (err, origin, buffer) => {
      const end = process.hrtime(start)
      const statusCode = (origin && origin.statusCode) || undefined
      req.log = {
        http_status: statusCode,
        http_error: (err && err.message) || undefined,
        http_time: (end[0] * 1e9 + end[1]) / 1e6,
        req_headers: headers,
        res_headers: (origin && origin.headers) || undefined
      }
      if (err || statusCode >= 400) return redirect(req, res)

      copyHeaders(origin, res)
      res.setHeader('content-encoding', 'identity')
      req.params.originType = origin.headers['content-type'] || ''
      req.params.originSize = buffer.length

      if (shouldCompress(req)) {
        compress(req, res, buffer)
      } else {
        bypass(req, res, buffer)
      }
    }
  )
}

module.exports = proxy
