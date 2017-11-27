const { URL } = require('url')
const DEFAULT_QUALITY = 40

function params(req, res, next) {
  let imageUrl = req.query.url
  if (Array.isArray(imageUrl)) imageUrl = imageUrl.join('&url=')
  if (!imageUrl) {
    res.setHeader('Location', 'https://bandwidth-hero.com')
    return res.status(302).end()
  }
  imageUrl = imageUrl.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://')
  const parsed = new URL(imageUrl)
  req.params.url = imageUrl
  req.params.proto = parsed.protocol.replace(':', '')
  req.params.port = parsed.port
  req.params.host = parsed.host
  req.params.webp = !req.query.jpeg
  req.params.grayscale = req.query.bw != 0
  req.params.quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY

  next()
}

module.exports = params
