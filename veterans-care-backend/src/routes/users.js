const express = require('express');
const router = express.Router();

// 기본 사용자 관리 라우터 (추후 확장)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Users endpoint is working',
    availableRoutes: [
      'GET /api/users/ - This endpoint'
    ]
  });
});

module.exports = router;
