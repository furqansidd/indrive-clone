const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    vehicle: {
      make: String,
      model: String,
      plateNumber: String,
      color: String,
      type: { type: String, enum: ['bike', 'rickshaw', 'car'], default: 'car' },
    },

    documents: {
      license: { url: String, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' } },
      registration: { url: String, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' } },
      insurance: { url: String, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' } },
    },

    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },

    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    ratingAvg: { type: Number, default: 5 },
    ratingCount: { type: Number, default: 0 },
    totalRides: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);
