const mongoose = require("mongoose")

// A saved build. There are no accounts yet, so a build is reached by its share
// code rather than by owner, and the code is what the front end puts in a link.

const buildSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    carId: {
      type: Number,
      required: true
    },

    carName: {
      type: String,
      required: true
    },

    spec: {
      color: { type: String, default: "#d8dce1" },
      finish: { type: String, default: "glossy" },
      wheelType: { type: String, default: "sport" },
      wheelSize: { type: Number, default: 1 },
      stance: { type: Number, default: 0 },
      spoilerType: { type: String, default: "stock" },
      exhaustType: { type: String, default: "stock" },
      headlightType: { type: String, default: "stock" },
      underglow: { type: String, default: "off" },
      wrapMode: { type: String, default: "none" },
      wrapColour: { type: String, default: "#0c0d0f" },
      tintLevel: { type: String, default: "clear" }
    },

    total: {
      type: Number,
      default: 0
    },

    views: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Build", buildSchema)
