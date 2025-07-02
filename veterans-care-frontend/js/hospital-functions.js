// 병원 관련 기능들 - 향상된 버전

// 병원 예약 기능
window.reserveHospital = function(hospitalName) {
    const message = `${hospitalName} 예약하기\n\n현재 예약 시스템은 준비 중입니다.\n직접 병원으로 연락하여 예약해주세요.`;
    
    if (confirm(message)) {
        // 향후 실제 예약 시스템 연동
        if (window.speechEnabled) {
            speakText(`${hospitalName} 예약을 위해 병원으로 직접 연락해주세요.`);
        }
    }
};

// 길찾기 기능
window.getDirections = function(hospitalName) {
    const hospital = getCurrentSelectedHospital(hospitalName);
    
    if (hospital && hospital.address) {
        // 카카오맵 길찾기 URL
        const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(hospitalName)},${hospital.latitude || ''},${hospital.longitude || ''}`;
        
        // 네이버 지도 길찾기 URL (백업)
        const naverMapUrl = `https://map.naver.com/v5/directions/-/-/-/car?c=${hospital.longitude || '127.0'},${hospital.latitude || '37.5'},15,0,0,0,dh`;
        
        // 앱이 설치되어 있으면 앱으로, 아니면 웹으로
        if (confirm(`${hospitalName}으로 길찾기\n\n카카오맵으로 연결하시겠습니까?`)) {
            window.open(kakaoMapUrl, '_blank');
        } else {
            window.open(naverMapUrl, '_blank');
        }
        
        if (window.speechEnabled) {
            speakText(`${hospitalName}으로 길찾기를 시작합니다.`);
        }
    } else {
        alert('병원 위치 정보를 찾을 수 없습니다.');
    }
};

// 전화하기 기능
window.callHospital = function(phoneNumber) {
    if (phoneNumber) {
        // 모바일에서는 tel: 링크로 전화 걸기
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            window.location.href = `tel:${phoneNumber}`;
        } else {
            // 데스크톱에서는 번호를 복사하고 알림
            navigator.clipboard.writeText(phoneNumber).then(() => {
                alert(`전화번호가 복사되었습니다: ${phoneNumber}`);
            }).catch(() => {
                alert(`전화번호: ${phoneNumber}`);
            });
        }
        
        if (window.speechEnabled) {
            speakText(`전화번호 ${phoneNumber}입니다.`);
        }
    }
};

// 현재 선택된 병원 정보 찾기 헬퍼 함수
function getCurrentSelectedHospital(hospitalName) {
    // 최근 추천 결과에서 병원 찾기
    if (window.lastRecommendations) {
        return window.lastRecommendations.find(h => 
            (h.name === hospitalName) || (h.hospital_name === hospitalName)
        );
    }
    return null;
}

// 병원 상세 정보 표시 (개선된 버전)
window.showHospitalDetail = async function(hospitalId) {
    console.log('병원 상세 정보 표시:', hospitalId);
    
    try {
        // 백엔드에서 상세 정보 가져오기 시도
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5001'}/api/hospitals/${hospitalId}`);
        
        if (response.ok) {
            const data = await response.json();
            const hospital = data.hospital || data;
            
            showHospitalModal(hospital);
        } else {
            // API 실패 시 기본 정보 표시
            showBasicHospitalInfo(hospitalId);
        }
    } catch (error) {
        console.error('병원 상세 정보 로딩 실패:', error);
        showBasicHospitalInfo(hospitalId);
    }
};

// 병원 상세 정보 모달 표시
function showHospitalModal(hospital) {
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
                    <i class="fas fa-hospital"></i> ${hospital.name || hospital.hospital_name || '병원 정보'}
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
            
            ${generateHospitalDetailContent(hospital)}
            
            <div style="margin-top: 30px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button onclick="reserveHospital('${hospital.name || hospital.hospital_name}'); this.parentElement.parentElement.parentElement.remove();" style="
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
                    min-height: 44px;
                ">
                    <i class="fas fa-calendar-check"></i> 예약하기
                </button>
                <button onclick="getDirections('${hospital.name || hospital.hospital_name}'); this.parentElement.parentElement.parentElement.remove();" style="
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
                    min-height: 44px;
                ">
                    <i class="fas fa-directions"></i> 길찾기
                </button>
                ${hospital.phone || hospital.contact_number ? `
                <button onclick="callHospital('${hospital.phone || hospital.contact_number}'); this.parentElement.parentElement.parentElement.remove();" style="
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
                    min-height: 44px;
                ">
                    <i class="fas fa-phone"></i> 전화하기
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// 병원 상세 정보 내용 생성
function generateHospitalDetailContent(hospital) {
    let content = '';
    
    // 기본 정보
    content += `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h5 style="color: #2c5aa0; margin-bottom: 15px;"><i class="fas fa-info-circle"></i> 기본 정보</h5>
            <div style="display: grid; gap: 10px;">
                ${hospital.address || hospital.full_address ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-map-marker-alt" style="color: #e74c3c; width: 20px;"></i>
                    <span><strong>주소:</strong> ${hospital.address || hospital.full_address}</span>
                </div>
                ` : ''}
                ${hospital.phone || hospital.contact_number ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-phone" style="color: #27ae60; width: 20px;"></i>
                    <span><strong>전화:</strong> ${hospital.phone || hospital.contact_number}</span>
                </div>
                ` : ''}
                ${hospital.distance ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-route" style="color: #3498db; width: 20px;"></i>
                    <span><strong>거리:</strong> ${hospital.distance}km</span>
                </div>
                ` : ''}
                ${hospital.hospital_type || hospital.type ? `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-building" style="color: #9b59b6; width: 20px;"></i>
                    <span><strong>유형:</strong> ${hospital.hospital_type || hospital.type}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // 보훈 혜택 정보
    if (hospital.veteran_benefits || hospital.benefits || hospital.is_veteran_hospital) {
        content += `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <h5 style="color: #856404; margin-bottom: 15px;"><i class="fas fa-medal"></i> 보훈 혜택</h5>
                <p style="margin: 0; line-height: 1.6; color: #856404;">
                    ${hospital.veteran_benefits || hospital.benefits || '보훈대상자 우대 서비스 제공'}
                </p>
            </div>
        `;
    }
    
    // 추천 이유 (있는 경우)
    if (hospital.recommendation_reason) {
        content += `
            <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #9c27b0;">
                <h5 style="color: #7b1fa2; margin-bottom: 15px;"><i class="fas fa-lightbulb"></i> 추천 이유</h5>
                <p style="margin: 0; line-height: 1.6; color: #7b1fa2;">
                    ${hospital.recommendation_reason}
                </p>
            </div>
        `;
    }
    
    return content;
}

// 기본 병원 정보 표시 (API 실패 시 폴백)
function showBasicHospitalInfo(hospitalId) {
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
                    min-height: 44px;
                ">닫기</button>
            </div>
        </div>
    `;
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) {
            modal.remove();
        }
    }
});

console.log('🏥 병원 기능 모듈 로드 완료');
