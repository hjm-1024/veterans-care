const express = require('express');
const { HospitalDepartment, Hospital, MedicalEquipment } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

// 병원의 진료과 목록 조회
router.get('/hospitals/:id/departments', async (req, res) => {
  try {
    const { id } = req.params;
    const { search, page = 1, limit = 10 } = req.query;

    // 검색 조건 설정
    let whereClause = { hospital_id: id };
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { department_name: { [Op.like]: `%${search}%` } },
          { sub_department: { [Op.like]: `%${search}%` } },
          { medical_content: { [Op.like]: `%${search}%` } },
          { tags: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    // 페이지네이션 설정
    const offset = (page - 1) * limit;

    const departments = await HospitalDepartment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['department_name', 'ASC']]
    });

    res.json({
      success: true,
      data: departments.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(departments.count / limit),
        total_items: departments.count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      message: error.message
    });
  }
});

// 진료과 상세 정보 조회
router.get('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const department = await HospitalDepartment.findByPk(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });

  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department',
      message: error.message
    });
  }
});

// 진료과별 검색 (전체 병원 대상)
router.get('/departments/search', async (req, res) => {
  try {
    const { 
      keyword, 
      department, 
      equipment,
      lat, 
      lng, 
      radius = 10,
      page = 1, 
      limit = 10 
    } = req.query;

    // 기본 검색 조건
    let whereClause = {};
    
    if (keyword) {
      whereClause[Op.or] = [
        { department_name: { [Op.like]: `%${keyword}%` } },
        { sub_department: { [Op.like]: `%${keyword}%` } },
        { medical_content: { [Op.like]: `%${keyword}%` } },
        { tags: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (department) {
      whereClause.department_name = { [Op.like]: `%${department}%` };
    }

    if (equipment) {
      whereClause.equipment = { [Op.like]: `%${equipment}%` };
    }

    // 병원 위치 조건 (위도/경도가 있는 경우)
    let hospitalWhereClause = {};
    if (lat && lng) {
      // 대략적인 경계박스로 사전 필터링 (성능 향상)
      const latRange = parseFloat(radius) / 111; // 1도 ≈ 111km
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

    const departments = await HospitalDepartment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Hospital,
          where: hospitalWhereClause,
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude', 'hospital_type', 'bed_count']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['department_name', 'ASC']]
    });

    // 거리 계산 (위도/경도가 제공된 경우)
    let results = departments.rows;
    if (lat && lng) {
      const GeoUtils = require('../utils/GeoUtils');
      
      results = departments.rows.map(dept => {
        const distance = GeoUtils.calculateDistance(
          parseFloat(lat), parseFloat(lng),
          dept.Hospital.latitude, dept.Hospital.longitude
        );
        
        return {
          ...dept.toJSON(),
          distance: parseFloat(distance.toFixed(2))
        };
      }).filter(dept => dept.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(departments.count / limit),
        total_items: departments.count,
        items_per_page: parseInt(limit)
      },
      search_params: {
        keyword,
        department,
        equipment,
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng), radius: parseFloat(radius) } : null
      }
    });

  } catch (error) {
    console.error('Error searching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search departments',
      message: error.message
    });
  }
});

// 진료과 통계 정보
router.get('/stats', async (req, res) => {
  try {
    const { hospital_id } = req.query;

    let whereClause = {};
    if (hospital_id) {
      whereClause.hospital_id = hospital_id;
    }

    // 기본 통계
    const totalDepartments = await HospitalDepartment.count({ where: whereClause });

    // 진료과별 분포
    const departmentStats = await HospitalDepartment.findAll({
      where: whereClause,
      attributes: [
        'department_name',
        [require('sequelize').fn('COUNT', require('sequelize').col('department_name')), 'count']
      ],
      group: ['department_name'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('department_name')), 'DESC']],
      limit: 10
    });

    // 병원별 진료과 수 (간단 버전)
    let hospitalStats = null;
    if (!hospital_id) {
      hospitalStats = await HospitalDepartment.findAll({
        attributes: [
          'hospital_id',
          [require('sequelize').fn('COUNT', require('sequelize').col('HospitalDepartment.id')), 'department_count']
        ],
        group: ['hospital_id'],
        order: [[require('sequelize').fn('COUNT', require('sequelize').col('HospitalDepartment.id')), 'DESC']],
        limit: 5
      });
    }

    res.json({
      success: true,
      data: {
        total_departments: totalDepartments,
        department_distribution: departmentStats,
        hospital_distribution: hospitalStats
      }
    });

  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department statistics',
      message: error.message
    });
  }
});

module.exports = router;
