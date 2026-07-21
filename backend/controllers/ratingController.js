const Rating = require('../models/Rating');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');

// POST /api/ratings  { rideId, stars, comment }
exports.rateRide = async (req, res) => {
  try {
    const { rideId, stars, comment } = req.body;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'completed') return res.status(400).json({ message: 'Ride not completed yet' });

    const isRider = String(ride.rider) === req.user.id;
    const fromRole = isRider ? 'rider' : 'driver';
    const toId = isRider ? ride.driver : ride.rider;

    const rating = await Rating.create({ ride: rideId, from: req.user.id, fromRole, to: toId, stars, comment });

    if (isRider) {
      const driver = await Driver.findById(ride.driver);
      const newCount = driver.ratingCount + 1;
      const newAvg = (driver.ratingAvg * driver.ratingCount + stars) / newCount;
      driver.ratingAvg = newAvg;
      driver.ratingCount = newCount;
      await driver.save();
    } else {
      const rider = await User.findById(ride.rider);
      const newCount = rider.ratingCount + 1;
      const newAvg = (rider.ratingAvg * rider.ratingCount + stars) / newCount;
      rider.ratingAvg = newAvg;
      rider.ratingCount = newCount;
      await rider.save();
    }

    res.status(201).json(rating);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
