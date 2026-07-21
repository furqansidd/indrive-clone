const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromRole: { type: String, enum: ['rider', 'driver'], required: true },
    to: { type: mongoose.Schema.Types.ObjectId, required: true }, // User._id or Driver._id
    stars: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rating', ratingSchema);
