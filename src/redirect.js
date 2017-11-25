const logger = require('./logger')

function redirect(req, res) {
  if (res.headersSent) return

  logger('redirect', req)
  res.setHeader('content-length', 0)
  res.removeHeader('cache-control')
  res.removeHeader('expires')
  res.removeHeader('date')
  res.removeHeader('etag')
  res.setHeader('location', encodeURI(req.params.url))
  res.status(302).end()
}

module.exports = redirect
