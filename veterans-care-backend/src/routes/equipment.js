const express = require('express');
const { MedicalEquipment, Hospital, HospitalDepartment } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

// 의료장비 검색
router.get('/search', async (req, res) => {
  try {
    const { 
      keyword, 
      category, 
      hospital_id,
      lat,
      lng,
      radius = 10,
      page = 1, 
      limit = 10 
    } = req.query;

    // 검색 조건 설정
    let whereClause = {};
    
    if (keyword) {
      whereClause[Op.or] = [
        { equipment_name: { [Op.like]: `%${keyword}%` } },
        { equipment_clean_name: { [Op.like]: `%${keyword}%` } },
        { purpose: { [Op.like]: `%${keyword}%` } },
        { purpose_tags: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (category && category !== 'all') {
      whereClause.equipment_category = category;
    }
    
    if (hospital_id) {
      whereClause.hospital_id = hospital_id;
    }

    // 병원 위치 조건
    let hospitalWhereClause = {};
    if (lat && lng) {
      const latRange = parseFloat(radius) / 111;
      const lngRange = parseFloat(radius) / (111 * Math.cos(parseFloat(lat) * Math.PI / 180));
      
      hospitalWhereClause = {
        latitude: {
          [Op.between]: [parseFloat(lat) - latRange, parseFloat(lat) + latRange]
        },
        longitude: {
          [Op.between]: [parseFloat(lng) - lngRange, parseFloat(lng) + lngRange]
        }
      };
    }

    // 페이지네이션
    const offset = (page - 1) * limit;

    const equipment = await MedicalEquipment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['equipment_name', 'ASC']]
    });

    // 거리 계산 추가
    let results = equipment.rows;
    if (lat && lng) {
      const GeoUtils = require('../utils/GeoUtils');
      
      results = equipment.rows.map(equip => {
        const distance = GeoUtils.calculateDistance(
          parseFloat(lat), parseFloat(lng),
          equip.Hospital.latitude, equip.Hospital.longitude
        );
        
        return {
          ...equip.toJSON(),
          distance: parseFloat(distance.toFixed(2))
        };
      }).filter(equip => equip.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(equipment.count / limit),
        total_items: equipment.count,
        items_per_page: parseInt(limit)
      },
      search_params: {
        keyword,
        category,
        hospital_id,
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng), radius: parseFloat(radius) } : null
      }
    });

  } catch (error) {
    console.error('Error searching equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search equipment',
      message: error.message
    });
  }
});

// 특정 병원의 의료장비 목록
router.get('/hospitals/:id/equipment', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, search, page = 1, limit = 10 } = req.query;

    let whereClause = { hospital_id: id };
    
    if (category && category !== 'all') {
      whereClause.equipment_category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { equipment_name: { [Op.like]: `%${search}%` } },
        { purpose: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const equipment = await MedicalEquipment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['equipment_category', 'ASC'], ['equipment_name', 'ASC']]
    });

    res.json({
      success: true,
      data: equipment.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(equipment.count / limit),
        total_items: equipment.count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching hospital equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospital equipment',
      message: error.message
    });
  }
});

// 의료장비 상세 정보
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await MedicalEquipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: equipment
    });

  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment',
      message: error.message
    });
  }
});

// 의료장비 통계
router.get('/stats/overview', async (req, res) => {
  try {
    const { hospital_id } = req.query;

    let whereClause = {};
    if (hospital_id) {
      whereClause.hospital_id = hospital_id;
    }

    // 총 장비 수
    const totalEquipment = await MedicalEquipment.count({ where: whereClause });

    // 카테고리별 분포
    const categoryStats = await MedicalEquipment.findAll({
      where: whereClause,
      attributes: [
        'equipment_category',
        [require('sequelize').fn('COUNT', require('sequelize').col('equipment_category')), 'count']
      ],
      group: ['equipment_category'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('equipment_category')), 'DESC']]
    });

    // 병원별 장비 수 (전체 조회인 경우)
    let hospitalStats = null;
    if (!hospital_id) {
      hospitalStats = await MedicalEquipment.findAll({
        attributes: [
          'hospital_id',
          [require('sequelize').fn('COUNT', require('sequelize').col('MedicalEquipment.id')), 'equipment_count']
        ],
        include: [
          {
            model: Hospital,
            attributes: ['name']
          }
        ],
        group: ['hospital_id', 'Hospital.id'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('MedicalEquipment.id')), 'DESC']],
        limit: 10
      });
    }

    // 최신 장비 (최근 등록된 장비들)
    const recentEquipment = await MedicalEquipment.findAll({
      where: whereClause,
      include: [
        {
          model: Hospital,
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        total_equipment: totalEquipment,
        category_distribution: categoryStats,
        hospital_distribution: hospitalStats,
        recent_equipment: recentEquipment,
        available_categories: ['진단', '치료', '수술', '지원', '기타']
      }
    });

  } catch (error) {
    console.error('Error fetching equipment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment statistics',
      message: error.message
    });
  }
});

// 장비 이름 자동완성
router.get('/autocomplete/names', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await MedicalEquipment.findAll({
      attributes: ['equipment_name', 'equipment_clean_name'],
      where: {
        [Op.or]: [
          { equipment_name: { [Op.like]: `%${q}%` } },
          { equipment_clean_name: { [Op.like]: `%${q}%` } }
        ]
      },
      group: ['equipment_name', 'equipment_clean_name'],
      limit: parseInt(limit),
      order: [['equipment_name', 'ASC']]
    });

    const uniqueNames = [...new Set(suggestions.map(s => s.equipment_clean_name || s.equipment_name))];

    res.json({
      success: true,
      data: uniqueNames
    });

  } catch (error) {
    console.error('Error fetching equipment autocomplete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment suggestions',
      message: error.message
    });
  }
});

module.exports = router;
