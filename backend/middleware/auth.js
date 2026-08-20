const jwt = require("jsonwebtoken")

// In development a missing secret would stop the whole app booting, which is a
// worse failure than an insecure token on a laptop. In production it is the
// other way round, so it refuses to run rather than sign anything with a
// guessable key.
function secret() {
  const configured = process.env.JWT_SECRET

  if (configured) return configured

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production")
  }

  return "autoverse-development-only-secret"
}

function sign(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    secret(),
    { expiresIn: "30d" }
  )
}

function readToken(req) {
  const header = req.headers.authorization ?? ""
  return header.startsWith("Bearer ") ? header.slice(7) : null
}

// Attaches the user when a valid token is present and says nothing when it is
// not. Used where signing in changes what you get back but is not required.
function optionalAuth(req, res, next) {
  const token = readToken(req)

  if (token) {
    try {
      req.user = jwt.verify(token, secret())
    } catch {
      // An expired or forged token is treated as no token at all.
    }
  }

  next()
}

// Refuses the request without a valid token.
function requireAuth(req, res, next) {
  const token = readToken(req)

  if (!token) {
    return res.status(401).json({ error: "Sign in to do that." })
  }

  try {
    req.user = jwt.verify(token, secret())
    next()
  } catch {
    res.status(401).json({ error: "That session has expired. Sign in again." })
  }
}

module.exports = { sign, requireAuth, optionalAuth }
