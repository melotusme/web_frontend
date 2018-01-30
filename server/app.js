const Koa = require('koa')
const _ = require('lodash')
const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const historyApiFallback = require('koa-history-api-fallback') // 引入依赖
const jsonwebtoken = require('jsonwebtoken')
const jwt = require('koa-jwt')
const bcrypt = require('bcryptjs')

const config = require('./config/server.json')
const db = require('./models')
const mdb = require('./mdb')

const path = require('path')
const koaStaic = require('koa-static')


const app = new Koa()


//use middlewares
const middlewares = require('./middlewares')
app.use(koaStaic(path.resolve('dist')))
app.use(bodyParser())
app.use(middlewares.logger)
app.use(middlewares.logIP(mdb))


// articles 
router.post('/articles/', async (ctx, next) => {
  article = await db.article.create(ctx.request.body)
  ctx.body = article
})
router.get('/articles/', async (ctx, next) => {
  articles = await db.article.findAll()
  ctx.body = articles
})
router.get('/articles/:id', async (ctx, next) => {
  article = await db.article.findById(ctx.params.id)
  ctx.body = article
})
router.put('/articles/:id', async (ctx, next) => {
  article = await db.article.update(ctx.request.body, { where: { id: ctx.params.id } })
  ctx.body = article
})
router.del('/articles/:id', async (ctx, next) => {
  article = await db.article.destroy({
    where: { id: ctx.params.id }
  })
  ctx.body = article
})

// auth
const authRouter = require('koa-router')()
const secret = "keep me secret"
authRouter.post('/login', async (ctx, next) => {
  params = ctx.request.body
  user = await db.user.findOne({ where: { username: params.username } })
  payload = { id: user.id, username: user.username }
  token = jsonwebtoken.sign(payload, secret)

  if (bcrypt.compareSync(params.password, user.password)) {
    ctx.cookies.set("Authorization", "Bearer " + token)
    ctx.body = {
      code: "success",
      token: token
    }
  } else {
    ctx.body = {
      code: "failed"
    }
  }
})

authRouter.post('/register', async (ctx, next) => {
  params = ctx.request.body
  salt = bcrypt.genSaltSync(10)
  params.password = bcrypt.hashSync(params.password, salt)

  user = await db.user.create(params)
  payload = { id: user.id, username: user.username }
  token = jsonwebtoken.sign(payload, secret)
  ctx.body = {
    code: "success",
    token,
  }
})


// app.use(jwt({ secret }).unless({ path: [/^\/public/, /fav\w*/, /login/, /^\/api\/auth/] }))

router.use('/api', router.routes())
app.use(router.routes())
authRouter.use('/api/auth', authRouter.routes())
app.use(authRouter.routes())
console.log(authRouter.stack.map(i => i.path))

app.use(historyApiFallback());
app.listen(config.port, () => {
  console.log(`I'm listening ${config.port}`)
})