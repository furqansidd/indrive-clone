const Driver = require('../models/Driver');

// GET /api/drivers/me
exports.getMyProfile = async (req, res) => {
  const driver = await Driver.findOne({ user: req.user.id }).populate('user', 'name email phone');
  if (!driver) return res.status(404).json({ message: 'Driver profile not found' });
  res.json(driver);
};

// PUT /api/drivers/vehicle  { make, model, plateNumber, color, type }
exports.updateVehicle = async (req, res) => {
  const driver = await Driver.findOneAndUpdate(
    { user: req.user.id },
    { vehicle: req.body },
    { new: true }
  );
  res.json(driver);
};

// POST /api/drivers/documents  (multipart form: license, registration, insurance)
exports.uploadDocuments = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    const files = req.files || {};
    ['license', 'registration', 'insurance'].forEach((field) => {
      if (files[field] && files[field][0]) {
        driver.documents[field] = {
          url: `/uploads/documents/${files[field][0].filename}`,
          status: 'pending',
        };
      }
    });
    driver.verificationStatus = 'pending';
    await driver.save();
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/drivers/status  { isOnline, isAvailable }
exports.updateStatus = async (req, res) => {
  const { isOnline, isAvailable } = req.body;
  
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

    if (isOnline === true) {
      const vehicle = driver.vehicle || {};
      const hasVehicleInfo = vehicle.make && vehicle.model && vehicle.plateNumber && vehicle.color;
      const docs = driver.documents || {};
      const hasDocs = docs.license?.url && docs.registration?.url && docs.insurance?.url;

      if (!hasVehicleInfo || !hasDocs) {
        return res.status(400).json({
          message: 'Please complete your profile: Ensure vehicle details are filled and all documents (license, registration, insurance) are uploaded.',
        });
      }
    }

    const updated = await Driver.findOneAndUpdate(
      { user: req.user.id },
      { ...(isOnline !== undefined && { isOnline }), ...(isAvailable !== undefined && { isAvailable }) },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/drivers/location  { lng, lat }
exports.updateLocation = async (req, res) => {
  const { lng, lat } = req.body;
  const driver = await Driver.findOneAndUpdate(
    { user: req.user.id },
    { currentLocation: { type: 'Point', coordinates: [lng, lat] } },
    { new: true }
  );

  if (driver) {
    req.io.emit('driver:location', {
      driverId: driver._id,
      coordinates: driver.currentLocation.coordinates,
    });
  }
  res.json(driver);
};
