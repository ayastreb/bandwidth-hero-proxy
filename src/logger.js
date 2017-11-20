const logger = require('logzio-nodejs').createLogger({
  token: process.env.LOGZIO_TOKEN,
  host: 'listener.logz.io',
  type: 'request'
})

module.exports = (action, req) => {
  logger.log({
    message: req.params.url,
    action,
    webp: req.params.webp,
    ip: req.ip,
    agent: req.headers['user-agent'],
    ...req.log
  })
}
