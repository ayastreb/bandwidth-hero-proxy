const LOGIN = process.env.LOGIN
const PASSWORD = process.env.PASSWORD

function authenticate(req, res, next) {
  if (LOGIN && PASSWORD) {
    const credentials = auth(req)
    if (!credentials || credentials.name !== LOGIN || credentials.pass !== PASSWORD) {
      res.setHeader('WWW-Authenticate', `Basic realm="${USER_AGENT}"`)

      return res.status(401).end('Access denied')
    }
  }

  next()
}

module.exports = authenticate
