const logger = require('logzio-nodejs').createLogger({
  token: process.env.LOGZIO_TOKEN,
  host: 'listener.logz.io',
  type: 'request'
})

const DEFAULT_QUALITY = 40

function params(req, res, next) {
  let url = req.query.url
  if (Array.isArray(url)) url = url.join('&url=')
  if (!url) {
    res.setHeader('Location', 'https://bandwidth-hero.com')
    return res.status(302).end()
  }

  req.params.url = url
  req.params.webp = !req.query.jpeg
  req.params.grayscale = req.query.bw != 0
  req.params.quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  logger.log({
    message: req.params.url,
    webp: req.params.webp,
    ip: req.ip,
    agent: req.headers['user-agent']
  })

  next()
}

module.exports = params
