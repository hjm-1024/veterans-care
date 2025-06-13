const express = require('express');
const router = express.Router();

// 기본 예약 관리 라우터 (추후 확장)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bookings endpoint is working',
    availableRoutes: [
      'GET /api/bookings/ - This endpoint'
    ]
  });
});

module.exports = router;
