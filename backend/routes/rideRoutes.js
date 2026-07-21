const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/rideController');

router.post('/', protect, requireRole('rider'), ctrl.requestRide);
router.get('/nearby', protect, requireRole('driver'), ctrl.nearbyRides);
// NOTE: /my and /my-driver must be before /:id so they don't get captured as ID params
router.get('/my', protect, requireRole('rider'), ctrl.myRides);
router.get('/my-driver', protect, requireRole('driver'), ctrl.myDriverRides);
router.get('/mine', protect, ctrl.myRides);
router.get('/:id', protect, ctrl.getRide);
router.post('/:id/offer', protect, requireRole('driver'), ctrl.makeOffer);
router.post('/:id/offer/:offerId/accept', protect, requireRole('rider'), ctrl.acceptOffer);
router.patch('/:id/status', protect, ctrl.updateStatus);
router.post('/:id/pay/stripe', protect, requireRole('rider'), ctrl.payWithStripe);
router.post('/:id/cancel', protect, ctrl.cancelRide);
router.get('/:id/messages', protect, ctrl.getMessages);


module.exports = router;
