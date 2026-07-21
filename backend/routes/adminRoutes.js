const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(protect, requireRole('admin'));

router.get('/drivers', ctrl.listDrivers);
router.patch('/drivers/:id/verify', ctrl.verifyDriver);
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/suspend', ctrl.setUserActive);
router.get('/rides', ctrl.listRides);
router.get('/stats', ctrl.stats);

module.exports = router;
