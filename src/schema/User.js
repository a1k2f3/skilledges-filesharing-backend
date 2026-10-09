const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true
    },

    username: {
      type: String,
      required: false,
      lowercase: true,
      trim: true
    },

    whatsappNumber: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator(value) {
          if (!value) return true;
          const digitsOnly = value.replace(/\D/g, "");
          return digitsOnly.length >= 8 && digitsOnly.length <= 15;
        },
        message: "WhatsApp number must contain 8 to 15 digits"
      }
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    role: {
      type: String,
      enum: ["user", "admin", "designer"],
      default: "user"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastSeen: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);