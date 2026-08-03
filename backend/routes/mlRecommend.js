const express = require("express")

const axios = require("axios")

const router = express.Router()

router.post("/", async (req, res) => {

  try {

    const response = await axios.post(

      "http://127.0.0.1:8000/recommend",

      req.body

    )

    res.json(response.data)

  }

  catch (error) {

    console.log(error)

    res.status(500).json({

      message: "ML API Error"

    })

  }

})

module.exports = router