const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { Hospital, sequelize } = require('../models');
const GeoUtils = require('../utils/GeoUtils');
const RecommendationService = require('../services/RecommendationService');
const router = express.Router();

// 테이블 상수 정의
const TABLES = {
  MEDICAL_SERVICES: 'veteran_hospital_medical_services',
  EQUIPMENT: 'veteran_hospital_equipment', 
  NON_COVERED: 'veteran_hospital_non_covered_services',
  DISEASE_STATS: 'veteran_hospital_disease_statistics',
  BENEFIT_HOSPITALS: 'veteran_benefit_hospitals'
};

// 보훈병원 이름 매핑 함수
function getVeteranHospitalName(hospitalName) {
  const veteranHospitals = {
    '중앙보훈병원': '중앙보훈병원',
    '대전보훈병원': '대전보훈병원', 
    '부산보훈병원': '부산보훈병원',
    '광주보훈병원': '광주보훈병원',
    '대구보훈병원': '대구보훈병원',
    '인천보훈병원': '인천보훈병원'
  };
  
  for (const [key, value] of Object.entries(veteranHospitals)) {
    if (hospitalName.includes(key)) {
      return value;
    }
  }
  return null;
}

// 모든 병원 조회 (페이지네이션 포함)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: hospitals } = await Hospital.findAndCountAll({
      where: { isActive: true },
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    // 위치 기반 검색인 경우 거리 계산 및 정렬
    let processedHospitals = hospitals;
    const { lat, lng } = req.query;
    
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      processedHospitals = hospitals.map(hospital => {
        const distance = GeoUtils.calculateDistance(
          userLat, userLng,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        );
        
        return {
          ...hospital.toJSON(),
          distance: parseFloat(distance.toFixed(2))
        };
      }).sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: {
        hospitals: processedHospitals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        searchParams: req.query
      }
    });

  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospitals'
    });
  }
});

// 병원 검색
router.get('/search', async (req, res) => {
  try {
    const { 
      keyword, 
      type, 
      city, 
      district,
      lat, 
      lng, 
      radius = 10,
      page = 1,
      limit = 20
    } = req.query;

    let whereClause = { isActive: true };
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 키워드 검색
    if (keyword) {
      whereClause.name = {
        [Op.like]: `%${keyword}%`
      };
    }

    // 병원 종류 필터
    if (type) {
      whereClause.type = type;
    }

    // 지역 필터
    if (city) {
      whereClause.city = city;
    }

    if (district) {
      whereClause.district = district;
    }

    // 위치 기반 검색 (경계박스 사용)
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      if (GeoUtils.isValidCoordinate(userLat, userLng)) {
        const bbox = GeoUtils.getBoundingBox(userLat, userLng, radiusKm);
        
        whereClause.latitude = {
          [Op.between]: [bbox.minLat, bbox.maxLat]
        };
        whereClause.longitude = {
          [Op.between]: [bbox.minLon, bbox.maxLon]
        };
      }
    }

    const { count, rows: hospitals } = await Hospital.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['name', 'ASC']]
    });

    // 위치 기반 검색인 경우 거리 계산 및 정렬
    let processedHospitals = hospitals;
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      processedHospitals = hospitals.map(hospital => {
        const distance = GeoUtils.calculateDistance(
          userLat, userLng,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        );
        
        return {
          ...hospital.toJSON(),
          distance: parseFloat(distance.toFixed(2))
        };
      }).sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: {
        hospitals: processedHospitals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        searchParams: req.query
      }
    });

  } catch (error) {
    console.error('Error searching hospitals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search hospitals'
    });
  }
});

// 병원 추천 API (프론트엔드 연동 최적화)
router.post('/recommend', async (req, res) => {
  try {
    console.log('추천 API 요청 데이터:', req.body);
    
    // 프론트엔드에서 전송되는 모든 데이터 수용
    const recommendationRequest = {
      lat: req.body.lat || req.body.latitude,
      lng: req.body.lng || req.body.longitude,
      veteranType: req.body.veteranType || req.body.veteran_type,
      region: req.body.region,
      district: req.body.district,
      symptoms: req.body.symptoms || [],
      urgency: req.body.urgency || 'normal',
      department: req.body.department,
      limit: req.body.limit || 5
    };
    
    // 기본 위치 설정 (좌표가 없는 경우)
    if (!recommendationRequest.lat || !recommendationRequest.lng) {
      if (recommendationRequest.region) {
        const regionCoords = RecommendationService.getRegionCoordinates(recommendationRequest.region);
        recommendationRequest.lat = regionCoords.lat;
        recommendationRequest.lng = regionCoords.lng;
      } else {
        // 대한민국 중심 (default)
        recommendationRequest.lat = 37.5665;
        recommendationRequest.lng = 126.9780;
      }
    }
    
    const latitude = parseFloat(recommendationRequest.lat);
    const longitude = parseFloat(recommendationRequest.lng);
    
    console.log('처리된 추천 요청:', recommendationRequest);

    // 좌표 유효성 검사
    if (!GeoUtils.isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        details: `유효하지 않은 좌표: ${latitude}, ${longitude}`
      });
    }

    // RecommendationService 호출
    const recommendations = await RecommendationService.getRecommendationsForAPI(
      recommendationRequest
    );
    
    console.log(`추천 결과: ${recommendations.length}개 병원`);

    res.json({
      success: true,
      data: {
        recommendations,
        totalFound: recommendations.length,
        searchCenter: { lat: latitude, lng: longitude },
        criteria: {
          department: recommendationRequest.department,
          veteranType: recommendationRequest.veteranType || 'NATIONAL_MERIT',
          symptoms: recommendationRequest.symptoms,
          urgency: recommendationRequest.urgency,
          region: recommendationRequest.region,
          district: recommendationRequest.district
        }
      }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate hospital recommendations',
      details: error.message
    });
  }
});

// 주변 병원 찾기
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (!GeoUtils.isValidCoordinate(userLat, userLng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    // 경계박스로 초기 필터링
    const bbox = GeoUtils.getBoundingBox(userLat, userLng, parseFloat(radius));
    
    const hospitals = await Hospital.findAll({
      where: {
        isActive: true,
        latitude: {
          [Op.between]: [bbox.minLat, bbox.maxLat]
        },
        longitude: {
          [Op.between]: [bbox.minLon, bbox.maxLon]
        }
      }
    });

    // 정확한 거리 계산 및 필터링
    const nearbyHospitals = GeoUtils.findNearbyHospitals(
      userLat, userLng, hospitals, parseFloat(radius)
    ).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        hospitals: nearbyHospitals,
        totalFound: nearbyHospitals.length,
        searchCenter: { lat: userLat, lng: userLng },
        radiusKm: parseFloat(radius)
      }
    });

  } catch (error) {
    console.error('Error finding nearby hospitals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby hospitals'
    });
  }
});

// ============== 새로운 상세 정보 API들 ==============

// 특정 병원 상세 조회 (향상된 버전)
router.get('/:id', async (req, res) => {
  try {
    const hospitalId = parseInt(req.params.id);
    
    const hospital = await Hospital.findOne({
      where: { 
        id: hospitalId,
        isActive: true 
      }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'Hospital not found'
      });
    }

    // 사용자 위치가 제공된 경우 거리 계산
    const { lat, lng, department } = req.query;
    let hospitalData = hospital.toJSON();

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      if (GeoUtils.isValidCoordinate(userLat, userLng)) {
        const distance = GeoUtils.calculateDistance(
          userLat, userLng,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        );
        hospitalData.distance = parseFloat(distance.toFixed(2));
        
        // 추천 점수 계산 (선택적)
        if (department) {
          try {
            const recommendations = await RecommendationService.getRecommendationsForAPI(
              userLat, userLng, { department, limit: 100 }
            );
            const thisHospitalRec = recommendations.find(rec => rec.id === hospitalId);
            if (thisHospitalRec) {
              hospitalData.recommendation_score = thisHospitalRec.score;
            }
          } catch (error) {
            console.warn('추천 점수 계산 실패:', error);
          }
        }
      }
    }

    res.json({
      success: true,
      hospital: hospitalData
    });

  } catch (error) {
    console.error('Error fetching hospital details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospital details'
    });
  }
});

// 병원별 진료 서비스 정보 (792개 데이터)
router.get('/:id/medical-services', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        error: 'Hospital not found' 
      });
    }

    const searchName = getVeteranHospitalName(hospital.name);
    if (!searchName) {
      return res.json({
        success: true,
        hospital_id: hospitalId,
        hospital_name: hospital.name,
        medical_services: [],
        count: 0,
        message: '보훈병원 진료정보가 없습니다.'
      });
    }

    const medicalServices = await sequelize.query(
      `SELECT * FROM ${TABLES.MEDICAL_SERVICES} WHERE hospital_name LIKE ? ORDER BY department ASC`,
      {
        replacements: [`%${searchName}%`],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    // 진료과별 그룹화
    const servicesByDepartment = medicalServices.reduce((groups, service) => {
      const dept = service.department || '기타';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(service);
      return groups;
    }, {});

    res.json({
      success: true,
      hospital_id: hospitalId,
      hospital_name: hospital.name,
      medical_services: medicalServices,
      services_by_department: servicesByDepartment,
      departments: Object.keys(servicesByDepartment),
      count: medicalServices.length
    });

  } catch (error) {
    console.error('진료 서비스 정보 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '진료 서비스 정보를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// 병원별 의료장비 정보 (37개 데이터)
router.get('/:id/equipment', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        error: 'Hospital not found' 
      });
    }

    const searchName = getVeteranHospitalName(hospital.name);
    if (!searchName) {
      return res.json({
        success: true,
        hospital_id: hospitalId,
        hospital_name: hospital.name,
        equipment: [],
        count: 0,
        message: '보훈병원 의료장비 정보가 없습니다.'
      });
    }

    const equipment = await sequelize.query(
      `SELECT * FROM ${TABLES.EQUIPMENT} WHERE hospital_name LIKE ? ORDER BY equipment_category ASC, equipment_name ASC`,
      {
        replacements: [`%${searchName}%`],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    // 카테고리별 그룹화
    const groupedEquipment = equipment.reduce((groups, eq) => {
      const category = eq.equipment_category || '기타';
      if (!groups[category]) groups[category] = [];
      groups[category].push(eq);
      return groups;
    }, {});

    res.json({
      success: true,
      hospital_id: hospitalId,
      hospital_name: hospital.name,
      equipment: equipment,
      grouped_equipment: groupedEquipment,
      categories: Object.keys(groupedEquipment),
      count: equipment.length
    });

  } catch (error) {
    console.error('의료장비 정보 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '의료장비 정보를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// 병원별 비급여 서비스 정보 (5,483개 데이터)
router.get('/:id/non-covered-services', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        error: 'Hospital not found' 
      });
    }

    const searchName = getVeteranHospitalName(hospital.name);
    if (!searchName) {
      return res.json({
        success: true,
        hospital_id: hospitalId,
        hospital_name: hospital.name,
        non_covered_services: [],
        count: 0,
        message: '보훈병원 비급여정보가 없습니다.'
      });
    }

    const nonCoveredServices = await sequelize.query(
      `SELECT * FROM ${TABLES.NON_COVERED} WHERE hospital_name LIKE ? ORDER BY service_category ASC, service_name ASC`,
      {
        replacements: [`%${searchName}%`],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    // 카테고리별 그룹화 및 통계
    const groupedServices = nonCoveredServices.reduce((groups, service) => {
      const category = service.service_category || '기타';
      if (!groups[category]) groups[category] = [];
      groups[category].push(service);
      return groups;
    }, {});

    // 가격 통계 계산
    const validPrices = nonCoveredServices.filter(s => s.price_min || s.price_max || s.price_avg);
    const priceStats = {
      total_services: nonCoveredServices.length,
      categories: Object.keys(groupedServices).length,
      price_range: validPrices.length > 0 ? {
        min: Math.min(...validPrices.filter(s => s.price_min).map(s => s.price_min)),
        max: Math.max(...validPrices.filter(s => s.price_max).map(s => s.price_max)),
        avg: Math.round(validPrices.filter(s => s.price_avg).reduce((sum, s) => sum + s.price_avg, 0) / validPrices.filter(s => s.price_avg).length)
      } : null
    };

    res.json({
      success: true,
      hospital_id: hospitalId,
      hospital_name: hospital.name,
      non_covered_services: nonCoveredServices,
      grouped_services: groupedServices,
      price_statistics: priceStats,
      count: nonCoveredServices.length
    });

  } catch (error) {
    console.error('비급여 서비스 정보 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '비급여 서비스 정보를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// 병원별 질병통계 정보 (15,731개 데이터)
router.get('/:id/disease-statistics', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        error: 'Hospital not found' 
      });
    }

    const searchName = getVeteranHospitalName(hospital.name);
    if (!searchName) {
      return res.json({
        success: true,
        hospital_id: hospitalId,
        hospital_name: hospital.name,
        disease_statistics: [],
        count: 0,
        message: '보훈병원 질병통계 정보가 없습니다.'
      });
    }

    const diseaseStatistics = await sequelize.query(
      `SELECT * FROM ${TABLES.DISEASE_STATS} WHERE hospital_name LIKE ? ORDER BY disease_category ASC, total_count DESC`,
      {
        replacements: [`%${searchName}%`],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    // 질병 대분류별 그룹화
    const groupedByCategory = diseaseStatistics.reduce((groups, stat) => {
      const category = stat.disease_category || '기타';
      if (!groups[category]) groups[category] = [];
      groups[category].push(stat);
      return groups;
    }, {});

    // 통계 계산
    const statistics = {
      total_cases: diseaseStatistics.reduce((sum, stat) => sum + (parseInt(stat.total_count) || 0), 0),
      total_diseases: diseaseStatistics.length,
      categories: Object.keys(groupedByCategory).length,
      top_diseases: diseaseStatistics
        .filter(stat => stat.total_count > 0)
        .sort((a, b) => (parseInt(b.total_count) || 0) - (parseInt(a.total_count) || 0))
        .slice(0, 10),
      category_stats: Object.entries(groupedByCategory).map(([category, diseases]) => ({
        category,
        disease_count: diseases.length,
        total_cases: diseases.reduce((sum, d) => sum + (parseInt(d.total_count) || 0), 0)
      })).sort((a, b) => b.total_cases - a.total_cases)
    };

    res.json({
      success: true,
      hospital_id: hospitalId,
      hospital_name: hospital.name,
      disease_statistics: diseaseStatistics,
      grouped_by_category: groupedByCategory,
      statistics: statistics,
      count: diseaseStatistics.length
    });

  } catch (error) {
    console.error('질병통계 정보 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '질병통계 정보를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// 병원별 보훈 혜택 정보 (311개 혜택 병원)
router.get('/:id/benefits', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        error: 'Hospital not found' 
      });
    }

    const hospitalName = hospital.name;
    
    // 보훈 혜택 병원 정보 조회
    const benefitInfo = await sequelize.query(
      `SELECT * FROM ${TABLES.BENEFIT_HOSPITALS} WHERE hospital_name LIKE ?`,
      {
        replacements: [`%${hospitalName}%`],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    // 병원 유형별 기본 혜택 정보
    let defaultBenefits = {
      is_veteran_hospital: hospitalName.includes('보훈'),
      is_contracted_hospital: true,
      basic_benefits: [
        '보훈대상자 의료비 지원 (등급별 차등)',
        '전문의료진 진료',
        '응급의료 서비스'
      ]
    };

    // 보훈병원 추가 혜택
    if (hospitalName.includes('보훈')) {
      defaultBenefits.basic_benefits.push(
        '보훈대상자 의료비 100% 지원',
        '보훈 전문 의료진',
        '재활치료 특화 서비스',
        '보훈대상자 맞춤 진료'
      );
    }

    res.json({
      success: true,
      hospital_id: hospitalId,
      hospital_name: hospitalName,
      benefits: benefitInfo.length > 0 ? benefitInfo[0] : null,
      default_benefits: defaultBenefits,
      has_special_benefits: benefitInfo.length > 0
    });

  } catch (error) {
    console.error('보훈 혜택 정보 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '보훈 혜택 정보를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// ============== 고급 검색 API들 ==============

// 장비 기반 병원 검색
router.get('/search/by-equipment', async (req, res) => {
  try {
    const { equipment_type, equipment_category, user_lat, user_lng, radius = 50 } = req.query;

    // 장비를 보유한 병원 찾기
    let equipmentQuery = `SELECT * FROM ${TABLES.EQUIPMENT}`;
    let replacements = [];
    let whereConditions = [];

    if (equipment_type) {
      whereConditions.push('equipment_name LIKE ?');
      replacements.push(`%${equipment_type}%`);
    }
    if (equipment_category) {
      whereConditions.push('equipment_category = ?');
      replacements.push(equipment_category);
    }

    if (whereConditions.length > 0) {
      equipmentQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    const equipmentData = await sequelize.query(equipmentQuery, {
      replacements: replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    // 병원 정보와 거리 계산
    let results = [];
    const processedHospitals = new Set();

    for (const equipment of equipmentData) {
      const hospitalName = equipment.hospital_name;
      
      if (processedHospitals.has(hospitalName)) continue;
      processedHospitals.add(hospitalName);

      // 해당 이름의 병원 찾기
      const hospitals = await Hospital.findAll({
        where: {
          name: { [Op.like]: `%${hospitalName}%` },
          isActive: true
        }
      });

      for (const hospital of hospitals) {
        if (user_lat && user_lng && hospital.latitude && hospital.longitude) {
          const distance = GeoUtils.calculateDistance(
            parseFloat(user_lat), parseFloat(user_lng),
            hospital.latitude, hospital.longitude
          );

          if (distance <= radius) {
            results.push({
              ...hospital.toJSON(),
              distance: parseFloat(distance.toFixed(2)),
              equipment_info: {
                name: equipment.equipment_name,
                category: equipment.equipment_category,
                purpose: equipment.purpose
              }
            });
          }
        } else {
          results.push({
            ...hospital.toJSON(),
            equipment_info: {
              name: equipment.equipment_name,
              category: equipment.equipment_category,
              purpose: equipment.purpose
            }
          });
        }
      }
    }

    // 거리순 정렬
    results.sort((a, b) => (a.distance || 999) - (b.distance || 999));

    res.json({
      success: true,
      equipment_type: equipment_type,
      equipment_category: equipment_category,
      hospitals: results,
      count: results.length
    });

  } catch (error) {
    console.error('장비 기반 병원 검색 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '장비 기반 병원 검색 중 오류가 발생했습니다.' 
    });
  }
});

// 병원 통계 조회 (23,252개 데이터 포함)
router.get('/stats/overview', async (req, res) => {
  try {
    const totalHospitals = await Hospital.count({
      where: { isActive: true }
    });

    const hospitalsByType = await Hospital.findAll({
      attributes: [
        'type',
        [Hospital.sequelize.fn('COUNT', Hospital.sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['type'],
      order: [[Hospital.sequelize.fn('COUNT', Hospital.sequelize.col('id')), 'DESC']]
    });

    const hospitalsByCity = await Hospital.findAll({
      attributes: [
        'city',
        [Hospital.sequelize.fn('COUNT', Hospital.sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['city'],
      order: [[Hospital.sequelize.fn('COUNT', Hospital.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    const totalBeds = await Hospital.sum('bedCount', {
      where: { isActive: true }
    });

    // 추가 통계 - 23,252개 데이터 활용
    const [medicalServicesCount, equipmentCount, nonCoveredCount, diseaseStatsCount, benefitHospitalsCount] = await Promise.all([
      sequelize.query(`SELECT COUNT(*) as count FROM ${TABLES.MEDICAL_SERVICES}`, { type: Sequelize.QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) as count FROM ${TABLES.EQUIPMENT}`, { type: Sequelize.QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) as count FROM ${TABLES.NON_COVERED}`, { type: Sequelize.QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) as count FROM ${TABLES.DISEASE_STATS}`, { type: Sequelize.QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) as count FROM ${TABLES.BENEFIT_HOSPITALS}`, { type: Sequelize.QueryTypes.SELECT })
    ]);

    const totalDataCount = totalHospitals + 
                          medicalServicesCount[0].count + 
                          equipmentCount[0].count + 
                          nonCoveredCount[0].count + 
                          diseaseStatsCount[0].count + 
                          benefitHospitalsCount[0].count;

    res.json({
      success: true,
      data: {
        totalHospitals,
        totalBeds: totalBeds || 0,
        averageBedsPerHospital: totalHospitals > 0 ? Math.round((totalBeds || 0) / totalHospitals) : 0,
        hospitalsByType: hospitalsByType.map(item => ({
          type: item.type,
          count: parseInt(item.getDataValue('count'))
        })),
        topCitiesByHospitalCount: hospitalsByCity.map(item => ({
          city: item.city,
          count: parseInt(item.getDataValue('count'))
        })),
        // 새로운 종합 데이터 통계 - 23,252개 데이터 완전 활용
        comprehensive_data: {
          total_data_count: totalDataCount,
          medical_services: medicalServicesCount[0].count,
          equipment: equipmentCount[0].count,
          non_covered_services: nonCoveredCount[0].count,
          disease_statistics: diseaseStatsCount[0].count,
          benefit_hospitals: benefitHospitalsCount[0].count
        }
      }
    });

  } catch (error) {
    console.error('Error fetching hospital statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospital statistics'
    });
  }
});

// ============== 통합 병원 정보 API ==============

// 병원 종합 정보 (모든 데이터 통합)
router.get('/:id/comprehensive', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        error: 'Hospital not found' 
      });
    }

    const searchName = getVeteranHospitalName(hospital.name);
    const { lat, lng } = req.query;

    // 기본 병원 정보
    let hospitalData = hospital.toJSON();

    // 거리 계산 (사용자 위치가 제공된 경우)
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      if (GeoUtils.isValidCoordinate(userLat, userLng)) {
        const distance = GeoUtils.calculateDistance(
          userLat, userLng,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        );
        hospitalData.distance = parseFloat(distance.toFixed(2));
      }
    }

    // 보훈병원인 경우 모든 상세 데이터 조회
    let comprehensiveData = {
      basic_info: hospitalData,
      medical_services: [],
      equipment: [],
      non_covered_services: [],
      disease_statistics: [],
      benefits: null,
      summary: {
        is_veteran_hospital: hospitalData.name.includes('보훈'),
        has_detailed_data: false,
        data_categories: []
      }
    };

    if (searchName) {
      try {
        // 모든 데이터를 병렬로 조회
        const [medicalServices, equipment, nonCoveredServices, diseaseStatistics, benefitInfo] = await Promise.all([
          sequelize.query(
            `SELECT * FROM ${TABLES.MEDICAL_SERVICES} WHERE hospital_name LIKE ? ORDER BY department ASC`,
            { replacements: [`%${searchName}%`], type: Sequelize.QueryTypes.SELECT }
          ),
          sequelize.query(
            `SELECT * FROM ${TABLES.EQUIPMENT} WHERE hospital_name LIKE ? ORDER BY equipment_category ASC`,
            { replacements: [`%${searchName}%`], type: Sequelize.QueryTypes.SELECT }
          ),
          sequelize.query(
            `SELECT * FROM ${TABLES.NON_COVERED} WHERE hospital_name LIKE ? ORDER BY service_category ASC`,
            { replacements: [`%${searchName}%`], type: Sequelize.QueryTypes.SELECT }
          ),
          sequelize.query(
            `SELECT * FROM ${TABLES.DISEASE_STATS} WHERE hospital_name LIKE ? ORDER BY disease_category ASC`,
            { replacements: [`%${searchName}%`], type: Sequelize.QueryTypes.SELECT }
          ),
          sequelize.query(
            `SELECT * FROM ${TABLES.BENEFIT_HOSPITALS} WHERE hospital_name LIKE ?`,
            { replacements: [`%${hospital.name}%`], type: Sequelize.QueryTypes.SELECT }
          )
        ]);

        comprehensiveData.medical_services = medicalServices;
        comprehensiveData.equipment = equipment;
        comprehensiveData.non_covered_services = nonCoveredServices;
        comprehensiveData.disease_statistics = diseaseStatistics;
        comprehensiveData.benefits = benefitInfo.length > 0 ? benefitInfo[0] : null;

        // 요약 정보 업데이트
        comprehensiveData.summary.has_detailed_data = true;
        if (medicalServices.length > 0) comprehensiveData.summary.data_categories.push('medical_services');
        if (equipment.length > 0) comprehensiveData.summary.data_categories.push('equipment');
        if (nonCoveredServices.length > 0) comprehensiveData.summary.data_categories.push('non_covered_services');
        if (diseaseStatistics.length > 0) comprehensiveData.summary.data_categories.push('disease_statistics');
        if (benefitInfo.length > 0) comprehensiveData.summary.data_categories.push('benefits');

        comprehensiveData.summary.total_data_count = 
          medicalServices.length + 
          equipment.length + 
          nonCoveredServices.length + 
          diseaseStatistics.length + 
          (benefitInfo.length > 0 ? 1 : 0);

      } catch (error) {
        console.warn('상세 데이터 조회 중 일부 오류:', error);
      }
    }

    // 기본 혜택 정보 추가
    if (!comprehensiveData.benefits) {
      comprehensiveData.default_benefits = {
        is_veteran_hospital: hospitalData.name.includes('보훈'),
        is_contracted_hospital: true,
        basic_benefits: [
          '보훈대상자 의료비 지원 (등급별 차등)',
          '전문의료진 진료',
          '응급의료 서비스'
        ]
      };

      if (hospitalData.name.includes('보훈')) {
        comprehensiveData.default_benefits.basic_benefits.push(
          '보훈대상자 의료비 100% 지원',
          '보훈 전문 의료진',
          '재활치료 특화 서비스'
        );
      }
    }

    res.json({
      success: true,
      hospital_id: hospitalId,
      hospital_name: hospital.name,
      comprehensive_data: comprehensiveData
    });

  } catch (error) {
    console.error('종합 병원 정보 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '종합 병원 정보를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// ============== 고급 분석 API들 ==============

// 질병별 전문 병원 랭킹
router.get('/analysis/disease-specialists', async (req, res) => {
  try {
    const { disease_category, disease_name, limit = 10 } = req.query;

    let diseaseQuery = `
      SELECT 
        hospital_name,
        disease_category,
        disease_name,
        total_count,
        ROW_NUMBER() OVER (PARTITION BY hospital_name ORDER BY total_count DESC) as rank_in_hospital
      FROM ${TABLES.DISEASE_STATS}
    `;
    
    let whereConditions = [];
    let replacements = [];

    if (disease_category) {
      whereConditions.push('disease_category = ?');
      replacements.push(disease_category);
    }

    if (disease_name) {
      whereConditions.push('disease_name LIKE ?');
      replacements.push(`%${disease_name}%`);
    }

    if (whereConditions.length > 0) {
      diseaseQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    diseaseQuery += ' ORDER BY total_count DESC';

    if (limit) {
      diseaseQuery += ` LIMIT ${parseInt(limit)}`;
    }

    const diseaseSpecialists = await sequelize.query(diseaseQuery, {
      replacements: replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    // 병원 정보와 매칭
    let results = [];
    for (const specialist of diseaseSpecialists) {
      const hospitals = await Hospital.findAll({
        where: {
          name: { [Op.like]: `%${specialist.hospital_name}%` },
          isActive: true
        }
      });

      if (hospitals.length > 0) {
        results.push({
          ...hospitals[0].toJSON(),
          specialization: {
            disease_category: specialist.disease_category,
            disease_name: specialist.disease_name,
            treatment_count: specialist.total_count,
            rank: results.length + 1
          }
        });
      }
    }

    res.json({
      success: true,
      disease_category: disease_category,
      disease_name: disease_name,
      specialist_hospitals: results,
      count: results.length
    });

  } catch (error) {
    console.error('질병별 전문 병원 분석 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '질병별 전문 병원 분석 중 오류가 발생했습니다.' 
    });
  }
});

// 혜택 최적화 병원 추천
router.get('/analysis/benefit-optimization', async (req, res) => {
  try {
    const { veteran_type, user_lat, user_lng, radius = 30 } = req.query;

    // 혜택 병원 조회
    const benefitHospitals = await sequelize.query(
      `SELECT * FROM ${TABLES.BENEFIT_HOSPITALS} ORDER BY discount_rate DESC`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let results = [];

    for (const benefitHospital of benefitHospitals) {
      // 해당 이름의 병원 찾기
      const hospitals = await Hospital.findAll({
        where: {
          name: { [Op.like]: `%${benefitHospital.hospital_name}%` },
          isActive: true
        }
      });

      for (const hospital of hospitals) {
        let hospitalData = {
          ...hospital.toJSON(),
          benefit_info: {
            benefit_type: benefitHospital.benefit_type,
            discount_rate: benefitHospital.discount_rate,
            target_veterans: benefitHospital.target_veterans,
            benefit_description: benefitHospital.benefit_description
          }
        };

        // 거리 계산
        if (user_lat && user_lng && hospital.latitude && hospital.longitude) {
          const distance = GeoUtils.calculateDistance(
            parseFloat(user_lat), parseFloat(user_lng),
            hospital.latitude, hospital.longitude
          );

          if (distance <= radius) {
            hospitalData.distance = parseFloat(distance.toFixed(2));
            results.push(hospitalData);
          }
        } else {
          results.push(hospitalData);
        }
      }
    }

    // 할인율과 거리를 고려한 정렬
    results.sort((a, b) => {
      const discountA = parseInt(a.benefit_info.discount_rate.replace('%', '')) || 0;
      const discountB = parseInt(b.benefit_info.discount_rate.replace('%', '')) || 0;
      
      if (discountA !== discountB) {
        return discountB - discountA; // 할인율 높은 순
      }
      
      return (a.distance || 999) - (b.distance || 999); // 거리 가까운 순
    });

    res.json({
      success: true,
      veteran_type: veteran_type,
      optimized_hospitals: results,
      count: results.length,
      optimization_criteria: {
        primary: 'discount_rate',
        secondary: 'distance'
      }
    });

  } catch (error) {
    console.error('혜택 최적화 분석 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '혜택 최적화 분석 중 오류가 발생했습니다.' 
    });
  }
});

// 의료비 비교 분석
router.get('/analysis/cost-comparison', async (req, res) => {
  try {
    const { service_name, service_category, hospital_list } = req.query;

    let costQuery = `SELECT * FROM ${TABLES.NON_COVERED}`;
    let whereConditions = [];
    let replacements = [];

    if (service_name) {
      whereConditions.push('service_name LIKE ?');
      replacements.push(`%${service_name}%`);
    }

    if (service_category) {
      whereConditions.push('service_category = ?');
      replacements.push(service_category);
    }

    if (hospital_list) {
      const hospitals = hospital_list.split(',');
      const hospitalConditions = hospitals.map(() => 'hospital_name LIKE ?').join(' OR ');
      whereConditions.push(`(${hospitalConditions})`);
      hospitals.forEach(hospital => replacements.push(`%${hospital.trim()}%`));
    }

    if (whereConditions.length > 0) {
      costQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    costQuery += ' ORDER BY hospital_name ASC, price_min ASC';

    const costData = await sequelize.query(costQuery, {
      replacements: replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    // 병원별 그룹화 및 통계
    const hospitalComparison = costData.reduce((comparison, cost) => {
      const hospitalName = cost.hospital_name;
      
      if (!comparison[hospitalName]) {
        comparison[hospitalName] = {
          hospital_name: hospitalName,
          services: [],
          price_stats: {
            min_price: Infinity,
            max_price: 0,
            avg_price: 0,
            service_count: 0
          }
        };
      }

      comparison[hospitalName].services.push(cost);
      
      // 가격 통계 업데이트
      const stats = comparison[hospitalName].price_stats;
      if (cost.price_min && cost.price_min < stats.min_price) {
        stats.min_price = cost.price_min;
      }
      if (cost.price_max && cost.price_max > stats.max_price) {
        stats.max_price = cost.price_max;
      }
      stats.service_count++;

      return comparison;
    }, {});

    // 평균 가격 계산
    Object.values(hospitalComparison).forEach(hospital => {
      const validPrices = hospital.services.filter(s => s.price_avg).map(s => s.price_avg);
      if (validPrices.length > 0) {
        hospital.price_stats.avg_price = Math.round(
          validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
        );
      }
      if (hospital.price_stats.min_price === Infinity) {
        hospital.price_stats.min_price = 0;
      }
    });

    res.json({
      success: true,
      service_name: service_name,
      service_category: service_category,
      hospital_comparison: Object.values(hospitalComparison),
      total_hospitals: Object.keys(hospitalComparison).length,
      total_services: costData.length
    });

  } catch (error) {
    console.error('의료비 비교 분석 실패:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: '의료비 비교 분석 중 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;