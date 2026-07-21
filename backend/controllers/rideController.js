const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const stripe = require('../config/stripe');


const acceptOfferInternal = async (ride, offerId, io) => {
  const offer = ride.offers.id(offerId);
  if (!offer) throw new Error('Offer not found');

  offer.status = 'accepted';
  ride.offers.forEach((o) => {
    if (String(o._id) !== String(offer._id)) o.status = 'rejected';
  });

  ride.driver = offer.driver;
  ride.agreedFare = offer.amount;
  ride.status = 'accepted';
  await ride.save();

  await Driver.findByIdAndUpdate(offer.driver, { isAvailable: false });

  io.to(`ride:${ride._id}`).emit('ride:accepted', ride);
  io.to(`driver:${offer.driver}`).emit('ride:accepted', ride);
  io.to(`rider:${ride.rider}`).emit('ride:accepted', ride);
  io.emit('ride:removed', ride._id);

  return ride;
};

// POST /api/rides  (rider) { pickup, dropoff, suggestedFare, vehicleType, autoAcceptAt }
exports.requestRide = async (req, res) => {
  try {
    const { pickup, dropoff, suggestedFare, vehicleType, autoAcceptAt } = req.body;
    if (!pickup?.coordinates || !dropoff?.coordinates || !suggestedFare) {
      return res.status(400).json({ message: 'pickup, dropoff and suggestedFare are required' });
    }

    const ride = await Ride.create({
      rider: req.user.id,
      pickup,
      dropoff,
      suggestedFare,
      vehicleType: vehicleType || 'car',
      autoAcceptAt: autoAcceptAt || null,
      status: 'requested',
    });

    // Notify nearby drivers via socket
    req.io.emit('ride:new', ride);

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/nearby?lng=..&lat=..&maxDistance=5000  (driver)
exports.nearbyRides = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 5000 } = req.query;
    
    const driver = await Driver.findOne({ user: req.user.id });

    // Only return ride requests created in the last 30 minutes to filter out stale requests
    const timeLimit = new Date(Date.now() - 30 * 60 * 1000);
    const query = { 
      status: { $in: ['requested', 'negotiating'] },
      createdAt: { $gte: timeLimit }
    };

    if (driver && driver.vehicle && driver.vehicle.type) {
      query.vehicleType = driver.vehicle.type;
    }

    let queryLng = lng ? parseFloat(lng) : null;
    let queryLat = lat ? parseFloat(lat) : null;

    if (!queryLng && !queryLat && driver && driver.currentLocation?.coordinates) {
      queryLng = driver.currentLocation.coordinates[0];
      queryLat = driver.currentLocation.coordinates[1];
    }

    if (queryLng != null && queryLat != null) {
      query['pickup.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [queryLng, queryLat] },
          $maxDistance: parseInt(maxDistance),
        },
      };
    }

    const rides = await Ride.find(query).populate('rider', 'name ratingAvg').sort('-createdAt');
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/mine  (rider or driver - their own ride history)
exports.myRides = async (req, res) => {
  try {
    let rides;
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ user: req.user.id });
      rides = await Ride.find({ driver: driver?._id }).sort('-createdAt');
    } else {
      rides = await Ride.find({ rider: req.user.id }).sort('-createdAt');
    }
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/:id
exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('rider', 'name phone ratingAvg')
      .populate({ path: 'driver', populate: { path: 'user', select: 'name phone' } });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rides/:id/offer  (driver) { amount, etaMinutes }
exports.makeOffer = async (req, res) => {
  try {
    const { amount, etaMinutes } = req.body;
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver) return res.status(403).json({ message: 'Driver profile not found' });
    if (driver.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Driver not yet verified by admin' });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (!['requested', 'negotiating'].includes(ride.status)) {
      return res.status(400).json({ message: 'Ride is no longer accepting offers' });
    }

    ride.offers.push({ driver: driver._id, amount, etaMinutes });
    ride.status = 'negotiating';

    // If autoAcceptAt threshold matches or beats the offer amount, auto-accept immediately
    if (ride.autoAcceptAt !== null && amount <= ride.autoAcceptAt) {
      const addedOffer = ride.offers[ride.offers.length - 1];
      await ride.save();
      const updatedRide = await acceptOfferInternal(ride, addedOffer._id, req.io);
      return res.status(201).json(updatedRide);
    }

    await ride.save();

    req.io.to(`ride:${ride._id}`).emit('ride:offer', { rideId: ride._id, offers: ride.offers });
    req.io.to(`rider:${ride.rider}`).emit('ride:offer', { rideId: ride._id, offers: ride.offers });

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rides/:id/offer/:offerId/accept  (rider)
exports.acceptOffer = async (req, res) => {
  try {
    let ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (String(ride.rider) !== req.user.id) return res.status(403).json({ message: 'Not your ride' });

    const offer = ride.offers.id(req.params.offerId);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    ride = await acceptOfferInternal(ride, req.params.offerId, req.io);

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/rides/:id/status  (driver) { status: arriving|in_progress|completed }
// Commission constants — keep in one place so they're easy to tune
const PLATFORM_COMMISSION_RATE = 0.10; // 10% platform cut

exports.updateStatus = async (req, res) => {
  try {
    const { status, paymentMethod, paymentStatus } = req.body;

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // Check authorization:
    // User must be either the rider or the driver of the ride.
    const isRider = String(ride.rider) === req.user.id;
    let isDriver = false;
    if (ride.driver) {
      const driverObj = await Driver.findById(ride.driver);
      if (driverObj && String(driverObj.user) === req.user.id) {
        isDriver = true;
      }
    }

    if (!isRider && !isDriver) {
      return res.status(403).json({ message: 'Not authorized for this ride' });
    }

    // Only driver can change ride progress status
    if (status && status !== ride.status) {
      if (!isDriver) {
        return res.status(403).json({ message: 'Only drivers can update the ride progress status' });
      }
      const allowed = ['arriving', 'arrived', 'in_progress', 'completed'];
      if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      
      ride.status = status;
      if (status === 'in_progress') ride.startedAt = new Date();
      if (status === 'completed') ride.completedAt = new Date();
    }

    const fare = ride.agreedFare || 0;
    const commission = parseFloat((fare * PLATFORM_COMMISSION_RATE).toFixed(2));
    const driverPayout = parseFloat((fare - commission).toFixed(2));

    const wasCompleted = ride.status === 'completed';
    const originalPaymentMethod = ride.paymentMethod;
    const originalPaymentStatus = ride.paymentStatus;

    if (paymentMethod) {
      const allowedMethods = ['cash', 'card', 'wallet'];
      if (!allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      ride.paymentMethod = paymentMethod;
    }

    if (paymentStatus) {
      const allowedStatuses = ['pending', 'paid'];
      if (!allowedStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      ride.paymentStatus = paymentStatus;
    }

    if (ride.status === 'completed') {
      ride.commission = commission;
      ride.driverPayout = driverPayout;

      if (!wasCompleted) {
        // Just transitioned to completed!
        const isOnlinePayment = ['card', 'wallet'].includes(ride.paymentMethod);
        if (isOnlinePayment) {
          ride.paymentStatus = 'paid';
          await Driver.findByIdAndUpdate(ride.driver, {
            $inc: { totalRides: 1, earnings: driverPayout },
            isAvailable: true,
          });
        } else {
          // Cash defaults to pending (until paid is sent)
          if (paymentStatus === 'paid') {
            ride.paymentStatus = 'paid';
          }
          await Driver.findByIdAndUpdate(ride.driver, {
            $inc: { totalRides: 1, earnings: fare },
            isAvailable: true,
          });
        }
      } else {
        // It was already completed. Did payment details change?
        if (originalPaymentMethod === 'cash' && ['card', 'wallet'].includes(ride.paymentMethod) && originalPaymentStatus !== 'paid' && ride.paymentStatus === 'paid') {
          // Changed from Cash (unpaid or pending) to Card (paid).
          // We previously added 'fare' to earnings. We should adjust it to 'driverPayout'.
          // The adjustment difference is driverPayout - fare (which is -commission).
          const adjustment = driverPayout - fare;
          await Driver.findByIdAndUpdate(ride.driver, {
            $inc: { earnings: adjustment },
          });
        } else if (ride.paymentMethod === 'cash' && originalPaymentStatus === 'pending' && ride.paymentStatus === 'paid') {
          // Cash marked as paid. Earnings already has full fare. No change to earnings, just save payment status.
        }
      }
    }

    await ride.save();

    req.io.to(`ride:${ride._id}`).emit('ride:status', { 
      rideId: ride._id, 
      status: ride.status,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus
    });
    
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rides/:id/cancel  { reason }
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.status = 'cancelled';
    ride.cancelledBy = req.user.role === 'driver' ? 'driver' : 'rider';
    ride.cancelReason = req.body.reason || '';
    await ride.save();

    if (ride.driver) await Driver.findByIdAndUpdate(ride.driver, { isAvailable: true });

    req.io.to(`ride:${ride._id}`).emit('ride:cancelled', ride);
    req.io.emit('ride:removed', ride._id);
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/:id/messages
exports.getMessages = async (req, res) => {
  try {
    const Message = require('../models/Message');
    const messages = await Message.find({ ride: req.params.id }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/my  — rider's own ride history
exports.myRides = async (req, res) => {
  try {
    const rides = await Ride.find({ rider: req.user.id })
      .populate({ path: 'driver', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt')
      .limit(50);
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rides/my-driver  — driver's own ride history
exports.myDriverRides = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });
    const rides = await Ride.find({ driver: driver._id })
      .populate('rider', 'name')
      .sort('-createdAt')
      .limit(50);
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rides/:id/pay/stripe
exports.payWithStripe = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Auth: only the rider of this ride can pay
    if (String(ride.rider) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to pay for this ride' });
    }

    const fare = ride.agreedFare || 0;
    if (fare <= 0) {
      return res.status(400).json({ message: 'Agreed fare is invalid' });
    }

    // Stripe expects amounts in smallest currency units (paisa/cents).
    // Multiply by 100 and round to integer.
    const amountInCents = Math.round(fare * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'pkr',
      metadata: { rideId: String(ride._id) },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

