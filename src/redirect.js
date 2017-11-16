function redirect(req, res) {
  if (res.headersSent) return

  res.setHeader('location', encodeURI(`${imageUrl}#bh-no-compress=1`))
  res.status(302).end()
}

module.exports = redirect
