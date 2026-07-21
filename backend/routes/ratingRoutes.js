const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { rateRide } = require('../controllers/ratingController');

router.post('/', protect, rateRide);

module.exports = router;
