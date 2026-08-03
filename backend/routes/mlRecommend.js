const express = require("express")

const axios = require("axios")

const router = express.Router()
const mlApiUrl = (
  process.env.ML_API_URL ||
  (process.env.ML_API_HOSTPORT && `http://${process.env.ML_API_HOSTPORT}`) ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "")

router.post("/", async (req, res) => {

  try {

    const response = await axios.post(

      `${mlApiUrl}/recommend`,

      req.body,

      { timeout: 15000 }

    )

    res.json(response.data)

  }

  catch (error) {

    console.error("ML API request failed", error.message)

    res.status(502).json({

      message: "Recommendation service is unavailable"

    })

  }

})

module.exports = router
