const logger = process.env.LOGZIO_TOKEN
  ? require('logzio-nodejs').createLogger({
      token: process.env.LOGZIO_TOKEN,
      host: 'listener.logz.io'
    })
  : console

module.exports = (action, req) => {
  logger.log({
    message: req.params.url,
    action,
    webp: req.params.webp,
    ip: req.ip,
    origin_type: req.params.originType,
    origin_size: req.params.originSize,
    ...req.log
  })
}
