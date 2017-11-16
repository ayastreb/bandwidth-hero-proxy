#!/usr/bin/env node
'use strict'
const opbeat = require('opbeat')
if (process.env.OPBEAT_APP_ID) {
  opbeat.start({
    appId: process.env.OPBEAT_APP_ID,
    organizationId: process.env.OPBEAT_ORG_ID,
    secretToken: process.env.OPBEAT_TOKEN
  })
}
const app = require('express')()
const authenticate = require('./src/authenticate')
const params = require('./src/params')
const proxy = require('./src/proxy')

const PORT = process.env.PORT || 8080

app.enable('trust proxy')
app.get('/', authenticate, params, proxy)
app.use(opbeat.middleware.express())
app.listen(PORT, () => console.log(`Listening on ${PORT}`))
