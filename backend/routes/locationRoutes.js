const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/locationController');

router.get('/autocomplete', protect, ctrl.autocomplete);
router.get('/geocode', protect, ctrl.geocode);
router.get('/reverse', protect, ctrl.reverseGeocode);
router.get('/directions', protect, ctrl.directions);

module.exports = router;
