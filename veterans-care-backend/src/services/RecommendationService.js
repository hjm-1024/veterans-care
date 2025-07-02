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
   * API용 간편 메서드 - 프론트엔드 연동 최적화 (보훈병원 우선 추천)
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
      maxDistance: urgency === 'urgent' ? 50 : 30, // 보훈병원 검색을 위해 반경 확장
      region,
      district
    };

    const userLocation = { 
      latitude: lat || this.getRegionCoordinates(region)?.lat || 37.5665, 
      longitude: lng || this.getRegionCoordinates(region)?.lng || 126.9780 
    };

    try {
      // 🔥 1단계: 보훈병원 우선 추천 로직
      const veteranHospitalRecommendation = await this.getVeteranHospitalRecommendation(
        userLocation, mappedDepartment
      );
      
      // 🔥 2단계: 일반 병원 추천 (보훈병원 제외)
      const generalRecommendations = await this.recommendHospitals(
        defaultProfile, 
        userLocation, 
        {}, 
        limit + 5 // 여유분 확보
      );

      // 🔥 3단계: 보훈병원과 일반병원 통합
      let finalRecommendations = [];
      
      // 보훈병원을 맨 앞에 배치 (있는 경우)
      if (veteranHospitalRecommendation) {
        finalRecommendations.push(veteranHospitalRecommendation);
      }
      
      // 일반 병원들 추가 (보훈병원 제외)
      const filteredGeneralRecommendations = generalRecommendations
        .filter(hospital => !this.isVeteranHospital(hospital.name))
        .slice(0, limit - (veteranHospitalRecommendation ? 1 : 0));
      
      finalRecommendations.push(...filteredGeneralRecommendations);
      
      // 프론트엔드 형식에 맞게 변환
      return finalRecommendations.map(hospital => ({
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
        
        // 🔥 보훈병원 우선 추천 메타데이터
        is_veteran_hospital: this.isVeteranHospital(hospital.name),
        is_priority_recommendation: hospital.is_priority_recommendation || false,
        veteran_hospital_type: this.getVeteranHospitalType(hospital.name),
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

  /**
   * 🔥 보훈병원 우선 추천 핵심 메서드
   */
  static async getVeteranHospitalRecommendation(userLocation, department = null) {
    try {
      // 6개 보훈병원 좌표 (실제 데이터)
      const veteranHospitals = [
        {
          id: 'veteran_central',
          name: '중앙보훈병원',
          address: '서울특별시 강동구 진황도로 61길 53',
          phone: '02-2225-1114',
          type: '종합병원',
          latitude: 37.5547,
          longitude: 127.1236,
          bedCount: 866,
          departmentCount: 39,
          departments: '39개 진료과 운영 - 내과, 외과, 정형외과, 재활의학과, 신경외과, 흉부외과, 순환기내과, 소화기내과 등',
          equipment: ['MRI', 'CT', '내시경', '초음파', 'X-RAY'],
          veteran_services: {
            medical_coverage: '100%',
            specialized_care: '보훈대상자 전문 진료',
            rehabilitation: '재활치료 특화',
            psychology: '정신건강 지원'
          }
        },
        {
          id: 'veteran_daejeon',
          name: '대전보훈병원',
          address: '대전광역시 대덕구 대청로 82번길 28',
          phone: '042-939-0114',
          type: '종합병원',
          latitude: 36.3663,
          longitude: 127.4164,
          bedCount: 558,
          departmentCount: 32,
          departments: '32개 진료과 운영 - 내과, 외과, 정형외과, 재활의학과, 신경과, 정신건강의학과 등',
          equipment: ['MRI', 'CT', '내시경', '초음파'],
          veteran_services: {
            medical_coverage: '100%',
            specialized_care: '보훈대상자 전문 진료',
            rehabilitation: '재활치료 특화'
          }
        },
        {
          id: 'veteran_busan',
          name: '부산보훈병원',
          address: '부산광역시 동구 범일로 114',
          phone: '051-601-6000',
          type: '종합병원',
          latitude: 35.1372,
          longitude: 129.0564,
          bedCount: 562,
          departmentCount: 31,
          departments: '31개 진료과 운영 - 내과, 외과, 정형외과, 재활의학과, 신경외과 등',
          equipment: ['MRI', 'CT', '내시경'],
          veteran_services: {
            medical_coverage: '100%',
            specialized_care: '보훈대상자 전문 진료'
          }
        },
        {
          id: 'veteran_gwangju',
          name: '광주보훈병원',
          address: '광주광역시 광산구 첨단과기로 205',
          phone: '062-602-6114',
          type: '종합병원',
          latitude: 35.2281,
          longitude: 126.8442,
          bedCount: 538,
          departmentCount: 30,
          departments: '30개 진료과 운영 - 내과, 외과, 정형외과, 재활의학과 등',
          equipment: ['MRI', 'CT', '초음파'],
          veteran_services: {
            medical_coverage: '100%',
            specialized_care: '보훈대상자 전문 진료'
          }
        },
        {
          id: 'veteran_daegu',
          name: '대구보훈병원',
          address: '대구광역시 동구 팔공로 99',
          phone: '053-940-1114',
          type: '종합병원',
          latitude: 35.9078,
          longitude: 128.6411,
          bedCount: 425,
          departmentCount: 28,
          departments: '28개 진료과 운영 - 내과, 외과, 정형외과, 재활의학과 등',
          equipment: ['CT', '내시경', '초음파'],
          veteran_services: {
            medical_coverage: '100%',
            specialized_care: '보훈대상자 전문 진료'
          }
        },
        {
          id: 'veteran_incheon',
          name: '인천보훈병원',
          address: '인천광역시 동구 방축로 505',
          phone: '032-899-1000',
          type: '종합병원',
          latitude: 37.4851,
          longitude: 126.6439,
          bedCount: 396,
          departmentCount: 26,
          departments: '26개 진료과 운영 - 내과, 외과, 정형외과, 재활의학과 등',
          equipment: ['CT', '초음파'],
          veteran_services: {
            medical_coverage: '100%',
            specialized_care: '보훈대상자 전문 진료'
          }
        }
      ];

      // 가장 가까운 보훈병원 찾기
      let nearestVeteranHospital = null;
      let minDistance = Infinity;

      veteranHospitals.forEach(hospital => {
        const distance = GeoUtils.calculateDistance(
          userLocation.latitude, userLocation.longitude,
          hospital.latitude, hospital.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestVeteranHospital = hospital;
        }
      });

      if (!nearestVeteranHospital) return null;

      // 보훈병원 추천 객체 생성
      const veteranRecommendation = {
        ...nearestVeteranHospital,
        distance: minDistance.toFixed(1),
        score: 95, // 보훈병원은 항상 높은 우선 점수
        recommendationReasons: [
          '🏥 가장 가까운 보훈병원',
          '💰 보훈대상자 의료비 100% 지원',
          '👨‍⚕️ 보훈 전문 의료진 진료',
          '🎯 보훈대상자 맞춤형 의료서비스'
        ],
        recommendation_reason: `가장 가까운 보훈병원 (${minDistance.toFixed(1)}km) - 보훈대상자 전문 진료 및 의료비 100% 지원`,
        veteran_benefits: '🎖️ 보훈대상자 의료비 100% 지원\n🏥 보훈 전문 의료진 진료\n🔧 보훈대상자 맞춤형 의료서비스\n📋 원스톱 의료서비스',
        is_veteran_hospital: true,
        is_priority_recommendation: true,
        veteran_hospital_type: '국립보훈병원',
        priority_badge: '보훈병원 우선 추천',
        specialties: nearestVeteranHospital.departments,
        estimated_wait_time: this.getEstimatedWaitTime(nearestVeteranHospital.type, nearestVeteranHospital.bedCount),
        equipment: nearestVeteranHospital.equipment || [],
        full_address: nearestVeteranHospital.address,
        contact_number: nearestVeteranHospital.phone,
        hospital_name: nearestVeteranHospital.name,
        hospital_type: nearestVeteranHospital.type,
        urgency_score: 100 // 최고 우선순위
      };

      return veteranRecommendation;
    } catch (error) {
      console.error('보훈병원 추천 오류:', error);
      return null;
    }
  }

  /**
   * 보훈병원 여부 확인
   */
  static isVeteranHospital(hospitalName) {
    if (!hospitalName) return false;
    
    const veteranHospitalNames = [
      '중앙보훈병원', '대전보훈병원', '부산보훈병원',
      '광주보훈병원', '대구보훈병원', '인천보훈병원'
    ];
    
    return veteranHospitalNames.some(name => hospitalName.includes(name.replace('보훈병원', ''))) ||
           hospitalName.includes('보훈');
  }

  /**
   * 보훈병원 유형 반환
   */
  static getVeteranHospitalType(hospitalName) {
    if (!hospitalName) return null;
    
    if (this.isVeteranHospital(hospitalName)) {
      if (hospitalName.includes('중앙') || hospitalName.includes('대전') || 
          hospitalName.includes('부산') || hospitalName.includes('광주') ||
          hospitalName.includes('대구') || hospitalName.includes('인천')) {
        return '국립보훈병원';
      }
      return '보훈 위탁병원';
    }
    
    return null;
  }
}

module.exports = RecommendationService;
