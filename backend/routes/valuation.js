const express = require("express")

const axios = require("axios")

const router = express.Router()

const mlApiUrl = (
  process.env.ML_API_URL ||
  (process.env.ML_API_HOSTPORT && `http://${process.env.ML_API_HOSTPORT}`) ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "")

// What the form needs to offer: every model the valuation knows, and how
// accurate it has been on cars it was not trained on.
router.get("/options", async (req, res) => {

  try {

    const response = await axios.get(
      `${mlApiUrl}/valuation/options`,
      { timeout: 20000 }
    )

    res.json(response.data)

  }

  catch (error) {

    console.error("Valuation options failed", error.message)

    res.status(502).json({
      error: "The valuation service is not responding."
    })

  }

})

// A single car, valued.
router.post("/", async (req, res) => {

  try {

    const response = await axios.post(
      `${mlApiUrl}/valuation`,
      req.body,
      { timeout: 20000 }
    )

    res.json(response.data)

  }

  catch (error) {

    const status = error.response?.status

    if (status === 400) {
      return res.status(400).json(error.response.data)
    }

    console.error("Valuation failed", error.message)

    res.status(502).json({
      error: "The valuation service is not responding."
    })

  }

})

module.exports = router
