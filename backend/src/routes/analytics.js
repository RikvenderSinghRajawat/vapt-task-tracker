const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSeverityDistribution,
  getFindingsTrend,
  getProjectPerformance,
  getTeamPerformance,
  getSLACompliance,
  getAdvancedAnalytics,
  getFindingAgeDistribution
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth.js');

router.get('/dashboard', protect, getDashboardStats);
router.get('/severity-distribution', protect, getSeverityDistribution);
router.get('/findings-trend', protect, getFindingsTrend);
router.get('/project-performance', protect, getProjectPerformance);
router.get('/team-performance', protect, getTeamPerformance);
router.get('/sla-compliance', protect, getSLACompliance);
router.get('/advanced', protect, getAdvancedAnalytics);
router.get('/finding-age', protect, getFindingAgeDistribution);

module.exports = router;
