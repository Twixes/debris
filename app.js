const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const sassMiddleware = require('node-sass-middleware')
const backend = require('./backend')

const indexRouter = require('./routes/index')
const filesRouter = require('./routes/files')
const loginRouter = require('./routes/login')
const logoutRouter = require('./routes/logout')

const apiV1Users = require('./routes/api/v1/users')
const apiV1Files = require('./routes/api/v1/files')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false,
  sourceMap: process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase().startsWith('dev')
}))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/files', filesRouter)
app.use('/login', loginRouter)
app.use('/logout', logoutRouter)

app.use('/api/v1/users', apiV1Users)
app.use('/api/v1/files', apiV1Files)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use(async (err, req, res, next) => {
  console.error(err)
  const user = await backend.authorize(req)
  res.status(err.status || 500)
  res.render('error', { user: user, errorCode: err.status || 500, errorMessage: err.message || '' })
})

module.exports = app
