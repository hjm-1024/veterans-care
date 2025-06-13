
    // 폴백 추천 데이터 생성
    getFallbackRecommendations(params) {
        const fallbackHospitals = [
            {
                id: 1,
                name: '중앙보훈병원',
                hospital_name: '중앙보훈병원',
                type: '종합병원',
                hospital_type: '종합병원',
                address: '서울특별시 강동구 진황도로 61길 53',
                full_address: '서울특별시 강동구 진황도로 61길 53',
                phone: '02-2225-1111',
                contact_number: '02-2225-1111',
                latitude: 37.5423,
                longitude: 127.1258,
                distance: 5.2,
                score: 85.5,
                recommendation_reason: '보훈병원으로 보훈대상자 전문 진료 제공',
                veteran_benefits: '보훈대상자 의료비 100% 지원',
                specialties: '재활의학과, 정형외과, 신경외과',
                equipment: [
                    { equipment_name: 'MRI', equipment_category: '영상진단' },
                    { equipment_name: 'CT', equipment_category: '영상진단' }
                ],
                estimated_wait_time: '1-2주'
            },
            {
                id: 2,
                name: '서울대학교병원',
                hospital_name: '서울대학교병원',
                type: '상급종합병원',
                hospital_type: '상급종합병원',
                address: '서울특별시 종로구 대학로 101',
                full_address: '서울특별시 종로구 대학로 101',
                phone: '02-2072-2114',
                contact_number: '02-2072-2114',
                latitude: 37.5796,
                longitude: 126.9986,
                distance: 8.1,
                score: 78.3,
                recommendation_reason: '상급종합병원으로 고난도 치료 가능',
                veteran_benefits: '보훈대상자 의료비 지원 (등급별 차등)',
                specialties: '모든 진료과',
                estimated_wait_time: '2-3주'
            },
            {
                id: 3,
                name: '강남세브란스병원',
                hospital_name: '강남세브란스병원',
                type: '상급종합병원',
                hospital_type: '상급종합병원',
                address: '서울특별시 강남구 언주로 211',
                full_address: '서울특별시 강남구 언주로 211',
                phone: '02-2019-3000',
                contact_number: '02-2019-3000',
                latitude: 37.5193,
                longitude: 127.0378,
                distance: 12.5,
                score: 75.8,
                recommendation_reason: '첨단 의료시설을 갖춘 종합병원',
                veteran_benefits: '보훈대상자 의료비 지원',
                specialties: '심장외과, 암센터, 로봇수술',
                estimated_wait_time: '1-2주'
            }
        ];

        // 사용자 조건에 따라 필터링/정렬
        let filtered = fallbackHospitals;
        
        if (params.department) {
            // 진료과에 따른 가중치 조정 (실제로는 모든 병원 반환)
            filtered = fallbackHospitals.map(hospital => ({
                ...hospital,
                score: hospital.score + (hospital.name.includes('보훈') ? 10 : 0)
            }));
        }

        return filtered.sort((a, b) => b.score - a.score).slice(0, params.limit || 5);
    }                            services: stats.comprehensive_data?.medical_services || 0,
                            costs: stats.comprehensive_data?.non_covered_services || 0,
                            benefits: stats.comprehensive_data?.benefit_hospitals || 0,
                            equipment: stats.comprehensive_data?.equipment || 0,
                            diseases: stats.comprehensive_data?.disease_statistics || 0,
                            total: stats.comprehensive_data?.total_data_count || stats.totalHospitals
                        }
                    }
                };
            }

            return data;
        } catch (error) {
            console.error('병원 통계 정보 호출 오류:', error);
            
            // 폴백 데이터 제공
            return {
                success: true,
                data: {
                    totalHospitals: 898,
                    totalBeds: 0,
                    hospitalsByType: [],
                    topCities: [],
                    comprehensiveData: {
                        total_data_count: 23252,
                        medical_services: 792,
                        equipment: 37,
                        non_covered_services: 5483,
                        disease_statistics: 15731,
                        benefit_hospitals: 311
                    },
                    summary: {
                        hospitals: 898,
                        services: 792,
                        costs: 5483,
                        benefits: 311,
                        equipment: 37,
                        diseases: 15731,
                        total: 23252
                    }
                },
                fallback: true
            };
        }
    }// 향상된 API 연동 설정 - 23,252개 데이터 완전 활용
const API_BASE_URL = 'http://localhost:5001/api';

// API 클래스 - 백엔드와의 모든 통신을 담당
class VeteransCareAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // 기본 fetch 메소드
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API 요청 오류:', error);
            throw error;
        }
    }

    // 서버 상태 확인
    async checkServerHealth() {
        try {
            const response = await fetch('http://localhost:5001/health');
            return response.ok;
        } catch (error) {
            console.error('서버 연결 실패:', error);
            return false;
        }
    }

    // ============== 기본 병원 API ==============

    // 전체 병원 목록 조회
    async getHospitals(page = 1, limit = 20) {
        return this.request(`/hospitals?page=${page}&limit=${limit}`);
    }

    // 병원 검색
    async searchHospitals(params) {
        const queryParams = new URLSearchParams();
        
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.region) queryParams.append('region', params.region);
        if (params.district) queryParams.append('district', params.district);
        if (params.veteranType) queryParams.append('veteranType', params.veteranType);
        
        return this.request(`/hospitals/search?${queryParams.toString()}`);
    }

    // 주변 병원 찾기
    async getNearbyHospitals(lat, lng, radius = 10) {
        return this.request(`/hospitals/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    }

    // AI 병원 추천
    async getHospitalRecommendation(recommendationData) {
        return this.request('/hospitals/recommend', {
            method: 'POST',
            body: JSON.stringify(recommendationData)
        });
    }

    // 병원 통계 정보
    async getHospitalStats() {
        return this.request('/hospitals/stats/overview');
    }

    // ============== 향상된 병원 상세 정보 API ==============

    // 병원 상세 정보 (기본 정보 + 거리 계산)
    async getHospitalDetail(hospitalId, userLat = null, userLng = null, department = null) {
        let queryParams = '';
        if (userLat && userLng) {
            queryParams = `?lat=${userLat}&lng=${userLng}`;
            if (department) queryParams += `&department=${department}`;
        }
        return this.request(`/hospitals/${hospitalId}${queryParams}`);
    }

    // 병원별 진료 서비스 정보 (792개 데이터)
    async getHospitalMedicalServices(hospitalId) {
        return this.request(`/hospitals/${hospitalId}/medical-services`);
    }

    // 병원별 의료장비 정보 (37개 데이터)
    async getHospitalEquipment(hospitalId) {
        return this.request(`/hospitals/${hospitalId}/equipment`);
    }

    // 병원별 비급여 서비스 정보 (5,483개 데이터)
    async getHospitalNonCoveredServices(hospitalId) {
        return this.request(`/hospitals/${hospitalId}/non-covered-services`);
    }

    // 병원별 질병통계 정보 (15,731개 데이터)
    async getHospitalDiseaseStatistics(hospitalId) {
        return this.request(`/hospitals/${hospitalId}/disease-statistics`);
    }

    // 병원별 보훈 혜택 정보 (311개 혜택 병원)
    async getHospitalBenefits(hospitalId) {
        return this.request(`/hospitals/${hospitalId}/benefits`);
    }

    // ============== 고급 검색 API ==============

    // 장비 기반 병원 검색
    async searchHospitalsByEquipment(params) {
        const queryParams = new URLSearchParams();
        
        if (params.equipment_type) queryParams.append('equipment_type', params.equipment_type);
        if (params.equipment_category) queryParams.append('equipment_category', params.equipment_category);
        if (params.user_lat) queryParams.append('user_lat', params.user_lat);
        if (params.user_lng) queryParams.append('user_lng', params.user_lng);
        if (params.radius) queryParams.append('radius', params.radius);
        
        return this.request(`/hospitals/search/by-equipment?${queryParams.toString()}`);
    }

    // 질병별 전문 병원 검색
    async searchHospitalsByDisease(params) {
        const queryParams = new URLSearchParams();
        
        if (params.disease_category) queryParams.append('disease_category', params.disease_category);
        if (params.disease_name) queryParams.append('disease_name', params.disease_name);
        if (params.user_lat) queryParams.append('user_lat', params.user_lat);
        if (params.user_lng) queryParams.append('user_lng', params.user_lng);
        if (params.radius) queryParams.append('radius', params.radius);
        
        return this.request(`/hospitals/search/by-disease?${queryParams.toString()}`);
    }

    // 혜택 기반 병원 검색
    async searchHospitalsByBenefits(params) {
        const queryParams = new URLSearchParams();
        
        if (params.benefit_type) queryParams.append('benefit_type', params.benefit_type);
        if (params.discount_rate) queryParams.append('discount_rate', params.discount_rate);
        if (params.user_lat) queryParams.append('user_lat', params.user_lat);
        if (params.user_lng) queryParams.append('user_lng', params.user_lng);
        if (params.radius) queryParams.append('radius', params.radius);
        
        return this.request(`/hospitals/search/by-benefits?${queryParams.toString()}`);
    }

    // 비급여 가격 비교
    async compareNonCoveredCosts(params) {
        const queryParams = new URLSearchParams();
        
        if (params.service_name) queryParams.append('service_name', params.service_name);
        if (params.service_category) queryParams.append('service_category', params.service_category);
        if (params.hospital_names) queryParams.append('hospital_names', params.hospital_names);
        
        return this.request(`/hospitals/compare/non-covered-costs?${queryParams.toString()}`);
    }

    // 종합 대시보드 데이터
    async getComprehensiveStats() {
        return this.request('/hospitals/dashboard/comprehensive-stats');
    }

    // ============== 편의 기능 API ==============

    // 지역별 시/군/구 정보
    async getRegionData() {
        try {
            return this.request('/regions');
        } catch (error) {
            // 백엔드에서 지역 데이터를 제공하지 않는 경우 로컬 데이터 사용
            return this.getLocalRegionData();
        }
    }

    // 로컬 지역 데이터 (백업용)
    getLocalRegionData() {
        return {
            seoul: ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
            busan: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
            daegu: ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
            incheon: ['강화군', '계양구', '미추홀구', '남동구', '동구', '부평구', '서구', '연수구', '옹진군', '중구'],
            gwangju: ['광산구', '남구', '동구', '북구', '서구'],
            daejeon: ['대덕구', '동구', '서구', '유성구', '중구'],
            ulsan: ['남구', '동구', '북구', '울주군', '중구'],
            sejong: ['세종시'],
            gyeonggi: ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
            gangwon: ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
            chungbuk: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '진천군', '청주시', '충주시', '증평군'],
            chungnam: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
            jeonbuk: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
            jeonnam: ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
            gyeongbuk: ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
            gyeongnam: ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
            jeju: ['서귀포시', '제주시']
        };
    }

    // 사용자 위치 가져오기
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('위치 서비스가 지원되지 않습니다.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('위치 정보를 가져올 수 없습니다:', error);
                    // 서울시청을 기본 위치로 설정
                    resolve({
                        latitude: 37.5665,
                        longitude: 126.9780
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 600000 // 10분
                }
            );
        });
    }

    // ============== 고급 기능 래퍼 함수들 ==============

    // 병원 상세 정보 통합 로드 (모든 관련 데이터)
    async loadCompleteHospitalData(hospitalId, userLocation = null, department = null) {
        try {
            const userLat = userLocation?.latitude;
            const userLng = userLocation?.longitude;

            // 기본 정보와 추가 정보를 병렬로 로드
            const [
                basicInfo,
                medicalServices,
                equipment,
                nonCoveredServices,
                diseaseStatistics,
                benefits
            ] = await Promise.allSettled([
                this.getHospitalDetail(hospitalId, userLat, userLng, department),
                this.getHospitalMedicalServices(hospitalId),
                this.getHospitalEquipment(hospitalId),
                this.getHospitalNonCoveredServices(hospitalId),
                this.getHospitalDiseaseStatistics(hospitalId),
                this.getHospitalBenefits(hospitalId)
            ]);

            // 결과 통합
            const result = {
                success: true,
                hospital: basicInfo.status === 'fulfilled' ? basicInfo.value.hospital : {},
                medical_services: medicalServices.status === 'fulfilled' ? medicalServices.value.medical_services : [],
                equipment: equipment.status === 'fulfilled' ? equipment.value.equipment : [],
                non_covered_services: nonCoveredServices.status === 'fulfilled' ? nonCoveredServices.value.non_covered_services : [],
                disease_statistics: diseaseStatistics.status === 'fulfilled' ? diseaseStatistics.value.disease_statistics : [],
                benefits: benefits.status === 'fulfilled' ? benefits.value.benefits : null,
                data_counts: {
                    medical_services: medicalServices.status === 'fulfilled' ? medicalServices.value.count : 0,
                    equipment: equipment.status === 'fulfilled' ? equipment.value.count : 0,
                    non_covered_services: nonCoveredServices.status === 'fulfilled' ? nonCoveredServices.value.count : 0,
                    disease_statistics: diseaseStatistics.status === 'fulfilled' ? diseaseStatistics.value.count : 0
                }
            };

            return result;

        } catch (error) {
            console.error('Complete hospital data loading failed:', error);
            throw error;
        }
    }

    // 고급 검색 통합 함수
    async advancedHospitalSearch(searchParams) {
        const { type, ...params } = searchParams;

        switch (type) {
            case 'equipment':
                return this.searchHospitalsByEquipment(params);
            case 'disease':
                return this.searchHospitalsByDisease(params);
            case 'benefits':
                return this.searchHospitalsByBenefits(params);
            default:
                return this.searchHospitals(params);
        }
    }

    // 의료비 절약 계산기
    async calculateMedicalCostSavings(hospitalId, veteranType, services = []) {
        try {
            const nonCoveredData = await this.getHospitalNonCoveredServices(hospitalId);
            const benefitsData = await this.getHospitalBenefits(hospitalId);

            if (!nonCoveredData.success) {
                return { savings: 0, message: '비급여 정보가 없습니다.' };
            }

            // 보훈대상자 유형별 기본 할인율
            const baseDiscountRates = {
                'veteran': 0.9,      // 국가유공자 90% 지원
                'disabled': 1.0,     // 상이군경 100% 지원
                'bereaved': 0.8,     // 유족 80% 지원
                '5-18': 0.9,         // 5·18민주유공자 90% 지원
                'special': 0.85,     // 특수임무유공자 85% 지원
                'independence': 0.95 // 독립유공자 95% 지원
            };

            const discountRate = baseDiscountRates[veteranType] || 0.8;
            
            // 추가 혜택 할인율
            let additionalDiscount = 0;
            if (benefitsData.success && benefitsData.benefits) {
                const benefitDiscountStr = benefitsData.benefits.discount_rate || '0%';
                additionalDiscount = parseInt(benefitDiscountStr) / 100;
            }

            // 총 할인율 계산 (최대 100%)
            const totalDiscountRate = Math.min(1.0, discountRate + additionalDiscount);

            return {
                base_discount: discountRate,
                additional_discount: additionalDiscount,
                total_discount: totalDiscountRate,
                estimated_savings_percentage: Math.round(totalDiscountRate * 100),
                message: `최대 ${Math.round(totalDiscountRate * 100)}% 의료비 할인 가능`
            };

        } catch (error) {
            console.error('Medical cost savings calculation failed:', error);
            return { savings: 0, message: '할인율 계산 중 오류가 발생했습니다.' };
        }
    }
}

// 전역 API 인스턴스 생성
const veteransCareAPI = new VeteransCareAPI();

// ============== 연결 상태 관리 ==============

// 연결 상태 체크 및 사용자 피드백
async function checkAPIConnection() {
    const isConnected = await veteransCareAPI.checkServerHealth();
    
    if (!isConnected) {
        showConnectionError();
        return false;
    }
    
    hideConnectionError();
    return true;
}

// 연결 오류 표시
function showConnectionError() {
    const existingError = document.querySelector('.connection-error');
    if (existingError) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            padding: 12px;
            text-align: center;
            z-index: 9999;
            font-weight: 500;
        ">
            <i class="fas fa-exclamation-triangle"></i>
            서버에 연결할 수 없습니다. 백엔드 서버(localhost:5001)를 확인해주세요.
            <button onclick="retryConnection()" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid white;
                color: white;
                padding: 4px 12px;
                margin-left: 12px;
                border-radius: 4px;
                cursor: pointer;
            ">다시 시도</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

// 연결 오류 숨기기
function hideConnectionError() {
    const errorDiv = document.querySelector('.connection-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// 연결 재시도
async function retryConnection() {
    const isConnected = await checkAPIConnection();
    if (isConnected) {
        showSuccessMessage('서버 연결이 복구되었습니다!');
    }
}

// 성공 메시지 표시
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #27ae60;
            color: white;
            padding: 12px;
            text-align: center;
            z-index: 9999;
            font-weight: 500;
        ">
            <i class="fas fa-check-circle"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

// ============== 초기화 및 전역 설정 ==============

// 페이지 로드 시 서버 연결 확인
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkAPIConnection, 1000);
    
    // 5분마다 연결 상태 확인
    setInterval(checkAPIConnection, 300000);
});

// 전역으로 내보내기 (기존 script.js에서 사용할 수 있도록)
window.veteransCareAPI = veteransCareAPI;
window.checkAPIConnection = checkAPIConnection;
window.showSuccessMessage = showSuccessMessage;