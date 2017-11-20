const logger = require('logzio-nodejs').createLogger({
  token: process.env.LOGZIO_TOKEN,
  host: 'listener.logz.io'
})

module.exports = (type, req) => {
  logger.log({
    message: req.params.url,
    type,
    webp: req.params.webp,
    ip: req.ip,
    origin_type: req.params.originType,
    origin_size: req.params.originSize,
    agent: req.headers['user-agent'],
    ...req.log
  })
}
