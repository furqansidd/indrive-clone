const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

// GET /api/admin/drivers?status=pending
exports.listDrivers = async (req, res) => {
  const { status } = req.query;
  const query = status ? { verificationStatus: status } : {};
  const drivers = await Driver.find(query).populate('user', 'name email phone');
  res.json(drivers);
};

// PATCH /api/admin/drivers/:id/verify  { decision: 'approved'|'rejected' }
exports.verifyDriver = async (req, res) => {
  const { decision } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be approved or rejected' });
  }
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    {
      verificationStatus: decision,
      'documents.license.status': decision,
      'documents.registration.status': decision,
      'documents.insurance.status': decision,
    },
    { new: true }
  ).populate('user', 'name email phone');
  res.json(driver);
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

// PATCH /api/admin/users/:id/suspend  { isActive }
exports.setUserActive = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive },
    { new: true }
  ).select('-password');
  res.json(user);
};

// GET /api/admin/rides?driverId=&riderId=
exports.listRides = async (req, res) => {
  const { driverId, riderId } = req.query;
  const query = {};

  if (riderId) {
    query.rider = riderId;
  }
  if (driverId) {
    // driverId here is the Driver._id (not User._id)
    query.driver = driverId;
  }

  const rides = await Ride.find(query)
    .populate('rider', 'name')
    .populate({ path: 'driver', populate: { path: 'user', select: 'name' } })
    .sort('-createdAt')
    .limit(200);
  res.json(rides);
};

// GET /api/admin/stats
exports.stats = async (req, res) => {
  const [totalUsers, totalDrivers, pendingDrivers, totalRides, completedRides, activeRides] = await Promise.all([
    User.countDocuments({ role: 'rider' }),
    Driver.countDocuments(),
    Driver.countDocuments({ verificationStatus: 'pending' }),
    Ride.countDocuments(),
    Ride.countDocuments({ status: 'completed' }),
    Ride.countDocuments({ status: { $in: ['requested', 'negotiating', 'accepted', 'arriving', 'arrived', 'in_progress'] } }),
  ]);

  const revenueAgg = await Ride.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$agreedFare' },
        totalCommissionRevenue: { $sum: '$commission' },
      },
    },
  ]);

  res.json({
    totalUsers,
    totalDrivers,
    pendingDrivers,
    totalRides,
    completedRides,
    activeRides,
    // Gross booking value (all fares combined)
    totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    // Actual platform revenue (10% commission collected)
    totalCommissionRevenue: revenueAgg[0]?.totalCommissionRevenue || 0,
  });
};
