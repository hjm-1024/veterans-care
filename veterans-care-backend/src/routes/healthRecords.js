const express = require('express');
const router = express.Router();

// 기본 건강기록 관리 라우터 (추후 확장)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Health records endpoint is working',
    availableRoutes: [
      'GET /api/health-records/ - This endpoint'
    ]
  });
});

module.exports = router;
