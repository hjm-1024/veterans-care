// 누락된 함수들 정의

// checkAPIConnection 함수 정의
function checkAPIConnection() {
    console.log('API 연결 확인 중...');
    
    if (typeof window.veteransCareAPI !== 'undefined') {
        return window.veteransCareAPI.checkServerHealth()
            .then(() => {
                console.log('API 연결 성공');
                updateConnectionStatus(true);
                return true;
            })
            .catch(error => {
                console.error('API 연결 실패:', error);
                updateConnectionStatus(false);
                return false;
            });
    } else {
        console.error('VeteransCareAPI가 로드되지 않았습니다.');
        updateConnectionStatus(false);
        return Promise.resolve(false);
    }
}

// 연결 상태 UI 업데이트
function updateConnectionStatus(isConnected) {
    const statusIndicator = document.querySelector('.connection-status');
    if (!statusIndicator) return;
    
    if (isConnected) {
        statusIndicator.innerHTML = `
            <i class="fas fa-check-circle" style="color: #27ae60;"></i>
            <span style="color: #27ae60;">서버 연결됨</span>
        `;
    } else {
        statusIndicator.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
            <span style="color: #e74c3c;">서버 연결 실패</span>
            <button onclick="retryConnection()" style="margin-left: 10px; padding: 4px 8px; border: 1px solid #e74c3c; background: white; color: #e74c3c; border-radius: 4px; cursor: pointer;">재시도</button>
        `;
    }
}

// retryConnection 함수 정의
function retryConnection() {
    console.log('연결 재시도 중...');
    const retryBtn = document.querySelector('.connection-status button');
    if (retryBtn) {
        retryBtn.disabled = true;
        retryBtn.textContent = '재시도 중...';
    }
    
    checkAPIConnection().then(isConnected => {
        if (isConnected) {
            console.log('연결 재시도 성공');
            if (window.speechEnabled) {
                speakText('서버 연결이 복구되었습니다.');
            }
            // 성공 시 페이지 새로고침 또는 데이터 다시 로드
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            console.log('연결 재시도 실패');
            if (retryBtn) {
                retryBtn.disabled = false;
                retryBtn.textContent = '재시도';
            }
        }
    });
}

// 에러 처리 함수
function handleError(error, userMessage = '오류가 발생했습니다.') {
    console.error('오류 발생:', error);
    
    // 사용자에게 친화적인 에러 메시지 표시
    const errorModal = document.createElement('div');
    errorModal.style.cssText = `
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
    
    errorModal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        ">
            <div style="color: #e74c3c; font-size: 48px; margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h4 style="color: #333; margin-bottom: 15px;">알림</h4>
            <p style="color: #666; margin-bottom: 25px; line-height: 1.5;">
                ${userMessage}
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="retryConnection(); this.parentElement.parentElement.parentElement.remove();" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">다시 시도</button>
                <button onclick="this.parentElement.parentElement.parentElement.remove();" style="
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
    
    document.body.appendChild(errorModal);
    
    // 모달 외부 클릭 시 닫기
    errorModal.addEventListener('click', (e) => {
        if (e.target === errorModal) {
            errorModal.remove();
        }
    });
    
    // 음성 안내
    if (window.speechEnabled) {
        speakText(userMessage);
    }
}

// 페이지 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('보훈케어 내비게이터 시작');
    
    // API 객체가 로드될 때까지 대기
    const checkAPILoad = setInterval(() => {
        if (typeof window.veteransCareAPI !== 'undefined') {
            clearInterval(checkAPILoad);
            initializeData();
            loadHospitalStats();
        }
    }, 100);
    
    // 5초 후에도 API가 로드되지 않으면 기본 모드로 실행
    setTimeout(() => {
        if (typeof window.veteransCareAPI === 'undefined') {
            clearInterval(checkAPILoad);
            console.warn('API 로드 실패 - 기본 모드로 실행');
            initializeData();
            loadHospitalStats();
        }
    }, 5000);
});

// 초기화 함수가 정의되지 않은 경우를 위한 폴백
if (typeof initializeData === 'undefined') {
    window.initializeData = async function() {
        console.log('기본 초기화 함수 실행');
        // 기본 데이터 설정
        window.regionData = {
            'seoul': ['강남구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
            'busan': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
            'chungbuk': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '진천군', '청주시', '충주시', '증평군']
        };
    };
}

if (typeof loadHospitalStats === 'undefined') {
    window.loadHospitalStats = async function() {
        console.log('기본 통계 로드 함수 실행');
        // 기본 통계 표시
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) {
            heroSubtitle.innerHTML = `
                전국 <strong>1,200+개</strong> 의료기관과 연결된<br>
                보훈대상자 맞춤 의료서비스를 제공합니다.
            `;
        }
    };
}

// 전역 접근을 위한 함수 등록
window.checkAPIConnection = checkAPIConnection;
window.retryConnection = retryConnection;
window.handleError = handleError;
