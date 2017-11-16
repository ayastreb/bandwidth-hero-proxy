function redirect(req, res) {
  if (res.headersSent) return

  res.setHeader('location', encodeURI(`${req.params.url}#bh-no-compress=1`))
  res.status(302).end()
}

module.exports = redirect
