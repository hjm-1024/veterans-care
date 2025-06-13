const express = require('express');
const axios = require('axios');
const GeoUtils = require('../utils/GeoUtils');
const router = express.Router();

// 주소를 좌표로 변환
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    // 카카오 API 키가 있는 경우 외부 API 사용
    if (process.env.KAKAO_API_KEY) {
      try {
        const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
          headers: {
            'Authorization': `KakaoAK ${process.env.KAKAO_API_KEY}`
          },
          params: { query: address }
        });

        if (response.data.documents.length > 0) {
          const { x, y } = response.data.documents[0];
          return res.json({
            success: true,
            data: {
              address,
              latitude: parseFloat(y),
              longitude: parseFloat(x),
              source: 'kakao'
            }
          });
        }
      } catch (apiError) {
        console.error('Kakao API Error:', apiError);
      }
    }

    // API 키가 없거나 실패한 경우 기본 응답
    res.json({
      success: false,
      error: 'Geocoding service not available. Please configure KAKAO_API_KEY.',
      note: 'This is a demo response. In production, configure external geocoding API.'
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Geocoding failed'
    });
  }
});

// 두 지점 간 거리 계산
router.post('/distance', (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({
        success: false,
        error: 'All coordinates (lat1, lon1, lat2, lon2) are required'
      });
    }

    const distance = GeoUtils.calculateDistance(
      parseFloat(lat1), parseFloat(lon1),
      parseFloat(lat2), parseFloat(lon2)
    );

    res.json({
      success: true,
      data: {
        distance: parseFloat(distance.toFixed(2)),
        unit: 'km'
      }
    });

  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Distance calculation failed'
    });
  }
});

// 좌표 유효성 검사
router.post('/validate-coordinates', (req, res) => {
  try {
    const { lat, lon } = req.body;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const isValid = GeoUtils.isValidCoordinate(parseFloat(lat), parseFloat(lon));
    const isKorean = GeoUtils.isKoreanCoordinate(parseFloat(lat), parseFloat(lon));

    res.json({
      success: true,
      data: {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        isValid,
        isInKorea: isKorean,
        validRange: {
          latitude: [-90, 90],
          longitude: [-180, 180]
        },
        koreaRange: {
          latitude: [33, 39],
          longitude: [124, 132]
        }
      }
    });

  } catch (error) {
    console.error('Coordinate validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Coordinate validation failed'
    });
  }
});

module.exports = router;
