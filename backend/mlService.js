// Talking to the Flask service that holds the recommender and the valuation.
//
// This exists because of one measurement. The ML service runs on a free
// instance, which is stopped after fifteen minutes of no traffic, and starting
// it again takes:
//
//     ML service answered in 51.45s
//
// The routes here used to give up after fifteen and twenty seconds. So the
// first request after any quiet period always failed, always with
// "Recommendation service is unavailable", and always misleadingly -- the
// service was fine, it was still putting its shoes on. Anyone who tried again
// a minute later got an instant answer, which made it look intermittent rather
// than systematic.
//
// The browser is willing to wait ninety seconds. Waiting seventy-five here
// leaves the browser room to answer for itself rather than having its own
// timeout fire first.

const axios = require("axios")

const WAKE_MS = 75000

const baseUrl = (
  process.env.ML_API_URL ||
  (process.env.ML_API_HOSTPORT && `http://${process.env.ML_API_HOSTPORT}`) ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "")

// Whether the failure was the service being asleep rather than being broken.
// Worth separating, because one of them fixes itself and the other does not.
function isWaking(error) {
  return (
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ECONNRESET" ||
    // Render answers with these while an instance is coming back up.
    [502, 503, 504].includes(error.response?.status)
  )
}

async function call(method, path, body) {
  const url = `${baseUrl}${path}`

  const options = { timeout: WAKE_MS }

  return method === "get"
    ? axios.get(url, options)
    : axios.post(url, body, options)
}

/**
 * Calls the ML service and answers the caller's response for them.
 *
 * `what` names the thing in words a person would use, so the message says
 * "The valuation service" rather than the route it came from.
 */
async function proxy(res, { method = "post", path, body, what }) {
  try {
    const response = await call(method, path, body)
    res.json(response.data)
  } catch (error) {
    const waking = isWaking(error)

    console.error(
      `ML request to ${path} failed${waking ? " (service waking)" : ""}: ${error.message}`
    )

    res.status(waking ? 503 : 502).json({
      // Said plainly, because "unavailable" sent people away from a service
      // that was about to work.
      message: waking
        ? `${what} is starting up after being idle, which takes about a minute on the free tier. Try again shortly.`
        : `${what} could not be reached.`,
      waking
    })
  }
}

module.exports = { baseUrl, proxy, WAKE_MS }
