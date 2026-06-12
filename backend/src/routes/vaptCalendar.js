const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getList,
  getById,
  create,
  update,
  remove,
  getDashboardStats,
  recalculateAll
} = require('../controllers/vaptCalendarController');

router.get('/stats', protect, authorize('admin', 'vapt_analyst'), getDashboardStats);
router.post('/recalculate', protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), recalculateAll);

router.get('/', protect, authorize('admin', 'vapt_analyst'), getList);
router.get('/:id', protect, authorize('admin', 'vapt_analyst'), getById);
router.post('/', protect, authorize('admin', 'vapt_analyst'), create);
router.put('/:id', protect, authorize('admin', 'vapt_analyst'), update);
router.delete('/:id', protect, authorize('admin', 'vapt_analyst'), remove);

module.exports = router;
