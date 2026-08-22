const express = require("express")
const axios = require("axios")

const { baseUrl, proxy, WAKE_MS } = require("../mlService")

const router = express.Router()

// What the form needs to offer: every model the valuation knows, and how
// accurate it has been on cars it was not trained on.
router.get("/options", (req, res) =>
  proxy(res, {
    method: "get",
    path: "/valuation/options",
    what: "The valuation service"
  })
)

// A single car, valued.
//
// Not routed through the shared helper, because this one has an answer the
// helper does not know about: a 400 from the model is a real reply about the
// car you asked for, and passing it through unchanged is the whole point.
router.post("/", async (req, res) => {
  try {
    const response = await axios.post(`${baseUrl}/valuation`, req.body, {
      timeout: WAKE_MS
    })

    res.json(response.data)
  } catch (error) {
    if (error.response?.status === 400) {
      return res.status(400).json(error.response.data)
    }

    const waking =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET" ||
      [502, 503, 504].includes(error.response?.status)

    console.error(`Valuation failed${waking ? " (service waking)" : ""}: ${error.message}`)

    res.status(waking ? 503 : 502).json({
      error: waking
        ? "The valuation service is starting up after being idle, which takes about a minute on the free tier. Try again shortly."
        : "The valuation service could not be reached.",
      waking
    })
  }
})

module.exports = router
