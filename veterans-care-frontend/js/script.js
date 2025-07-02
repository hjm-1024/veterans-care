// ==============================================
// 보훈케어 내비게이터 - 메인 스크립트
// ==============================================

// 전역 변수 설정
window.API_BASE_URL = 'http://localhost:5001';
let currentStep = 1;
let selectedSymptoms = [];
let formData = {};
let regionData = {};
let userLocation = null;
let hospitalStats = null;

// 진료과목과 증상 매핑
const symptomToDepartmentMap = {
    head: '신경외과',
    heart: '순환기내과', 
    stomach: '소화기내과',
    bone: '정형외과',
    eye: '안과',
    ear: '이비인후과', 
    skin: '피부과',
    mental: '정신건강의학과'
};

// 샘플 병원 데이터 (오프라인 모드용)
const sampleHospitals = [
    {
        name: "중앙보훈병원",
        address: "서울특별시 강동구 진황도로 61길 53",
        phone: "02-2225-1234",
        distance: "2.3km",
        waitTime: "30분",
        specialty: "내과, 외과, 정형외과, 재활의학과",
        benefits: "보훈병원 - 보훈대상자 의료비 100% 지원"
    },
    {
        name: "서울성모병원",
        address: "서울특별시 서초구 반포대로 222",
        phone: "02-2258-5000",
        distance: "5.7km",
        waitTime: "45분",
        specialty: "내과, 순환기내과, 신경외과",
        benefits: "보훈 위탁병원 - 의료비 90% 지원"
    },
    {
        name: "부산보훈병원",
        address: "부산광역시 남구 유엔평화로 58",
        phone: "051-601-6000",
        distance: "1.8km",
        waitTime: "20분",
        specialty: "내과, 외과, 정형외과, 재활의학과",
        benefits: "보훈병원 - 보훈대상자 의료비 100% 지원"
    }
];

// ==============================================
// 데이터 초기화 및 설정
// ==============================================

// 데이터 초기화 함수
async function initializeData() {
    try {
        // 지역 데이터 설정
        regionData = {
            'seoul': ['강남구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
            'busan': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
            'daegu': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
            'incheon': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
            'gwangju': ['광산구', '남구', '동구', '북구', '서구'],
            'daejeon': ['대덕구', '동구', '서구', '유성구', '중구'],
            'ulsan': ['남구', '동구', '북구', '울주군', '중구'],
            'sejong': ['세종특별자치시'],
            'gyeonggi': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
            'gangwon': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
            'chungbuk': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '진천군', '청주시', '충주시', '증평군'],
            'chungnam': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
            'jeonbuk': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
            'jeonnam': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
            'gyeongbuk': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
            'gyeongnam': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
            'jeju': ['서귀포시', '제주시']
        };
        
        // API 연결 상태 확인
        await checkAPIConnection();
        
        // 병원 통계 데이터 로드
        await loadHospitalStats();
        
        // 사용자 위치 정보 요청 (자동)
        await getUserLocationWithConsent();
        
        console.log('데이터 초기화 완료');
        
    } catch (error) {
        console.error('데이터 초기화 오류:', error);
        handleError(error, '데이터 로딩 중 오류가 발생했습니다.');
    }
}

// API 연결 상태 확인
async function checkAPIConnection() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/health`);
        if (response.ok) {
            console.log('백엔드 서버 연결 성공');
            return true;
        }
    } catch (error) {
        console.warn('백엔드 서버 연결 실패:', error);
        return false;
    }
}

// 병원 통계 데이터 로드
async function loadHospitalStats() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/hospitals/stats/overview`);
        if (response.ok) {
            const stats = await response.json();
            const heroSubtitle = document.querySelector('.hero-subtitle');
            if (heroSubtitle && stats && stats.total_hospitals) {
                heroSubtitle.innerHTML = `
                    전국 <strong>${stats.total_hospitals}개</strong> 의료기관과 연결된<br>
                    보훈대상자 맞춤 의료서비스를 제공합니다.
                `;
            }
            hospitalStats = stats;
            console.log('병원 통계 데이터 로드 완료:', stats);
        }
    } catch (error) {
        console.warn('병원 통계 데이터 로드 실패:', error);
        // 실패 시 기본 값 사용
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) {
            heroSubtitle.innerHTML = `
                전국 <strong>1,200+개</strong> 의료기관과 연결된<br>
                보훈대상자 맞춤 의료서비스를 제공합니다.
            `;
        }
    }
}

// ==============================================
// 이벤트 리스너 및 초기화
// ==============================================

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', async function() {
    initializeEventListeners();
    setupVoiceGuide();
    await initializeData();
    
    // 접근성 기능 초기화
    enhanceFocusVisibility();
    setupHighContrastMode();
    setupReducedMotion();
    setupLargeTextMode();
    setupTouchSupport();
    
    // 음성 API 준비
    if ('speechSynthesis' in window) {
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                console.log('음성 API 준비 완료');
            } else {
                setTimeout(loadVoices, 100);
            }
        };
        
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        } else {
            loadVoices();
        }
    }
    
    // 페이지 로드 완료 알림
    setTimeout(() => {
        announceToScreenReader('보훈대상자 병원 추천 서비스 페이지가 로드되었습니다. 지금 병원 찾기 버튼을 눌러 시작하세요.');
    }, 1000);
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 병원 찾기 시작 버튼
    const startButton = document.getElementById('startMatching');
    if (startButton) {
        startButton.addEventListener('click', startMatching);
    }

    // 지역 선택 변경 이벤트
    const regionSelect = document.getElementById('region');
    if (regionSelect) {
        regionSelect.addEventListener('change', updateDistrictOptions);
    }

    // 증상 카드 클릭 이벤트
    const symptomCards = document.querySelectorAll('.symptom-card');
    symptomCards.forEach(card => {
        card.addEventListener('click', toggleSymptom);
    });

    // 음성 안내 버튼
    const voiceButton = document.getElementById('voiceGuide');
    if (voiceButton) {
        voiceButton.addEventListener('click', toggleVoiceGuide);
    }

    // 키보드 접근성
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// ==============================================
// 병원 매칭 프로세스
// ==============================================

// 병원 찾기 시작
function startMatching() {
    const matchingForm = document.getElementById('matchingForm');
    if (matchingForm) {
        matchingForm.style.display = 'block';
        matchingForm.scrollIntoView({ behavior: 'smooth' });
        
        // 첫 번째 입력 필드에 포커스
        const firstInput = matchingForm.querySelector('select, input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 500);
        }
        
        announceToScreenReader('병원 매칭 폼이 표시되었습니다. 보훈 대상자 정보를 입력해주세요.');
    }
}

// 다음 단계로 이동
function nextStep(stepNumber) {
    if (validateCurrentStep()) {
        hideCurrentStep();
        showStep(stepNumber);
        updateStepIndicator(stepNumber);
        currentStep = stepNumber;
        
        // 새 단계의 첫 번째 입력 필드에 포커스
        const newStep = document.querySelector(`[data-step="${stepNumber}"]`);
        const firstInput = newStep.querySelector('select, input, .symptom-card');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 300);
        }
        
        announceToScreenReader(`${stepNumber}단계로 이동했습니다.`);
    }
}

// 이전 단계로 이동
function prevStep(stepNumber) {
    hideCurrentStep();
    showStep(stepNumber);
    updateStepIndicator(stepNumber);
    currentStep = stepNumber;
    
    announceToScreenReader(`${stepNumber}단계로 돌아갔습니다.`);
}

// 현재 단계 숨기기
function hideCurrentStep() {
    const currentStepElement = document.querySelector('.form-step.active');
    if (currentStepElement) {
        currentStepElement.classList.remove('active');
    }
}

// 특정 단계 보이기
function showStep(stepNumber) {
    const stepElement = document.querySelector(`[data-step="${stepNumber}"].form-step`);
    if (stepElement) {
        stepElement.classList.add('active');
    }
}

// 단계 표시기 업데이트
function updateStepIndicator(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    const currentIndicator = document.querySelector(`[data-step="${stepNumber}"].step`);
    if (currentIndicator) {
        currentIndicator.classList.add('active');
    }
}

// 현재 단계 유효성 검사
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            const veteranType = document.getElementById('veteranType').value;
            if (!veteranType) {
                alert('보훈대상 종류를 선택해주세요.');
                return false;
            }
            formData.veteranType = veteranType;
            formData.disabilityGrade = document.getElementById('disabilityGrade').value;
            break;
            
        case 2:
            const region = document.getElementById('region').value;
            const district = document.getElementById('district').value;
            if (!region || !district) {
                alert('거주지역을 모두 선택해주세요.');
                return false;
            }
            formData.region = region;
            formData.district = district;
            break;
            
        case 3:
            if (selectedSymptoms.length === 0) {
                alert('증상을 하나 이상 선택해주세요.');
                return false;
            }
            const urgency = document.querySelector('input[name="urgency"]:checked');
            if (!urgency) {
                alert('응급도를 선택해주세요.');
                return false;
            }
            formData.symptoms = selectedSymptoms;
            formData.urgency = urgency.value;
            break;
    }
    return true;
}

// ==============================================
// 폼 처리 함수들
// ==============================================

// 지역별 시/군/구 옵션 업데이트
function updateDistrictOptions() {
    const regionSelect = document.getElementById('region');
    const districtSelect = document.getElementById('district');
    const selectedRegion = regionSelect.value;
    
    // 기존 옵션 제거
    districtSelect.innerHTML = '<option value="">선택해주세요</option>';
    
    if (selectedRegion && regionData[selectedRegion]) {
        regionData[selectedRegion].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
        districtSelect.disabled = false;
    } else {
        districtSelect.disabled = true;
    }
}

// 증상 선택/해제
function toggleSymptom(event) {
    const card = event.currentTarget;
    const symptomValue = card.dataset.value;
    
    if (card.classList.contains('selected')) {
        // 선택 해제
        card.classList.remove('selected');
        selectedSymptoms = selectedSymptoms.filter(s => s !== symptomValue);
        announceToScreenReader(`${card.querySelector('span').textContent} 선택이 해제되었습니다.`);
    } else {
        // 선택
        card.classList.add('selected');
        selectedSymptoms.push(symptomValue);
        announceToScreenReader(`${card.querySelector('span').textContent}이 선택되었습니다.`);
    }
    
    // 숨겨진 입력 필드 업데이트
    document.getElementById('selectedSymptoms').value = selectedSymptoms.join(',');
}

// ==============================================
// 병원 추천 시스템
// ==============================================

// 추천 결과 표시
function showRecommendation() {
    if (validateCurrentStep()) {
        hideCurrentStep();
        showStep(4);
        updateStepIndicator(4);
        currentStep = 4;
        
        generateRecommendation();
        announceToScreenReader('병원 추천 결과를 생성했습니다.');
    }
}

// 추천 결과 생성 - 실제 백엔드 API 호출
async function generateRecommendation() {
    const resultsContainer = document.getElementById('recommendationResults');
    
    // 로딩 표시
    resultsContainer.innerHTML = `
        <div class="loading-container" style="text-align: center; padding: 40px;">
            <div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #2c5aa0; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p style="font-size: 18px; color: #666;">23,252개 데이터에서 맞춤 병원을 찾고 있습니다...</p>
            <p style="font-size: 14px; color: #999; margin-top: 10px;">보훈대상자 맞춤형 AI 추천 알고리즘 실행 중...</p>
        </div>
    `;
    
    try {
        // 실제 백엔드 API 호출
        const recommendations = await getAIRecommendations();
        
        if (recommendations && recommendations.length > 0) {
            // 향상된 추천 결과 표시
            if (window.displayEnhancedRecommendations) {
                window.displayEnhancedRecommendations(recommendations);
            } else {
                displayBasicRecommendations(recommendations);
            }
        } else {
            // 추천 결과가 없을 경우
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; color: #ddd;"></i>
                    <h4>조건에 맞는 병원을 찾을 수 없습니다</h4>
                    <p>검색 조건을 변경하여 다시 시도해주세요.</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('병원 추천 API 호출 실패:', error);
        // 에러 시 폴백으로 샘플 데이터 표시
        displayFallbackResults();
    }
}

// 실제 AI 추천 API 호출 - 위치 기반 보훈병원 우선 추천
async function getAIRecommendations() {
    try {
        const requestData = {
            veteranType: formData.veteranType || 'NATIONAL_MERIT',
            disabilityGrade: formData.disabilityGrade,
            region: formData.region,
            district: formData.district,
            symptoms: formData.symptoms || selectedSymptoms,
            department: formData.department || symptomToDepartmentMap[selectedSymptoms[0]] || null,
            urgency: formData.urgency || 'normal',
            limit: 5
        };
        
        console.log('📍 위치 기반 AI 추천 요청:', requestData);
        
        // 위치 기반 추천 API 사용 (api.js의 강화된 함수)
        const recommendations = await veteransCareAPI.getLocationBasedRecommendations(requestData);
        
        if (recommendations && recommendations.length > 0) {
            console.log('✅ 위치 기반 AI 추천 결과:', recommendations);
            return recommendations;
        }
        
        // 폴백: 기존 API 방식
        console.log('🔄 기존 API 방식으로 폴백');
        
        const fallbackData = {
            ...requestData,
            prioritizeVeteranHospitals: true,
            ...(userLocation && {
                lat: userLocation.latitude,
                lng: userLocation.longitude
            })
        };
        
        const response = await fetch(`${window.API_BASE_URL}/api/hospitals/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fallbackData)
        });
        
        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('기존 API 추천 결과:', data);
        
        // 응답 데이터 구조 정규화
        if (data.success && data.data && data.data.recommendations) {
            return data.data.recommendations;
        } else if (data.recommendations) {
            return data.recommendations;
        } else if (Array.isArray(data)) {
            return data;
        } else {
            console.warn('예상과 다른 응답 구조:', data);
            return [];
        }
        
    } catch (error) {
        console.error('AI 추천 API 오류:', error);
        throw error;
    }
}

// ==============================================
// 결과 표시 함수들
// ==============================================

// 기본 추천 결과 표시
function displayBasicRecommendations(recommendations) {
    const resultsContainer = document.getElementById('recommendationResults');
    
    if (!recommendations || recommendations.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">추천할 병원이 없습니다.</p>';
        return;
    }
    
    let resultsHTML = '<div class="results-header"><h5>🤖 AI 맞춤 병원 추천</h5><p>23,252개 데이터 분석 결과입니다.</p></div>';
    
    recommendations.forEach((hospital, index) => {
        resultsHTML += `
            <div class="hospital-result enhanced-card" onclick="showHospitalDetail('${hospital.id || hospital.hospital_id}')">
                <div class="hospital-rank">${index + 1}위 추천</div>
                <div class="hospital-name">${hospital.name || hospital.hospital_name || '이름 없음'}</div>
                
                ${hospital.score ? `
                <div class="hospital-score">
                    <span class="score">${hospital.score.toFixed(1)}</span>
                    <span class="score-label">점</span>
                </div>
                ` : ''}
                
                <div class="hospital-info">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${hospital.address || hospital.full_address || '주소 정보 없음'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span>${hospital.phone || hospital.contact_number || '전화번호 정보 없음'}</span>
                    </div>
                    ${hospital.distance ? `
                    <div class="info-item">
                        <i class="fas fa-route"></i>
                        <span>${hospital.distance}km</span>
                    </div>
                    ` : ''}
                </div>
                
                ${hospital.recommendation_reason ? `
                <div class="recommendation-reason">
                    <i class="fas fa-lightbulb"></i>
                    <strong>추천 이유:</strong> ${hospital.recommendation_reason}
                </div>
                ` : ''}
                
                <div class="hospital-actions">
                    <button class="btn-reserve" onclick="event.stopPropagation(); reserveHospital('${hospital.name || hospital.hospital_name}')">
                        <i class="fas fa-calendar-check"></i> 예약하기
                    </button>
                    <button class="btn-map" onclick="event.stopPropagation(); showOnMap('${hospital.id || hospital.hospital_id}', '${hospital.name || hospital.hospital_name}', '${hospital.latitude || ''}', '${hospital.longitude || ''}')">
                        <i class="fas fa-map-marked-alt"></i> 지도에서 보기
                    </button>
                    <button class="btn-directions" onclick="event.stopPropagation(); getDirections('${hospital.name || hospital.hospital_name}')">
                        <i class="fas fa-directions"></i> 길찾기
                    </button>
                    ${hospital.phone || hospital.contact_number ? `
                    <button class="btn-call" onclick="event.stopPropagation(); callHospital('${hospital.phone || hospital.contact_number}')">
                        <i class="fas fa-phone"></i> 전화하기
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = resultsHTML;
    addEnhancedResultStyles();
}

// 사용자 위치 요청 (동의 포함)
async function getUserLocationWithConsent() {
    try {
        // 위치 서비스 동의 확인
        const consent = localStorage.getItem('locationConsent');
        
        if (!consent) {
            const userConsent = await showLocationConsentDialog();
            if (!userConsent) {
                console.log('위치 서비스 사용을 거부했습니다.');
                return null;
            }
            localStorage.setItem('locationConsent', 'true');
        }
        
        // API를 통해 위치 정보 획득
        userLocation = await veteransCareAPI.getUserLocation();
        
        if (userLocation) {
            console.log('✅ 사용자 위치 정보 획득:', userLocation);
            
            // 위치 상태 표시
            showLocationStatus(userLocation);
            
            return userLocation;
        }
    } catch (error) {
        console.error('위치 정보 획득 실패:', error);
        return null;
    }
}

// 위치 서비스 동의 다이얼로그
function showLocationConsentDialog() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'location-consent-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>📍 위치 서비스 사용 동의</h3>
                    <p>더 정확한 병원 추천을 위해 현재 위치 정보를 사용하시겠습니까?</p>
                    <div class="location-benefits">
                        <div class="benefit-item">
                            <i class="fas fa-route"></i>
                            <span>거리순 병원 추천</span>
                        </div>
                        <div class="benefit-item">
                            <i class="fas fa-clock"></i>
                            <span>예상 이동시간 제공</span>
                        </div>
                        <div class="benefit-item">
                            <i class="fas fa-map-marked-alt"></i>
                            <span>가까운 보훈병원 우선 추천</span>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-allow" onclick="resolveLocationConsent(true)">
                            <i class="fas fa-check"></i> 허용
                        </button>
                        <button class="btn-deny" onclick="resolveLocationConsent(false)">
                            <i class="fas fa-times"></i> 거부
                        </button>
                    </div>
                    <p class="privacy-note">
                        <i class="fas fa-shield-alt"></i>
                        위치 정보는 병원 추천 목적으로만 사용되며 저장되지 않습니다.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 동의 결과 처리
        window.resolveLocationConsent = (allowed) => {
            modal.remove();
            delete window.resolveLocationConsent;
            resolve(allowed);
        };
        
        // 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
            .location-consent-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            .modal-overlay {
                background: rgba(0,0,0,0.7);
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 450px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .location-benefits {
                margin: 20px 0;
                text-align: left;
            }
            .benefit-item {
                display: flex;
                align-items: center;
                margin: 10px 0;
                color: #2c5aa0;
            }
            .benefit-item i {
                margin-right: 10px;
                width: 20px;
            }
            .modal-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin: 25px 0 15px;
            }
            .btn-allow, .btn-deny {
                padding: 12px 25px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .btn-allow {
                background: #27ae60;
                color: white;
            }
            .btn-allow:hover {
                background: #219a52;
            }
            .btn-deny {
                background: #e74c3c;
                color: white;
            }
            .btn-deny:hover {
                background: #c0392b;
            }
            .privacy-note {
                font-size: 12px;
                color: #666;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(style);
    });
}

// 위치 상태 표시
function showLocationStatus(location) {
    let statusMessage = '';
    let statusClass = 'success';
    
    if (location.error) {
        statusMessage = `📍 위치: ${location.error} (기본값 사용)`;
        statusClass = 'warning';
    } else if (location.cached) {
        statusMessage = `📍 위치: 캐시된 위치 사용 (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
        statusClass = 'info';
    } else if (location.default) {
        statusMessage = `📍 위치: 기본 위치 사용 (서울)`;
        statusClass = 'warning';
    } else {
        statusMessage = `📍 위치: 현재 위치 확인됨 (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
        statusClass = 'success';
    }
    
    // 상태 표시
    const statusDiv = document.createElement('div');
    statusDiv.className = `location-status ${statusClass}`;
    statusDiv.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: ${statusClass === 'success' ? '#27ae60' : statusClass === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            max-width: 300px;
        ">
            ${statusMessage}
        </div>
    `;
    
    document.body.appendChild(statusDiv);
    
    // 5초 후 제거
    setTimeout(() => {
        statusDiv.remove();
    }, 5000);
}

// 폴백 결과 표시 (서버 연결 실패 시)
function displayFallbackResults() {
    const resultsContainer = document.getElementById('recommendationResults');
    
    let filteredHospitals = sampleHospitals;
    if (formData.region === 'busan') {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('부산'));
    } else if (formData.region === 'daejeon') {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('대전') || h.name.includes('중앙'));
    }
    
    let resultsHTML = `
        <div class="fallback-notice">
            <i class="fas fa-info-circle" style="color: #f39c12; margin-right: 8px;"></i>
            <strong>오프라인 모드:</strong> 서버 연결 없이 기본 병원 목록을 표시합니다.
        </div>
        <div class="results-header">
            <h5>🏥 추천 병원 목록</h5>
            <p>회원님의 조건에 맞는 병원들입니다.</p>
        </div>
    `;
    
    filteredHospitals.forEach((hospital, index) => {
        resultsHTML += `
            <div class="hospital-result">
                <div class="hospital-name">${hospital.name}</div>
                <div class="hospital-info">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${hospital.address}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span>${hospital.phone}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-route"></i>
                        <span>${hospital.distance}</span>
                    </div>
                </div>
                <div class="hospital-benefits">
                    <h5><i class="fas fa-gift"></i> 보훈 혜택</h5>
                    <p>${hospital.benefits}</p>
                </div>
                <div class="hospital-actions">
                    <button class="btn-reserve" onclick="reserveHospital('${hospital.name}')">
                        <i class="fas fa-calendar-check"></i> 예약하기
                    </button>
                    <button class="btn-directions" onclick="getDirections('${hospital.name}')">
                        <i class="fas fa-directions"></i> 길찾기
                    </button>
                    <button class="btn-call" onclick="callHospital('${hospital.phone}')">
                        <i class="fas fa-phone"></i> 전화하기
                    </button>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = resultsHTML;
    
    // 폴백 알림 스타일 추가
    const fallbackStyle = document.createElement('style');
    fallbackStyle.textContent = `
        .fallback-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
    `;
    document.head.appendChild(fallbackStyle);
}

// 향상된 결과 스타일 추가
function addEnhancedResultStyles() {
    if (document.getElementById('enhanced-result-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-result-styles';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .enhanced-card {
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            background: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        }
        
        .enhanced-card:hover {
            border-color: #2c5aa0;
            box-shadow: 0 8px 25px rgba(44, 90, 160, 0.2);
            transform: translateY(-3px);
        }
        
        .hospital-rank {
            position: absolute;
            top: -10px;
            right: 20px;
            background: #2c5aa0;
            color: white;
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .hospital-score {
            position: absolute;
            top: 15px;
            right: 20px;
            text-align: center;
            background: #f8f9fa;
            border: 2px solid #2c5aa0;
            border-radius: 50px;
            padding: 10px;
            min-width: 60px;
        }
        
        .hospital-score .score {
            display: block;
            font-size: 18px;
            font-weight: bold;
            color: #2c5aa0;
            line-height: 1;
        }
        
        .hospital-score .score-label {
            font-size: 10px;
            color: #666;
        }
        
        .recommendation-reason {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
            font-size: 14px;
            color: #1976d2;
        }
        
        .hospital-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        
        .btn-reserve, .btn-directions, .btn-call {
            background: #2c5aa0;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            min-height: 44px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            flex: 1;
            min-width: 120px;
        }
        
        .btn-reserve {
            background: #27ae60;
        }
        
        .btn-directions {
            background: #3498db;
        }
        
        .btn-call {
            background: #e74c3c;
        }
        
        .btn-reserve:hover {
            background: #229954;
            transform: translateY(-1px);
        }
        
        .btn-directions:hover {
            background: #2980b9;
            transform: translateY(-1px);
        }
        
        .btn-call:hover {
            background: #c0392b;
            transform: translateY(-1px);
        }
        
        .results-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
        }
        
        .results-header h5 {
            font-size: 24px;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .results-header p {
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
        }
        
        @media (max-width: 768px) {
            .hospital-actions {
                flex-direction: column;
            }
            
            .btn-reserve, .btn-directions, .btn-call {
                flex: none;
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ==============================================
// 병원 액션 함수들
// ==============================================

// 병원 예약 기능
window.reserveHospital = function(hospitalName) {
    if (window.speechEnabled) {
        speakText(`${hospitalName} 예약 기능을 실행합니다.`);
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        ">
            <h4 style="color: #2c5aa0; margin-bottom: 20px;">
                <i class="fas fa-calendar-check"></i> ${hospitalName}
            </h4>
            <p style="margin-bottom: 20px; color: #666;">
                예약 기능은 향후 업데이트 예정입니다.<br>
                현재는 병원에 직접 전화하여 예약해주세요.
            </p>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #2c5aa0;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
            ">확인</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

// 길찾기 기능
window.getDirections = function(hospitalName) {
    if (window.speechEnabled) {
        speakText(`${hospitalName}로 길찾기를 시작합니다.`);
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        ">
            <h4 style="color: #2c5aa0; margin-bottom: 20px;">
                <i class="fas fa-route"></i> ${hospitalName} 길찾기
            </h4>
            <p style="margin-bottom: 20px; color: #666;">
                어떤 지도 서비스를 사용하시겠습니까?
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="openKakaoMap('${hospitalName}'); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #ffeb3b;
                    color: #333;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    <i class="fas fa-map"></i> 카카오맵
                </button>
                <button onclick="openNaverMap('${hospitalName}'); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #03c75a;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    <i class="fas fa-map-marked-alt"></i> 네이버맵
                </button>
                <button onclick="openGoogleMaps('${hospitalName}'); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #4285f4;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    <i class="fab fa-google"></i> 구글맵
                </button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 15px;
            ">취소</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

// 지도 서비스별 열기 함수들
window.openKakaoMap = function(hospitalName) {
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(hospitalName)}`;
    window.open(url, '_blank');
};

window.openNaverMap = function(hospitalName) {
    const url = `https://map.naver.com/v5/search/${encodeURIComponent(hospitalName)}`;
    window.open(url, '_blank');
};

window.openGoogleMaps = function(hospitalName) {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(hospitalName)}`;
    window.open(url, '_blank');
};

// 전화하기 기능
window.callHospital = function(phoneNumber) {
    if (!phoneNumber || phoneNumber === '전화번호 정보 없음') {
        alert('전화번호 정보가 없습니다.');
        return;
    }
    
    if (window.speechEnabled) {
        speakText('병원에 전화를 겁니다.');
    }
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        window.location.href = `tel:${phoneNumber}`;
    } else {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                text-align: center;
            ">
                <h4 style="color: #2c5aa0; margin-bottom: 20px;">
                    <i class="fas fa-phone"></i> 병원 전화하기
                </h4>
                <p style="margin-bottom: 20px; color: #666;">
                    전화번호: <strong>${phoneNumber}</strong><br>
                    모바일에서 전화를 걸거나 직접 다이얼하세요.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="copyToClipboard('${phoneNumber}'); this.parentElement.parentElement.parentElement.remove();" style="
                        background: #17a2b8;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        <i class="fas fa-copy"></i> 복사하기
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">닫기</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
};

// 클립보드에 복사하기
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('전화번호가 복사되었습니다.');
        }).catch(() => {
            promptManualCopy(text);
        });
    } else {
        promptManualCopy(text);
    }
}

// 수동 복사 안내
function promptManualCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('전화번호가 복사되었습니다.');
}

// ==============================================
// 병원 상세 정보 모달
// ==============================================

// 병원 상세 정보 표시
window.showHospitalDetail = async function(hospitalId) {
    try {
        showLoadingSpinner('병원 상세 정보를 불러오는 중...');
        
        const hospitalDetail = await fetchHospitalDetail(hospitalId);
        hideLoadingSpinner();
        
        const detailModal = createHospitalDetailModal(hospitalDetail);
        document.body.appendChild(detailModal);
        
    } catch (error) {
        console.error('병원 상세 정보 로딩 실패:', error);
        hideLoadingSpinner();
        
        const basicModal = createBasicInfoModal(hospitalId);
        document.body.appendChild(basicModal);
    }
};

// 로딩 스피너 함수들
function showLoadingSpinner(message = '로딩 중...') {
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-overlay">
            <div class="spinner-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        #loading-spinner .spinner-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        }
        
        #loading-spinner .spinner-content {
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        #loading-spinner .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2c5aa0;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        #loading-spinner p {
            margin: 0;
            color: #666;
            font-size: 16px;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// 병원 상세 정보 API 호출
async function fetchHospitalDetail(hospitalId) {
    const apiUrl = `${window.API_BASE_URL}/api/hospitals/${hospitalId}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const data = await response.json();
    return data.hospital || data;
}

// 병원 상세 정보 모달 생성
function createHospitalDetailModal(hospitalDetail) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            margin: 20px;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #2c5aa0; margin: 0;">
                    <i class="fas fa-hospital"></i> ${hospitalDetail.name || hospitalDetail.hospital_name || '병원 정보'}
                </h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            ${generateHospitalDetailContent(hospitalDetail)}
            
            <div style="margin-top: 30px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button onclick="reserveHospital('${hospitalDetail.name || hospitalDetail.hospital_name}'); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-calendar-check"></i> 예약하기
                </button>
                <button onclick="getDirections('${hospitalDetail.name || hospitalDetail.hospital_name}'); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-directions"></i> 길찾기
                </button>
                ${hospitalDetail.phone || hospitalDetail.contact_number ? `
                <button onclick="callHospital('${hospitalDetail.phone || hospitalDetail.contact_number}'); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-phone"></i> 전화하기
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// 병원 상세 정보 내용 생성
function generateHospitalDetailContent(hospitalDetail) {
    let content = '';
    
    // 기본 정보
    content += `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h5 style="color: #2c5aa0; margin-bottom: 15px;"><i class="fas fa-info-circle"></i> 기본 정보</h5>
            <div style="display: grid; gap: 10px;">
                ${hospitalDetail.address || hospitalDetail.full_address ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-map-marker-alt" style="color: #e74c3c; width: 20px;"></i>
                    <span><strong>주소:</strong> ${hospitalDetail.address || hospitalDetail.full_address}</span>
                </div>
                ` : ''}
                ${hospitalDetail.phone || hospitalDetail.contact_number ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-phone" style="color: #27ae60; width: 20px;"></i>
                    <span><strong>전화:</strong> ${hospitalDetail.phone || hospitalDetail.contact_number}</span>
                </div>
                ` : ''}
                ${hospitalDetail.distance ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-route" style="color: #3498db; width: 20px;"></i>
                    <span><strong>거리:</strong> ${hospitalDetail.distance}km</span>
                </div>
                ` : ''}
                ${hospitalDetail.hospital_type || hospitalDetail.type ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-building" style="color: #9b59b6; width: 20px;"></i>
                    <span><strong>유형:</strong> ${hospitalDetail.hospital_type || hospitalDetail.type}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // 진료과 및 전문분야
    if (hospitalDetail.specialties || hospitalDetail.departments || hospitalDetail.medical_services) {
        content += `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h5 style="color: #27ae60; margin-bottom: 15px;"><i class="fas fa-user-md"></i> 진료과 및 전문분야</h5>
                <p style="margin: 0; line-height: 1.6;">
                    ${hospitalDetail.specialties || hospitalDetail.departments || (Array.isArray(hospitalDetail.medical_services) ? hospitalDetail.medical_services.join(', ') : hospitalDetail.medical_services) || '정보 없음'}
                </p>
            </div>
        `;
    }
    
    // 보훈 혜택 정보
    if (hospitalDetail.veteran_benefits || hospitalDetail.benefits || hospitalDetail.is_veteran_hospital) {
        content += `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <h5 style="color: #856404; margin-bottom: 15px;"><i class="fas fa-medal"></i> 보훈 혜택</h5>
                <p style="margin: 0; line-height: 1.6; color: #856404;">
                    ${hospitalDetail.veteran_benefits || hospitalDetail.benefits || '보훈대상자 우대 서비스 제공'}
                </p>
            </div>
        `;
    }
    
    return content;
}

// 기본 정보 모달 생성 (API 실패 시 폴백)
function createBasicInfoModal(hospitalId) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            text-align: center;
        ">
            <h4 style="color: #2c5aa0; margin-bottom: 20px;">
                <i class="fas fa-hospital"></i> 병원 정보
            </h4>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <i class="fas fa-info-circle" style="color: #856404; margin-right: 8px;"></i>
                <span style="color: #856404;">상세 정보를 불러올 수 없습니다.</span>
            </div>
            <p style="margin-bottom: 20px; color: #666; line-height: 1.6;">
                병원 상세 정보는 현재 로딩할 수 없습니다.<br>
                목록에서 표시된 기본 정보를 참고하시거나<br>
                직접 병원에 문의해주세요.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                ">닫기</button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// ==============================================
// 음성 안내 시스템
// ==============================================

// 음성 안내 설정
function setupVoiceGuide() {
    if ('speechSynthesis' in window) {
        window.speechEnabled = false;
        console.log('음성 API 준비 완료');
    } else {
        const voiceButton = document.getElementById('voiceGuide');
        if (voiceButton) {
            voiceButton.style.display = 'none';
        }
    }
}

// 음성 안내 토글
function toggleVoiceGuide() {
    if ('speechSynthesis' in window) {
        window.speechEnabled = !window.speechEnabled;
        const button = document.getElementById('voiceGuide');
        const icon = button.querySelector('i');
        const text = button.querySelector('span');
        
        if (window.speechEnabled) {
            icon.className = 'fas fa-volume-up';
            text.textContent = '음성안내 켜짐';
            button.style.background = '#27ae60';
            speakText('음성 안내가 켜졌습니다.');
        } else {
            icon.className = 'fas fa-volume-mute';
            text.textContent = '음성안내 꺼짐';
            button.style.background = '#6c757d';
            speechSynthesis.cancel();
        }
        
        announceToScreenReader(`음성 안내가 ${window.speechEnabled ? '켜졌' : '꺼졌'}습니다.`);
    }
}

// 텍스트 음성 변환
function speakText(text) {
    if (window.speechEnabled && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // 한국어 음성 선택
        const voices = speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice => voice.lang.includes('ko'));
        if (koreanVoice) {
            utterance.voice = koreanVoice;
        }
        
        speechSynthesis.speak(utterance);
    }
}

// 스크린 리더용 알림
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// ==============================================
// 고급 길찾기 시스템
// ==============================================

// 향상된 길찾기 함수 (다중 네비앱 지원)
window.getDirections = function(hospitalName, hospitalAddress = null, latitude = null, longitude = null) {
    if (window.speechEnabled) {
        speakText(`${hospitalName}로 길찾기 옵션을 표시합니다.`);
    }
    
    // 길찾기 모달 생성
    const modal = document.createElement('div');
    modal.className = 'navigation-modal-overlay';
    modal.innerHTML = `
        <div class="navigation-modal">
            <div class="modal-header">
                <h4><i class="fas fa-route"></i> ${hospitalName} 길찾기</h4>
                <button class="close-btn" onclick="this.closest('.navigation-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="hospital-info-section">
                ${hospitalAddress ? `
                <div class="address-info">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${hospitalAddress}</span>
                </div>
                ` : ''}
                <div class="travel-info">
                    <div class="info-item">
                        <i class="fas fa-car"></i>
                        <span>예상 소요시간: ${calculateTravelTime(5)}분</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-parking"></i>
                        <span>주차: 병원 주차장 이용 가능</span>
                    </div>
                </div>
            </div>
            
            <div class="navigation-apps">
                <h5><i class="fas fa-mobile-alt"></i> 내비게이션 앱 선택</h5>
                <div class="nav-buttons">
                    <button class="nav-btn kakao" onclick="openKakaoNavi('${hospitalName}', ${latitude}, ${longitude}, '${hospitalAddress}')">
                        <div class="nav-icon">🗺️</div>
                        <div class="nav-content">
                            <span class="app-name">카카오내비</span>
                            <small>가장 빠른 경로</small>
                        </div>
                    </button>
                    
                    <button class="nav-btn naver" onclick="openNaverMap('${hospitalName}', ${latitude}, ${longitude}, '${hospitalAddress}')">
                        <div class="nav-icon">📍</div>
                        <div class="nav-content">
                            <span class="app-name">네이버맵</span>
                            <small>대중교통 포함</small>
                        </div>
                    </button>
                    
                    <button class="nav-btn tmap" onclick="openTmap('${hospitalName}', ${latitude}, ${longitude}, '${hospitalAddress}')">
                        <div class="nav-icon">🚗</div>
                        <div class="nav-content">
                            <span class="app-name">티맵</span>
                            <small>실시간 교통정보</small>
                        </div>
                    </button>
                    
                    <button class="nav-btn google" onclick="openGoogleMaps('${hospitalName}', ${latitude}, ${longitude}, '${hospitalAddress}')">
                        <div class="nav-icon">🌐</div>
                        <div class="nav-content">
                            <span class="app-name">구글맵</span>
                            <small>글로벌 서비스</small>
                        </div>
                    </button>
                </div>
            </div>
            
            <div class="web-navigation">
                <h5><i class="fas fa-globe"></i> 웹에서 바로 보기</h5>
                <div class="web-buttons">
                    <button class="web-btn" onclick="openKakaoMapWeb('${hospitalName}')">
                        카카오맵 웹
                    </button>
                    <button class="web-btn" onclick="openNaverMapWeb('${hospitalName}')">
                        네이버맵 웹
                    </button>
                </div>
            </div>
            
            <div class="additional-options">
                <button class="option-btn" onclick="copyAddressToClipboard('${hospitalAddress || hospitalName}')">
                    <i class="fas fa-copy"></i> 주소 복사
                </button>
                <button class="option-btn" onclick="shareLocation('${hospitalName}', '${hospitalAddress}')">
                    <i class="fas fa-share"></i> 위치 공유
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 외부 클릭시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // ESC 키로 닫기
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
};

// 예상 소요시간 계산
function calculateTravelTime(distance) {
    const distanceKm = parseFloat(distance) || 5;
    
    // 거리별 예상 시간 (서울 기준 평균 속도)
    if (distanceKm <= 5) return Math.round(distanceKm * 8); // 도심, 느린 속도
    if (distanceKm <= 15) return Math.round(distanceKm * 4); // 중간 거리
    return Math.round(distanceKm * 3); // 장거리, 빠른 속도
}

// 네비게이션 앱 열기 함수들
window.openKakaoNavi = function(name, lat, lng, address) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && lat && lng) {
        // 모바일에서 카카오내비 앱 실행
        const naviUrl = `kakaonavi://navigate?destination=${lat},${lng}&destination_name=${encodeURIComponent(name)}`;
        window.location.href = naviUrl;
        
        // 앱이 설치되지 않은 경우 웹으로 이동
        setTimeout(() => {
            openKakaoMapWeb(name);
        }, 1000);
    } else {
        openKakaoMapWeb(name);
    }
    
    // 모달 닫기
    document.querySelector('.navigation-modal-overlay')?.remove();
};

window.openNaverMap = function(name, lat, lng, address) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && lat && lng) {
        // 모바일에서 네이버맵 앱 실행
        const naverUrl = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}`;
        window.location.href = naverUrl;
        
        // 앱이 설치되지 않은 경우 웹으로 이동
        setTimeout(() => {
            openNaverMapWeb(name);
        }, 1000);
    } else {
        openNaverMapWeb(name);
    }
    
    document.querySelector('.navigation-modal-overlay')?.remove();
};

window.openTmap = function(name, lat, lng, address) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && lat && lng) {
        // 티맵 앱 실행
        const tmapUrl = `tmap://route?goalname=${encodeURIComponent(name)}&goalx=${lng}&goaly=${lat}`;
        window.location.href = tmapUrl;
        
        // 앱이 설치되지 않은 경우 웹으로 이동
        setTimeout(() => {
            const webUrl = `https://www.tmapglobal.com/ko_kr/route?destination=${encodeURIComponent(name)}`;
            window.open(webUrl, '_blank');
        }, 1000);
    } else {
        const webUrl = `https://www.tmapglobal.com/ko_kr/route?destination=${encodeURIComponent(name)}`;
        window.open(webUrl, '_blank');
    }
    
    document.querySelector('.navigation-modal-overlay')?.remove();
};

window.openGoogleMaps = function(name, lat, lng, address) {
    let url;
    if (lat && lng) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    } else {
        url = `https://www.google.com/maps/search/${encodeURIComponent(name)}`;
    }
    
    window.open(url, '_blank');
    document.querySelector('.navigation-modal-overlay')?.remove();
};

// 웹 지도 서비스 열기
window.openKakaoMapWeb = function(name) {
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(name)}`;
    window.open(url, '_blank');
};

window.openNaverMapWeb = function(name) {
    const url = `https://map.naver.com/v5/search/${encodeURIComponent(name)}`;
    window.open(url, '_blank');
};

// 추가 옵션 함수들
window.copyAddressToClipboard = function(address) {
    if (!address || address === 'null') {
        alert('주소 정보가 없습니다.');
        return;
    }
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(address).then(() => {
            showToast('주소가 클립보드에 복사되었습니다.');
        }).catch(() => {
            promptManualCopy(address);
        });
    } else {
        promptManualCopy(address);
    }
};

window.shareLocation = function(name, address) {
    if (navigator.share) {
        navigator.share({
            title: `${name} 위치`,
            text: `${name}의 위치를 공유합니다.`,
            url: window.location.href
        }).catch(console.error);
    } else {
        // 폴백: 텍스트 복사
        const shareText = `${name}\n${address || ''}`;
        copyAddressToClipboard(shareText);
    }
};

// 토스트 메시지 표시
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 10002;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ==============================================
// 접근성 기능들
// ==============================================

// 포커스 가시성 향상
function enhanceFocusVisibility() {
    const style = document.createElement('style');
    style.textContent = `
        *:focus {
            outline: 3px solid #2c5aa0 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.3) !important;
        }
        
        .btn:focus,
        button:focus {
            transform: scale(1.05);
            transition: transform 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}

// 고대비 모드 설정
function setupHighContrastMode() {
    const highContrastBtn = document.createElement('button');
    highContrastBtn.id = 'highContrastToggle';
    highContrastBtn.innerHTML = '<i class="fas fa-adjust"></i><span>고대비 모드</span>';
    highContrastBtn.className = 'accessibility-btn';
    highContrastBtn.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 1000;
        background: #444;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        min-height: 44px;
    `;
    
    let highContrastEnabled = false;
    
    highContrastBtn.addEventListener('click', () => {
        highContrastEnabled = !highContrastEnabled;
        
        if (highContrastEnabled) {
            document.body.classList.add('high-contrast');
            highContrastBtn.querySelector('span').textContent = '고대비 해제';
            announceToScreenReader('고대비 모드가 켜졌습니다.');
        } else {
            document.body.classList.remove('high-contrast');
            highContrastBtn.querySelector('span').textContent = '고대비 모드';
            announceToScreenReader('고대비 모드가 꺼졌습니다.');
        }
    });
    
    document.body.appendChild(highContrastBtn);
    
    // 고대비 모드 CSS
    const highContrastStyle = document.createElement('style');
    highContrastStyle.textContent = `
        .high-contrast {
            filter: contrast(150%) brightness(1.2);
        }
        
        .high-contrast .hero {
            background: #000 !important;
            color: #fff !important;
        }
        
        .high-contrast .card {
            background: #fff !important;
            border: 3px solid #000 !important;
            color: #000 !important;
        }
        
        .high-contrast .btn {
            background: #000 !important;
            color: #fff !important;
            border: 2px solid #fff !important;
        }
    `;
    document.head.appendChild(highContrastStyle);
}

// 애니메이션 감소 모드
function setupReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// 큰 텍스트 모드
function setupLargeTextMode() {
    const largeTextBtn = document.createElement('button');
    largeTextBtn.id = 'largeTextToggle';
    largeTextBtn.innerHTML = '<i class="fas fa-text-height"></i><span>큰 글씨</span>';
    largeTextBtn.className = 'accessibility-btn';
    largeTextBtn.style.cssText = `
        position: fixed;
        top: 180px;
        right: 20px;
        z-index: 1000;
        background: #6f42c1;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        min-height: 44px;
    `;
    
    let largeTextEnabled = false;
    
    largeTextBtn.addEventListener('click', () => {
        largeTextEnabled = !largeTextEnabled;
        
        if (largeTextEnabled) {
            document.body.classList.add('large-text');
            largeTextBtn.querySelector('span').textContent = '보통 글씨';
            announceToScreenReader('큰 글씨 모드가 켜졌습니다.');
        } else {
            document.body.classList.remove('large-text');
            largeTextBtn.querySelector('span').textContent = '큰 글씨';
            announceToScreenReader('보통 글씨 모드로 돌아왔습니다.');
        }
    });
    
    document.body.appendChild(largeTextBtn);
    
    // 큰 텍스트 CSS
    const largeTextStyle = document.createElement('style');
    largeTextStyle.textContent = `
        .large-text {
            font-size: 120% !important;
        }
        
        .large-text h1 { font-size: 3.6rem !important; }
        .large-text h2 { font-size: 3rem !important; }
        .large-text h3 { font-size: 2.4rem !important; }
        .large-text h4 { font-size: 2rem !important; }
        .large-text h5 { font-size: 1.6rem !important; }
        .large-text p, .large-text span, .large-text div { font-size: 1.2rem !important; }
        .large-text button { font-size: 1.1rem !important; padding: 14px 20px !important; }
        .large-text input, .large-text select { font-size: 1.1rem !important; padding: 12px !important; }
    `;
    document.head.appendChild(largeTextStyle);
}

// 터치 지원 개선
function setupTouchSupport() {
    // 터치 디바이스 감지
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        // 터치 최적화 CSS
        const touchStyle = document.createElement('style');
        touchStyle.textContent = `
            .touch-device button,
            .touch-device .btn,
            .touch-device .card,
            .touch-device .symptom-card {
                min-height: 48px !important;
                min-width: 48px !important;
                padding: 12px 16px !important;
                margin: 4px !important;
            }
            
            .touch-device .symptom-card {
                padding: 20px !important;
                margin: 8px !important;
            }
            
            .touch-device select,
            .touch-device input {
                min-height: 48px !important;
                font-size: 16px !important;
                padding: 12px !important;
            }
        `;
        document.head.appendChild(touchStyle);
    }
}

// 키보드 네비게이션 처리
function handleKeyboardNavigation(event) {
    // Tab 키 순환 개선
    if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
    
    // Enter 키로 버튼 활성화 (접근성 향상)
    if (event.key === 'Enter' && event.target.classList.contains('symptom-card')) {
        event.target.click();
    }
    
    // ESC 키로 모달 닫기
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.navigation-modal-overlay, .hospital-detail-modal');
        modals.forEach(modal => modal.remove());
    }
    
    // 음성 안내 단축키 (Ctrl + V)
    if (event.ctrlKey && event.key === 'v') {
        event.preventDefault();
        toggleVoiceGuide();
    }
}

// ==============================================
// 오류 처리 및 폴백 시스템
// ==============================================

// 전역 오류 처리
function handleError(error, userMessage = '오류가 발생했습니다.') {
    console.error('Application Error:', error);
    
    // 사용자에게 친화적인 오류 메시지 표시
    showErrorMessage(userMessage);
    
    // 음성 안내가 켜져있으면 오류 안내
    if (window.speechEnabled) {
        speakText(userMessage + ' 다시 시도해주세요.');
    }
}

// 오류 메시지 표시
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 16px 20px;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button onclick="this.closest('.error-message').remove()" style="
                    background: none;
                    border: none;
                    color: #721c24;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    margin-left: auto;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// 네트워크 상태 감지
function setupNetworkStatusMonitoring() {
    function updateNetworkStatus() {
        const isOnline = navigator.onLine;
        const statusElement = document.getElementById('networkStatus');
        
        if (!isOnline) {
            if (!statusElement) {
                const offlineNotice = document.createElement('div');
                offlineNotice.id = 'networkStatus';
                offlineNotice.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: #856404;
                        color: white;
                        text-align: center;
                        padding: 10px;
                        z-index: 10000;
                        font-size: 14px;
                    ">
                        <i class="fas fa-wifi" style="margin-right: 8px;"></i>
                        인터넷 연결이 끊어졌습니다. 오프라인 모드로 작동합니다.
                    </div>
                `;
                document.body.appendChild(offlineNotice);
            }
        } else {
            if (statusElement) {
                statusElement.remove();
            }
        }
    }
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // 초기 상태 확인
    updateNetworkStatus();
}

// ==============================================
// 유틸리티 함수들
// ==============================================

// 스크롤 애니메이션
function smoothScrollTo(element) {
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// 폼 데이터 유효성 검사
function validateFormData(data) {
    const required = ['veteranType', 'region', 'district'];
    
    for (const field of required) {
        if (!data[field]) {
            return {
                valid: false,
                message: `${getFieldLabel(field)}을(를) 선택해주세요.`
            };
        }
    }
    
    return { valid: true };
}

function getFieldLabel(field) {
    const labels = {
        veteranType: '보훈대상 종류',
        region: '시/도',
        district: '시/군/구',
        symptoms: '증상'
    };
    
    return labels[field] || field;
}

// 로컬 스토리지 안전 사용
function safeLocalStorage() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// 데이터 저장 (가능한 경우)
function saveFormProgress() {
    if (safeLocalStorage()) {
        try {
            localStorage.setItem('veteransCareProgress', JSON.stringify({
                formData,
                currentStep,
                selectedSymptoms,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('데이터 저장 실패:', e);
        }
    }
}

// 데이터 복원 (가능한 경우)
function restoreFormProgress() {
    if (safeLocalStorage()) {
        try {
            const saved = localStorage.getItem('veteransCareProgress');
            if (saved) {
                const data = JSON.parse(saved);
                
                // 24시간 이내 데이터만 복원
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    formData = data.formData || {};
                    selectedSymptoms = data.selectedSymptoms || [];
                    
                    // 폼 필드 복원
                    restoreFormFields();
                    
                    announceToScreenReader('이전 입력 정보가 복원되었습니다.');
                }
            }
        } catch (e) {
            console.warn('데이터 복원 실패:', e);
        }
    }
}

function restoreFormFields() {
    Object.keys(formData).forEach(key => {
        const element = document.getElementById(key);
        if (element && formData[key]) {
            element.value = formData[key];
            
            // 지역 선택 시 시/군/구 옵션 업데이트
            if (key === 'region') {
                updateDistrictOptions();
            }
        }
    });
    
    // 선택된 증상 복원
    selectedSymptoms.forEach(symptom => {
        const card = document.querySelector(`[data-value="${symptom}"]`);
        if (card) {
            card.classList.add('selected');
        }
    });
}

// ==============================================
// 성능 최적화
// ==============================================

// 디바운싱 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 스로틀링 함수
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 이미지 지연 로딩
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // 폴백: 모든 이미지 즉시 로드
        images.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
        });
    }
}

// ==============================================
// 고급 상호작용 기능
// ==============================================

// 드래그 앤 드롭으로 증상 순서 변경
function setupDragAndDrop() {
    const symptomCards = document.querySelectorAll('.symptom-card');
    
    symptomCards.forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.value);
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedValue = e.dataTransfer.getData('text/plain');
            const draggedCard = document.querySelector(`[data-value="${draggedValue}"]`);
            
            if (draggedCard && draggedCard !== card) {
                // 순서 변경 로직
                const container = card.parentNode;
                const cardRect = card.getBoundingClientRect();
                const dropY = e.clientY;
                
                if (dropY > cardRect.top + cardRect.height / 2) {
                    container.insertBefore(draggedCard, card.nextSibling);
                } else {
                    container.insertBefore(draggedCard, card);
                }
                
                announceToScreenReader('증상 순서가 변경되었습니다.');
            }
        });
    });
}

// 제스처 지원 (모바일)
function setupGestureSupport() {
    let startX, startY, startTime;
    
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }
    });
    
    document.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const diffX = endX - startX;
            const diffY = endY - startY;
            const timeDiff = endTime - startTime;
            
            // 스와이프 감지 (빠르고 긴 동작)
            if (timeDiff < 300 && Math.abs(diffX) > 50) {
                if (diffX > 0 && currentStep > 1) {
                    // 오른쪽 스와이프: 이전 단계
                    prevStep(currentStep - 1);
                } else if (diffX < 0 && currentStep < 4) {
                    // 왼쪽 스와이프: 다음 단계
                    if (validateCurrentStep()) {
                        nextStep(currentStep + 1);
                    }
                }
            }
        }
    });
}

// ==============================================
// 고급 기능들
// ==============================================

// 즐겨찾기 병원 관리
function setupFavoriteHospitals() {
    window.toggleFavorite = function(hospitalId, hospitalName) {
        if (!safeLocalStorage()) {
            alert('즐겨찾기 기능을 사용할 수 없습니다.');
            return;
        }
        
        try {
            let favorites = JSON.parse(localStorage.getItem('favoriteHospitals') || '[]');
            const index = favorites.findIndex(fav => fav.id === hospitalId);
            
            if (index > -1) {
                // 즐겨찾기 제거
                favorites.splice(index, 1);
                announceToScreenReader(`${hospitalName}이 즐겨찾기에서 제거되었습니다.`);
            } else {
                // 즐겨찾기 추가
                favorites.push({
                    id: hospitalId,
                    name: hospitalName,
                    addedAt: Date.now()
                });
                announceToScreenReader(`${hospitalName}이 즐겨찾기에 추가되었습니다.`);
            }
            
            localStorage.setItem('favoriteHospitals', JSON.stringify(favorites));
            updateFavoriteButtons();
            
        } catch (error) {
            console.error('즐겨찾기 처리 오류:', error);
            alert('즐겨찾기 처리 중 오류가 발생했습니다.');
        }
    };
    
    function updateFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('.favorite-btn');
        const favorites = JSON.parse(localStorage.getItem('favoriteHospitals') || '[]');
        
        favoriteButtons.forEach(btn => {
            const hospitalId = btn.dataset.hospitalId;
            const isFavorite = favorites.some(fav => fav.id === hospitalId);
            
            if (isFavorite) {
                btn.classList.add('favorited');
                btn.innerHTML = '<i class="fas fa-heart"></i>';
            } else {
                btn.classList.remove('favorited');
                btn.innerHTML = '<i class="far fa-heart"></i>';
            }
        });
    }
}

// 최근 검색 기록 관리
function setupSearchHistory() {
    function addToSearchHistory(searchData) {
        if (!safeLocalStorage()) return;
        
        try {
            let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            
            // 중복 제거
            history = history.filter(item => 
                !(item.region === searchData.region && 
                  item.district === searchData.district && 
                  JSON.stringify(item.symptoms) === JSON.stringify(searchData.symptoms))
            );
            
            // 새 검색 추가 (맨 앞에)
            history.unshift({
                ...searchData,
                searchedAt: Date.now()
            });
            
            // 최대 10개까지만 보관
            history = history.slice(0, 10);
            
            localStorage.setItem('searchHistory', JSON.stringify(history));
        } catch (error) {
            console.error('검색 기록 저장 오류:', error);
        }
    }
    
    window.showSearchHistory = function() {
        if (!safeLocalStorage()) {
            alert('검색 기록 기능을 사용할 수 없습니다.');
            return;
        }
        
        try {
            const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            
            if (history.length === 0) {
                alert('저장된 검색 기록이 없습니다.');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'search-history-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4><i class="fas fa-history"></i> 최근 검색 기록</h4>
                            <button onclick="this.closest('.search-history-modal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="history-list">
                            ${history.map((item, index) => `
                                <div class="history-item" onclick="restoreSearch(${index})">
                                    <div class="search-info">
                                        <strong>${item.region} ${item.district}</strong>
                                        <span class="symptoms">${item.symptoms.map(s => getSymptomLabel(s)).join(', ')}</span>
                                        <small>${new Date(item.searchedAt).toLocaleDateString()}</small>
                                    </div>
                                    <button onclick="event.stopPropagation(); removeSearchHistory(${index})" class="remove-btn">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="modal-footer">
                            <button onclick="clearSearchHistory()" class="btn-clear">
                                <i class="fas fa-trash-alt"></i> 전체 삭제
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('검색 기록 표시 오류:', error);
            alert('검색 기록을 불러올 수 없습니다.');
        }
    };
    
    window.restoreSearch = function(index) {
        try {
            const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            const searchData = history[index];
            
            if (searchData) {
                // 폼 데이터 복원
                formData = { ...searchData };
                selectedSymptoms = [...searchData.symptoms];
                
                // UI 업데이트
                restoreFormFields();
                
                // 모달 닫기
                document.querySelector('.search-history-modal').remove();
                
                announceToScreenReader('이전 검색 조건이 복원되었습니다.');
            }
        } catch (error) {
            console.error('검색 복원 오류:', error);
        }
    };
    
    window.removeSearchHistory = function(index) {
        try {
            let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            history.splice(index, 1);
            localStorage.setItem('searchHistory', JSON.stringify(history));
            
            // 모달 새로고침
            document.querySelector('.search-history-modal').remove();
            showSearchHistory();
            
        } catch (error) {
            console.error('검색 기록 삭제 오류:', error);
        }
    };
    
    window.clearSearchHistory = function() {
        if (confirm('모든 검색 기록을 삭제하시겠습니까?')) {
            localStorage.removeItem('searchHistory');
            document.querySelector('.search-history-modal').remove();
            announceToScreenReader('검색 기록이 모두 삭제되었습니다.');
        }
    };
    
    function getSymptomLabel(symptom) {
        const labels = {
            head: '두통/머리',
            heart: '심장/가슴',
            stomach: '복통/소화',
            bone: '관절/근육',
            eye: '눈/시력',
            ear: '귀/청력',
            skin: '피부',
            mental: '정신건강'
        };
        return labels[symptom] || symptom;
    }
    
    // 검색 완료 시 기록에 추가
    const originalGenerateRecommendation = generateRecommendation;
    generateRecommendation = function() {
        addToSearchHistory(formData);
        return originalGenerateRecommendation.call(this);
    };
}

// 피드백 시스템
function setupFeedbackSystem() {
    window.showFeedbackForm = function() {
        const modal = document.createElement('div');
        modal.className = 'feedback-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-comment"></i> 서비스 피드백</h4>
                        <button onclick="this.closest('.feedback-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="feedback-form">
                        <div class="rating-section">
                            <label>서비스 만족도:</label>
                            <div class="star-rating">
                                <span class="star" data-rating="1">★</span>
                                <span class="star" data-rating="2">★</span>
                                <span class="star" data-rating="3">★</span>
                                <span class="star" data-rating="4">★</span>
                                <span class="star" data-rating="5">★</span>
                            </div>
                        </div>
                        <div class="comment-section">
                            <label for="feedbackComment">의견 및 개선사항:</label>
                            <textarea id="feedbackComment" rows="4" 
                                    placeholder="서비스 이용 소감이나 개선사항을 자유롭게 작성해주세요."></textarea>
                        </div>
                        <div class="contact-section">
                            <label for="feedbackContact">연락처 (선택):</label>
                            <input type="text" id="feedbackContact" 
                                   placeholder="답변을 원하시면 이메일이나 전화번호를 입력해주세요.">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button onclick="submitFeedback()" class="btn-submit">
                            <i class="fas fa-paper-plane"></i> 피드백 전송
                        </button>
                        <button onclick="this.closest('.feedback-modal').remove()" class="btn-cancel">
                            취소
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 별점 클릭 이벤트
        modal.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                updateStarRating(rating);
            });
        });
        
        function updateStarRating(rating) {
            modal.querySelectorAll('.star').forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('selected');
                } else {
                    star.classList.remove('selected');
                }
            });
            modal.dataset.rating = rating;
        }
    };
    
    window.submitFeedback = function() {
        const modal = document.querySelector('.feedback-modal');
        const rating = modal.dataset.rating || 0;
        const comment = document.getElementById('feedbackComment').value;
        const contact = document.getElementById('feedbackContact').value;
        
        if (rating === 0) {
            alert('만족도를 선택해주세요.');
            return;
        }
        
        // 피드백 데이터 저장 (실제로는 서버로 전송)
        const feedbackData = {
            rating: parseInt(rating),
            comment: comment.trim(),
            contact: contact.trim(),
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('피드백 데이터:', feedbackData);
        
        // 성공 메시지
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content success">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h4>피드백이 전송되었습니다!</h4>
                    <p>소중한 의견 감사합니다.<br>서비스 개선에 반영하겠습니다.</p>
                    <button onclick="this.closest('.feedback-modal').remove()" class="btn-ok">
                        확인
                    </button>
                </div>
            </div>
        `;
        
        announceToScreenReader('피드백이 성공적으로 전송되었습니다.');
        
        // 3초 후 자동 닫기
        setTimeout(() => {
            modal.remove();
        }, 3000);
    };
}

// ==============================================
// 초기화 및 이벤트 바인딩 완료
// ==============================================

// 페이지 완전 로드 후 추가 설정
window.addEventListener('load', function() {
    // 성능 최적화 기능들
    setupLazyLoading();
    setupNetworkStatusMonitoring();
    
    // 고급 기능들
    setupFavoriteHospitals();
    setupSearchHistory();
    setupFeedbackSystem();
    
    // 상호작용 기능들
    setupDragAndDrop();
    setupGestureSupport();
    
    // 기존 진행상황 복원 시도
    restoreFormProgress();
    
    console.log('🎉 보훈케어 내비게이터 완전 로드 완료');
    console.log('📊 총 기능: 음성안내, 고급 길찾기, 접근성, 즐겨찾기, 검색기록, 피드백');
    
    // 로드 완료 알림
    setTimeout(() => {
        if (window.speechEnabled) {
            speakText('보훈케어 내비게이터가 완전히 로드되었습니다. 모든 기능을 사용할 수 있습니다.');
        }
    }, 2000);
});

// 페이지 언로드 시 진행상황 저장
window.addEventListener('beforeunload', function() {
    saveFormProgress();
});

// 브라우저 뒤로가기/앞으로가기 지원
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.step) {
        currentStep = event.state.step;
        showStep(currentStep);
        updateStepIndicator(currentStep);
    }
});

// 단계 변경시 히스토리 추가
function addToHistory(step) {
    const state = { step: step };
    const url = `${window.location.pathname}#step${step}`;
    history.pushState(state, `Step ${step}`, url);
}

// CSS 애니메이션 키프레임 추가
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(100%); opacity: 0; }
    }
    
    @keyframes fadeInUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    /* 길찾기 모달 스타일 */
    .navigation-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeInUp 0.3s ease;
    }
    
    .navigation-modal {
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #f0f0f0;
    }
    
    .modal-header h4 {
        color: #2c5aa0;
        margin: 0;
        font-size: 20px;
    }
    
    .close-btn {
        background: #dc3545;
        color: white;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }
    
    .close-btn:hover {
        background: #c82333;
        transform: scale(1.1);
    }
    
    .hospital-info-section {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    
    .address-info {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        font-weight: 500;
    }
    
    .address-info i {
        color: #dc3545;
        font-size: 16px;
    }
    
    .travel-info {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
    }
    
    .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #666;
    }
    
    .info-item i {
        color: #28a745;
    }
    
    .navigation-apps h5 {
        color: #2c5aa0;
        margin-bottom: 15px;
        font-size: 16px;
    }
    
    .nav-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
    }
    
    .nav-btn {
        background: white;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;
        min-height: 70px;
    }
    
    .nav-btn:hover {
        border-color: #2c5aa0;
        background: #f8f9fa;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(44, 90, 160, 0.2);
    }
    
    .nav-btn.kakao:hover { border-color: #fee500; background: #fffbf0; }
    .nav-btn.naver:hover { border-color: #03c75a; background: #f0fff4; }
    .nav-btn.tmap:hover { border-color: #ff6b35; background: #fff5f0; }
    .nav-btn.google:hover { border-color: #4285f4; background: #f0f4ff; }
    
    .nav-icon {
        font-size: 24px;
        flex-shrink: 0;
    }
    
    .nav-content {
        flex: 1;
    }
    
    .app-name {
        display: block;
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
    }
    
    .nav-content small {
        color: #666;
        font-size: 12px;
    }
    
    .web-navigation {
        border-top: 1px solid #e9ecef;
        padding-top: 20px;
        margin-bottom: 20px;
    }
    
    .web-navigation h5 {
        color: #6c757d;
        margin-bottom: 12px;
        font-size: 14px;
    }
    
    .web-buttons {
        display: flex;
        gap: 10px;
    }
    
    .web-btn {
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.3s ease;
        flex: 1;
    }
    
    .web-btn:hover {
        background: #5a6268;
        transform: translateY(-1px);
    }
    
    .additional-options {
        display: flex;
        gap: 10px;
        border-top: 1px solid #e9ecef;
        padding-top: 16px;
    }
    
    .option-btn {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        color: #495057;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.3s ease;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }
    
    .option-btn:hover {
        background: #e9ecef;
        border-color: #adb5bd;
    }
    
    /* 모바일 반응형 */
    @media (max-width: 768px) {
        .navigation-modal {
            margin: 20px;
            width: calc(100% - 40px);
        }
        
        .nav-buttons {
            grid-template-columns: 1fr;
        }
        
        .web-buttons,
        .additional-options {
            flex-direction: column;
        }
        
        .travel-info {
            flex-direction: column;
            gap: 8px;
        }
    }
    
    /* 접근성 개선 */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
    
    /* 드래그 상태 */
    .dragging {
        opacity: 0.5;
        transform: rotate(5deg);
    }
    
    /* 즐겨찾기 버튼 */
    .favorite-btn {
        background: none;
        border: none;
        color: #ccc;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 8px;
        border-radius: 50%;
    }
    
    .favorite-btn:hover {
        color: #e74c3c;
        transform: scale(1.2);
    }
    
    .favorite-btn.favorited {
        color: #e74c3c;
        animation: pulse 0.5s ease;
    }
    
    /* 별점 시스템 */
    .star-rating {
        display: flex;
        gap: 5px;
        font-size: 24px;
        margin: 10px 0;
    }
    
    .star {
        color: #ddd;
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;
    }
    
    .star:hover,
    .star.selected {
        color: #ffc107;
        transform: scale(1.2);
    }
    
    /* 성공 모달 */
    .modal-content.success {
        text-align: center;
        padding: 40px 30px;
    }
    
    .success-icon {
        font-size: 48px;
        color: #28a745;
        margin-bottom: 20px;
    }
    
    .btn-ok {
        background: #28a745;
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.3s ease;
        min-height: 44px;
    }
    
    .btn-ok:hover {
        background: #218838;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
`;
document.head.appendChild(additionalStyles);

// ==============================================
// PWA 지원 (Progressive Web App)
// ==============================================

// 서비스 워커 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker 등록 성공:', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker 등록 실패:', error);
            });
    });
}

// 앱 설치 프롬프트
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // 기본 설치 프롬프트 방지
    e.preventDefault();
    deferredPrompt = e;
    
    // 커스텀 설치 버튼 표시
    showInstallButton();
});

function showInstallButton() {
    const installBtn = document.createElement('button');
    installBtn.id = 'installApp';
    installBtn.innerHTML = '<i class="fas fa-download"></i><span>앱 설치</span>';
    installBtn.className = 'install-btn';
    installBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        min-height: 44px;
    `;
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('사용자가 PWA 설치를 수락했습니다');
                announceToScreenReader('앱이 설치되었습니다.');
            }
            
            deferredPrompt = null;
            installBtn.remove();
        }
    });
    
    document.body.appendChild(installBtn);
    
    // 5초 후 버튼에 주목 애니메이션
    setTimeout(() => {
        if (installBtn.parentNode) {
            installBtn.style.animation = 'pulse 2s infinite';
        }
    }, 5000);
}

// PWA 설치됨 감지
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA가 설치되었습니다');
    announceToScreenReader('보훈케어 내비게이터 앱이 홈화면에 추가되었습니다.');
});

// ==============================================
// 고급 데이터 분석 및 인사이트
// ==============================================

// 사용자 행동 분석
function setupUserAnalytics() {
    let userSession = {
        startTime: Date.now(),
        actions: [],
        currentStep: 1,
        searchCount: 0,
        errorCount: 0
    };
    
    // 사용자 액션 기록
    function trackAction(action, data = {}) {
        userSession.actions.push({
            action,
            data,
            timestamp: Date.now(),
            step: currentStep
        });
        
        // 로컬 스토리지에 저장 (분석용)
        if (safeLocalStorage()) {
            try {
                let analytics = JSON.parse(localStorage.getItem('userAnalytics') || '[]');
                analytics.push({
                    action,
                    data,
                    timestamp: Date.now(),
                    step: currentStep,
                    sessionId: userSession.startTime
                });
                
                // 최대 1000개 이벤트만 보관
                if (analytics.length > 1000) {
                    analytics = analytics.slice(-1000);
                }
                
                localStorage.setItem('userAnalytics', JSON.stringify(analytics));
            } catch (error) {
                console.warn('분석 데이터 저장 실패:', error);
            }
        }
    }
    
    // 주요 이벤트 추적
    window.trackAction = trackAction;
    
    // 단계 이동 추적
    const originalNextStep = nextStep;
    nextStep = function(stepNumber) {
        trackAction('step_change', { from: currentStep, to: stepNumber });
        return originalNextStep.call(this, stepNumber);
    };
    
    // 검색 실행 추적
    const originalGenerateRecommendation = generateRecommendation;
    generateRecommendation = function() {
        userSession.searchCount++;
        trackAction('search_executed', {
            formData: { ...formData },
            searchCount: userSession.searchCount
        });
        return originalGenerateRecommendation.call(this);
    };
    
    // 오류 추적
    window.addEventListener('error', (event) => {
        userSession.errorCount++;
        trackAction('error_occurred', {
            message: event.error?.message || 'Unknown error',
            filename: event.filename,
            lineno: event.lineno,
            errorCount: userSession.errorCount
        });
    });
    
    // 세션 종료 시 요약 저장
    window.addEventListener('beforeunload', function() {
        const sessionSummary = {
            ...userSession,
            endTime: Date.now(),
            duration: Date.now() - userSession.startTime,
            finalStep: currentStep
        };
        
        trackAction('session_end', sessionSummary);
    });
}

// 사용 패턴 분석 및 개선 제안
function generateUsageInsights() {
    if (!safeLocalStorage()) return null;
    
    try {
        const analytics = JSON.parse(localStorage.getItem('userAnalytics') || '[]');
        const recentData = analytics.filter(event => 
            Date.now() - event.timestamp < 7 * 24 * 60 * 60 * 1000 // 최근 7일
        );
        
        const insights = {
            totalSessions: new Set(recentData.map(e => e.sessionId)).size,
            totalSearches: recentData.filter(e => e.action === 'search_executed').length,
            averageStepsPerSession: 0,
            commonDropOffPoint: null,
            mostUsedFeatures: [],
            recommendations: []
        };
        
        // 세션별 단계 분석
        const sessions = {};
        recentData.forEach(event => {
            if (!sessions[event.sessionId]) {
                sessions[event.sessionId] = { maxStep: 1, actions: [] };
            }
            sessions[event.sessionId].maxStep = Math.max(sessions[event.sessionId].maxStep, event.step);
            sessions[event.sessionId].actions.push(event.action);
        });
        
        const completedSteps = Object.values(sessions).map(s => s.maxStep);
        insights.averageStepsPerSession = completedSteps.reduce((a, b) => a + b, 0) / completedSteps.length;
        
        // 중단점 분석
        const dropOffCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        completedSteps.forEach(step => {
            if (step < 4) dropOffCounts[step]++;
        });
        
        const maxDropOff = Math.max(...Object.values(dropOffCounts));
        insights.commonDropOffPoint = Object.keys(dropOffCounts).find(
            step => dropOffCounts[step] === maxDropOff
        );
        
        // 추천 생성
        if (insights.averageStepsPerSession < 2) {
            insights.recommendations.push('첫 번째 단계에서 이탈이 많습니다. 더 간단한 시작 방법을 제공해보세요.');
        }
        
        if (insights.totalSearches / insights.totalSessions < 0.5) {
            insights.recommendations.push('검색 완료율이 낮습니다. 단계별 안내를 개선해보세요.');
        }
        
        return insights;
        
    } catch (error) {
        console.error('사용 패턴 분석 실패:', error);
        return null;
    }
}

// 관리자용 인사이트 표시
window.showUsageInsights = function() {
    const insights = generateUsageInsights();
    
    if (!insights) {
        alert('사용 데이터가 충분하지 않습니다.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'insights-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h4><i class="fas fa-chart-line"></i> 사용 패턴 분석</h4>
                    <button onclick="this.closest('.insights-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="insights-content">
                    <div class="stat-grid">
                        <div class="stat-item">
                            <div class="stat-number">${insights.totalSessions}</div>
                            <div class="stat-label">총 세션 수</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${insights.totalSearches}</div>
                            <div class="stat-label">총 검색 수</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${insights.averageStepsPerSession.toFixed(1)}</div>
                            <div class="stat-label">평균 완료 단계</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${insights.commonDropOffPoint}단계</div>
                            <div class="stat-label">주요 이탈 지점</div>
                        </div>
                    </div>
                    
                    ${insights.recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h5><i class="fas fa-lightbulb"></i> 개선 제안</h5>
                        <ul>
                            ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button onclick="exportAnalyticsData()" class="btn-export">
                        <i class="fas fa-download"></i> 데이터 내보내기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

// 분석 데이터 내보내기
window.exportAnalyticsData = function() {
    if (!safeLocalStorage()) {
        alert('데이터를 내보낼 수 없습니다.');
        return;
    }
    
    try {
        const analytics = JSON.parse(localStorage.getItem('userAnalytics') || '[]');
        const insights = generateUsageInsights();
        
        const exportData = {
            generatedAt: new Date().toISOString(),
            summary: insights,
            rawData: analytics,
            metadata: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `veterans-care-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        announceToScreenReader('분석 데이터가 다운로드되었습니다.');
        
    } catch (error) {
        console.error('데이터 내보내기 실패:', error);
        alert('데이터 내보내기에 실패했습니다.');
    }
};

// ==============================================
// 최종 초기화 및 시작
// ==============================================

// 개발자 도구 감지 (보안)
function detectDevTools() {
    let devtools = { open: false, orientation: null };
    
    setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || 
            window.outerWidth - window.innerWidth > 200) {
            if (!devtools.open) {
                devtools.open = true;
                console.log('🔧 개발자 도구가 감지되었습니다.');
                console.log('📊 이 서비스는 보훈대상자를 위한 의료 정보 플랫폼입니다.');
                console.log('🚀 GitHub: https://github.com/veterans-care-navigator');
            }
        } else {
            devtools.open = false;
        }
    }, 500);
}

// 최종 시작 함수
function finalizeApplication() {
    // 보안 및 개발 기능
    detectDevTools();
    
    // 분석 시스템 활성화
    setupUserAnalytics();
    
    // 첫 액션 기록
    if (window.trackAction) {
        trackAction('app_initialized', {
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenSize: `${screen.width}x${screen.height}`,
            hasTouch: 'ontouchstart' in window
        });
    }
    
    // 콘솔 환영 메시지
    console.log(`
    🏥 보훈케어 내비게이터 v1.0.0
    =====================================
    
    📊 총 의료 데이터: 23,252개
    🤖 AI 추천 시스템: 활성화
    ♿ 접근성 기능: 완전 지원
    🗺️ 고급 길찾기: 다중 앱 지원
    📱 PWA 지원: 앱 설치 가능
    
    💡 개발자 명령어:
    - showUsageInsights(): 사용 패턴 분석
    - showSearchHistory(): 검색 기록 보기
    - showFeedbackForm(): 피드백 양식
    - toggleVoiceGuide(): 음성 안내 토글
    
    🎯 보훈대상자의 의료 접근성 향상을 위해 개발되었습니다.
    `);
    
    // 접근성 기능 자동 감지 및 적용
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('reduced-motion');
    }
    
    if (window.matchMedia('(prefers-contrast: high)').matches) {
        document.body.classList.add('high-contrast');
    }
    
    // 완료 알림
    setTimeout(() => {
        announceToScreenReader('보훈케어 내비게이터 초기화가 완전히 완료되었습니다. 모든 고급 기능을 사용할 수 있습니다.');
        
        if (window.speechEnabled) {
            speakText('보훈케어 내비게이터의 모든 기능이 준비되었습니다. 음성 안내, 고급 길찾기, 접근성 기능이 모두 활성화되었습니다.');
        }
    }, 3000);
}

// 애플리케이션 최종 시작
document.addEventListener('DOMContentLoaded', finalizeApplication);

// 디버그 모드 (개발 시에만 사용)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.DEBUG_MODE = true;
    window.debugInfo = {
        currentStep: () => currentStep,
        formData: () => formData,
        selectedSymptoms: () => selectedSymptoms,
        hospitalStats: () => hospitalStats,
        userLocation: () => userLocation
    };
    
    console.log('🐛 디버그 모드 활성화 - window.debugInfo 사용 가능');
}

// ==============================================
// 지도에서 보기 기능
// ==============================================

// 병원을 지도에서 보기
window.showOnMap = function(hospitalId, hospitalName, latitude, longitude) {
    console.log('🗺 지도에서 보기:', hospitalName);
    
    // 사용자 위치 정보 가져오기
    const userLat = userLocation?.latitude || userLocation?.lat;
    const userLng = userLocation?.longitude || userLocation?.lng;
    
    // URL 파라미터 구성
    const params = new URLSearchParams({
        hospital: hospitalId,
        name: encodeURIComponent(hospitalName),
        lat: latitude || '',
        lng: longitude || '',
        userLat: userLat || '',
        userLng: userLng || ''
    });
    
    // 지도 페이지로 이동
    window.open(`map.html?${params.toString()}`, '_blank');
    
    if (window.speechEnabled) {
        speakText(`${hospitalName}을 지도에서 확인합니다.`);
    }
};