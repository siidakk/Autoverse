const express = require("express")

const { proxy } = require("../mlService")

const router = express.Router()

// The recommender. Everything about reaching the ML service -- how long to wait
// for an instance that has been asleep, and how to say so -- lives in
// mlService.js, because this route and the valuation had the same fifteen
// second timeout against a service that takes fifty to wake.
router.post("/", (req, res) =>
  proxy(res, {
    path: "/recommend",
    body: req.body,
    what: "The recommendation service"
  })
)

module.exports = router
