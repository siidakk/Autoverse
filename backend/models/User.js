const mongoose = require("mongoose")

// An account. The password is never stored, only a bcrypt hash of it, and the
// hash is never selected unless a login explicitly asks for it.

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    name: {
      type: String,
      trim: true,
      default: ""
    },

    passwordHash: {
      type: String,
      required: true,
      // Left out of every query by default, so it cannot be returned by
      // accident from a route that forgot to exclude it.
      select: false
    },

    // Cars the user has said they want to come back to.
    wishlist: [
      {
        carId: Number,
        name: String,
        addedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
)

// What is safe to send to the browser.
userSchema.methods.publicProfile = function publicProfile() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    wishlist: this.wishlist ?? [],
    joined: this.createdAt
  }
}

module.exports = mongoose.model("User", userSchema)
