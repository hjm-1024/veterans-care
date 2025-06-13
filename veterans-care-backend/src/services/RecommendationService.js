const { Hospital } = require('../models');
const GeoUtils = require('../utils/GeoUtils');
const { Op } = require('sequelize');

class RecommendationService {
  /**
   * 사용자 맞춤형 병원 추천
   */
  static async recommendHospitals(userProfile, userLocation, preferences = {}, limit = 5) {
    try {
      const { 
        veteranType = 'NATIONAL_MERIT',
        department = null,
        maxDistance = 20
      } = userProfile;

      const { latitude, longitude } = userLocation;

      // 1단계: 기본 필터링 (거리 기반)
      const boundingBox = GeoUtils.getBoundingBox(latitude, longitude, maxDistance);
      
      let whereClause = {
        isActive: true,
        latitude: {
          [Op.between]: [boundingBox.minLat, boundingBox.maxLat]
        },
        longitude: {
          [Op.between]: [boundingBox.minLon, boundingBox.maxLon]
        }
      };

      const hospitals = await Hospital.findAll({
        where: whereClause,
        limit: limit * 3
      });

      // 2단계: 점수 계산 및 추천
      const scoredHospitals = hospitals.map(hospital => {
        const hospitalData = hospital.toJSON();
        const score = this.calculateRecommendationScore(
          hospitalData, 
          userLocation, 
          userProfile
        );

        return {
          ...hospitalData,
          score,
          distance: GeoUtils.calculateDistance(
            latitude, longitude,
            parseFloat(hospitalData.latitude),
            parseFloat(hospitalData.longitude)
          ).toFixed(2),
          recommendationReasons: this.getRecommendationReasons(
            hospitalData, 
            userProfile, 
            score
          )
        };
      });

      // 3단계: 점수순 정렬 및 상위 결과 반환
      return scoredHospitals
        .filter(hospital => parseFloat(hospital.distance) <= maxDistance)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Recommendation error:', error);
      throw new Error('Failed to generate hospital recommendations');
    }
  }

  /**
   * 병원 추천 점수 계산
   */
  static calculateRecommendationScore(hospital, userLocation, userProfile) {
    const { latitude, longitude } = userLocation;
    const { veteranType, department } = userProfile;

    // 기본 가중치
    const weights = {
      distance: 0.3,
      type: 0.2,
      size: 0.15,
      specialty: 0.25,
      rating: 0.1
    };

    let totalScore = 0;

    // 1. 거리 점수
    const distance = GeoUtils.calculateDistance(
      latitude, longitude,
      parseFloat(hospital.latitude),
      parseFloat(hospital.longitude)
    );
    const distanceScore = this.calculateDistanceScore(distance);
    totalScore += distanceScore * weights.distance;

    // 2. 병원 유형 점수
    const typeScore = this.calculateTypeScore(hospital.type, veteranType);
    totalScore += typeScore * weights.type;

    // 3. 병원 규모 점수
    const sizeScore = this.calculateSizeScore(hospital.bedCount);
    totalScore += sizeScore * weights.size;

    // 4. 전문성 점수
    const specialtyScore = this.calculateSpecialtyScore(hospital, department);
    totalScore += specialtyScore * weights.specialty;

    // 5. 평점 점수
    const ratingScore = this.calculateRatingScore(hospital.rating);
    totalScore += ratingScore * weights.rating;

    return Math.round(totalScore * 100) / 100;
  }

  static calculateDistanceScore(distance) {
    if (distance <= 2) return 100;
    if (distance <= 5) return 90;
    if (distance <= 10) return 75;
    if (distance <= 15) return 60;
    if (distance <= 20) return 45;
    return 30;
  }

  static calculateTypeScore(hospitalType, veteranType) {
    const typeMapping = {
      '상급종합병원': { base: 100, veterans: 95 },
      '종합병원': { base: 90, veterans: 90 },
      '병원': { base: 75, veterans: 85 },
      '요양병원': { base: 60, veterans: 80 },
      '의원': { base: 50, veterans: 70 }
    };

    const scores = typeMapping[hospitalType] || { base: 50, veterans: 60 };
    return veteranType ? scores.veterans : scores.base;
  }

  static calculateSizeScore(bedCount) {
    if (!bedCount) return 40;
    if (bedCount >= 500) return 100;
    if (bedCount >= 300) return 85;
    if (bedCount >= 100) return 70;
    if (bedCount >= 50) return 55;
    return 40;
  }

  static calculateSpecialtyScore(hospital, requestedDepartment) {
    if (!requestedDepartment) return 70;

    const departments = hospital.departments || '';
    const departmentCount = hospital.departmentCount || 0;

    if (departments.toLowerCase().includes(requestedDepartment.toLowerCase())) {
      return 100;
    }

    if (departmentCount >= 20) return 80;
    if (departmentCount >= 10) return 60;
    return 40;
  }

  static calculateRatingScore(rating) {
    if (!rating) return 60;
    return (rating / 5.0) * 100;
  }

  static getRecommendationReasons(hospital, userProfile, score) {
    const reasons = [];
    const distance = parseFloat(hospital.distance);

    if (distance <= 5) reasons.push('가까운 거리에 위치');
    if (hospital.type === '상급종합병원' || hospital.type === '종합병원') {
      reasons.push('종합적인 의료서비스 제공');
    }
    if (hospital.bedCount >= 200) reasons.push('대형 병원으로 다양한 진료과 보유');
    if (hospital.isVeteranFriendly) reasons.push('보훈대상자 전용 병원');
    if (score >= 80) reasons.push('높은 추천 점수');

    return reasons.slice(0, 3);
  }

  /**
   * API용 간편 메서드 - 프론트엔드 연동 최적화
   */
  static async getRecommendationsForAPI(requestData) {
    const {
      lat, lng,
      veteranType = 'NATIONAL_MERIT',
      region, district,
      symptoms = [],
      urgency = 'normal',
      department,
      limit = 5
    } = requestData;

    // 증상을 진료과로 변환
    const mappedDepartment = department || this.mapSymptomsToSpecialty(symptoms);
    
    const defaultProfile = {
      veteranType,
      department: mappedDepartment,
      maxDistance: urgency === 'urgent' ? 50 : 20,
      region,
      district
    };

    const userLocation = { 
      latitude: lat || this.getRegionCoordinates(region)?.lat || 37.5665, 
      longitude: lng || this.getRegionCoordinates(region)?.lng || 126.9780 
    };

    try {
      const recommendations = await this.recommendHospitals(defaultProfile, userLocation, {}, limit);
      
      // 프론트엔드 형식에 맞게 변환
      return recommendations.map(hospital => ({
        id: hospital.id,
        hospital_id: hospital.id,
        name: hospital.name,
        hospital_name: hospital.name,
        address: hospital.address,
        full_address: `${hospital.address} ${hospital.city || ''} ${hospital.district || ''}`.trim(),
        phone: hospital.phone,
        contact_number: hospital.phone,
        type: hospital.type,
        hospital_type: hospital.type,
        bedCount: hospital.bedCount,
        departmentCount: hospital.departmentCount,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        distance: hospital.distance,
        score: hospital.score,
        recommendationReasons: hospital.recommendationReasons,
        
        // 프론트엔드에서 기대하는 추가 필드들
        recommendation_reason: hospital.recommendationReasons ? 
          hospital.recommendationReasons.join(', ') : 
          this.generateDefaultRecommendationReason(hospital),
        
        veteran_benefits: this.generateVeteranBenefits(hospital),
        
        specialties: this.generateSpecialties(hospital, mappedDepartment),
        
        estimated_wait_time: this.getEstimatedWaitTime(hospital.type, hospital.bedCount),
        
        // 의료장비 정보 (백엔드에서 조회 가능한 경우)
        equipment: hospital.equipment || [],
        
        // 추가 메타데이터
        is_veteran_hospital: hospital.name && hospital.name.includes('보훈'),
        urgency_score: urgency === 'urgent' ? hospital.score + 10 : hospital.score,
        matched_symptoms: symptoms.filter(symptom => 
          this.checkSymptomMatch(symptom, hospital.departments))
      }));
    } catch (error) {
      console.error('API 추천 서비스 오류:', error);
      return [];
    }
  }
  
  /**
   * 증상을 진료과로 매핑
   */
  static mapSymptomsToSpecialty(symptoms) {
    const symptomMap = {
      'head': '신경외과',
      'heart': '순환기내과',
      'stomach': '소화기내과', 
      'bone': '정형외과',
      'eye': '안과',
      'ear': '이비인후과',
      'skin': '피부과',
      'mental': '정신건강의학과'
    };
    
    if (symptoms.length > 0) {
      return symptomMap[symptoms[0]] || '내과';
    }
    
    return '내과';
  }
  
  /**
   * 지역별 기본 좌표 반환
   */
  static getRegionCoordinates(region) {
    const coordinates = {
      'seoul': { lat: 37.5665, lng: 126.9780 },
      'busan': { lat: 35.1796, lng: 129.0756 },
      'daegu': { lat: 35.8714, lng: 128.6014 },
      'incheon': { lat: 37.4563, lng: 126.7052 },
      'gwangju': { lat: 35.1595, lng: 126.8526 },
      'daejeon': { lat: 36.3504, lng: 127.3845 },
      'ulsan': { lat: 35.5384, lng: 129.3114 },
      'sejong': { lat: 36.4800, lng: 127.2890 },
      'gyeonggi': { lat: 37.4138, lng: 127.5183 },
      'gangwon': { lat: 37.8228, lng: 128.1555 },
      'chungbuk': { lat: 36.8, lng: 127.7 },
      'chungnam': { lat: 36.5184, lng: 126.8000 },
      'jeonbuk': { lat: 35.7175, lng: 127.153 },
      'jeonnam': { lat: 34.8679, lng: 126.991 },
      'gyeongbuk': { lat: 36.4919, lng: 128.888 },
      'gyeongnam': { lat: 35.4606, lng: 128.2132 },
      'jeju': { lat: 33.4996, lng: 126.5312 }
    };
    
    return coordinates[region] || coordinates['seoul'];
  }
  
  /**
   * 기본 추천 이유 생성
   */
  static generateDefaultRecommendationReason(hospital) {
    const reasons = [];
    
    if (parseFloat(hospital.distance) <= 10) {
      reasons.push('가까운 거리');
    }
    
    if (hospital.type === '상급종합병원' || hospital.type === '종합병원') {
      reasons.push('종합적인 의료서비스');
    }
    
    if (hospital.bedCount >= 200) {
      reasons.push('대형 의료기관');
    }
    
    if (hospital.name && hospital.name.includes('보훈')) {
      reasons.push('보훈전문 의료기관');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : '종합적인 의료서비스 제공';
  }
  
  /**
   * 보훈 혜택 정보 생성
   */
  static generateVeteranBenefits(hospital) {
    if (hospital.name && hospital.name.includes('보훈')) {
      return '보훈병원 - 보훈대상자 의료비 100% 지원, 전문적인 보훈 의료서비스';
    }
    
    return '보훈 위탁병원 - 보훈대상자 의료비 지원 (등급별 차등), 보훈청 지정 의료기관';
  }
  
  /**
   * 전문분야 정보 생성
   */
  static generateSpecialties(hospital, requestedDepartment) {
    if (hospital.departments) {
      return hospital.departments;
    }
    
    const baseSpecialties = ['내과', '외과', '정형외과', '재활의학과'];
    
    if (requestedDepartment && !baseSpecialties.includes(requestedDepartment)) {
      baseSpecialties.unshift(requestedDepartment);
    }
    
    if (hospital.type === '상급종합병원') {
      return [...baseSpecialties, '신경외과', '흉부외과', '성형외과', '안과', '이비인후과'].join(', ');
    }
    
    if (hospital.type === '종합병원') {
      return [...baseSpecialties, '신경외과', '안과', '이비인후과'].join(', ');
    }
    
    return baseSpecialties.join(', ');
  }
  
  /**
   * 증상 매칭 확인
   */
  static checkSymptomMatch(symptom, departments) {
    if (!departments) return false;
    
    const symptomDepartmentMap = {
      'head': ['신경외과', '신경과', '내과'],
      'heart': ['순환기내과', '내과', '흉부외과'],
      'stomach': ['소화기내과', '내과', '외과'],
      'bone': ['정형외과', '재활의학과'],
      'eye': ['안과'],
      'ear': ['이비인후과'],
      'skin': ['피부과'],
      'mental': ['정신건강의학과', '신경과']
    };
    
    const relatedDepartments = symptomDepartmentMap[symptom] || [];
    return relatedDepartments.some(dept => departments.includes(dept));
  }

  /**
   * 대기시간 추정
   */
  static getEstimatedWaitTime(hospitalType, bedCount) {
    if (hospitalType === '상급종합병원') return '60-90분';
    if (hospitalType === '종합병원') return '30-60분';
    if (bedCount && bedCount > 200) return '45-75분';
    if (hospitalType === '병원') return '20-40분';
    return '15-30분';
  }
}

module.exports = RecommendationService;
