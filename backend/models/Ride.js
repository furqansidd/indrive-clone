const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    amount: { type: Number, required: true },
    etaMinutes: Number,
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const rideSchema = new mongoose.Schema(
  {
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },

    pickup: {
      address: String,
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    dropoff: {
      address: String,
      coordinates: { type: [Number], required: true },
    },

    // Rider's initial suggested fare (the "bid")
    suggestedFare: { type: Number, required: true },

    // All driver counter-offers
    offers: [offerSchema],

    // Final agreed fare once a driver's offer is accepted
    agreedFare: Number,

    vehicleType: { type: String, enum: ['bike', 'rickshaw', 'car'], default: 'car' },

    status: {
      type: String,
      enum: [
        'requested',   // rider posted the ride, waiting for offers
        'negotiating', // offers coming in
        'accepted',    // rider accepted a driver's offer
        'arriving',    // driver en route to pickup
        'arrived',     // driver arrived at pickup
        'in_progress', // ride started
        'completed',
        'cancelled',
      ],
      default: 'requested',
    },

    cancelledBy: { type: String, enum: ['rider', 'driver', null], default: null },
    cancelReason: String,

    startedAt: Date,
    completedAt: Date,

    paymentMethod: { type: String, enum: ['cash', 'card', 'wallet'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    autoAcceptAt: { type: Number, default: null },

    // Platform commission (10% of agreedFare) — calculated at ride completion
    commission: { type: Number, default: 0 },
    // Net payout to driver after commission
    driverPayout: { type: Number, default: 0 },
  },
  { timestamps: true }
);

rideSchema.index({ 'pickup.coordinates': '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);
