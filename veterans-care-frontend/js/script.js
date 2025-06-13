// 병원 액션 버튼 함수들
window.reserveHospital = function(hospitalName) {
    const message = `${hospitalName} 예약하기\n\n현재 예약 시스템은 준비 중입니다.\n직접 병원으로 연락하여 예약해주세요.`;
    
    if (confirm(message)) {
        // 향후 실제 예약 시스템 연동
        if (window.speechEnabled) {
            speakText(`${hospitalName} 예약을 위해 병원으로 직접 연락해주세요.`);
        }
    }
};

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

// 향상된 병원 상세 정보 모달
window.showEnhancedHospitalDetail = async function(hospitalId) {
    try {
        showLoadingSpinner('병원 상세 정보를 불러오는 중...');
        
        // 백엔드에서 상세 정보 가져오기
        const response = await api.getHospitalDetail(hospitalId);
        
        if (response.success && response.data) {
            const hospital = response.data;
            
            const modalHTML = `
                <div class="enhanced-modal-overlay" onclick="closeEnhancedModal()">
                    <div class="enhanced-modal-content" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h3>
                                <i class="fas fa-hospital"></i>
                                ${hospital.name || hospital.hospital_name || '병원 정보'}
                            </h3>
                            <button class="modal-close-btn" onclick="closeEnhancedModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <!-- 기본 정보 섹션 -->
                            <div class="info-section">
                                <h4><i class="fas fa-info-circle"></i> 기본 정보</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>병원 유형</label>
                                        <span>${hospital.type || hospital.hospital_type || '정보 없음'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>주소</label>
                                        <span>${hospital.address || hospital.full_address || '정보 없음'}</span>
                                    </div>
                                    ${hospital.phone || hospital.contact_number ? `
                                    <div class="info-item">
                                        <label>전화번호</label>
                                        <span>
                                            <a href="tel:${hospital.phone || hospital.contact_number}" class="phone-link">
                                                <i class="fas fa-phone"></i>
                                                ${hospital.phone || hospital.contact_number}
                                            </a>
                                        </span>
                                    </div>
                                    ` : ''}
                                    ${hospital.bed_count ? `
                                    <div class="info-item">
                                        <label>병상 수</label>
                                        <span>${hospital.bed_count}개</span>
                                    </div>
                                    ` : ''}
                                    ${hospital.department_count ? `
                                    <div class="info-item">
                                        <label>진료과 수</label>
                                        <span>${hospital.department_count}개</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- 진료 서비스 섹션 -->
                            ${hospital.medical_services && hospital.medical_services.length > 0 ? `
                            <div class="info-section">
                                <h4><i class="fas fa-user-md"></i> 진료 서비스</h4>
                                <div class="services-grid">
                                    ${hospital.medical_services.slice(0, 8).map(service => `
                                        <div class="service-card">
                                            <h5>${service.department || '일반 진료'}</h5>
                                            <p>${service.services || service.sub_department || '상세 정보 없음'}</p>
                                        </div>
                                    `).join('')}
                                </div>
                                ${hospital.medical_services.length > 8 ? `
                                <div class="show-more-services">
                                    <button onclick="showAllServices('${hospitalId}')" class="show-more-btn">
                                        <i class="fas fa-plus"></i>
                                        ${hospital.medical_services.length - 8}개 더보기
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            ` : ''}
                            
                            <!-- 의료 장비 섹션 -->
                            ${hospital.equipment && hospital.equipment.length > 0 ? `
                            <div class="info-section">
                                <h4><i class="fas fa-stethoscope"></i> 보유 의료장비</h4>
                                <div class="equipment-grid">
                                    ${hospital.equipment.map(eq => `
                                        <div class="equipment-item">
                                            <div class="equipment-name">${eq.equipment_name || eq.name || eq}</div>
                                            ${eq.equipment_category ? `<div class="equipment-category">${eq.equipment_category}</div>` : ''}
                                            ${eq.purpose ? `<div class="equipment-purpose">${eq.purpose}</div>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- 보훈 혜택 섹션 -->
                            ${hospital.veteran_benefits ? `
                            <div class="info-section highlight-section">
                                <h4><i class="fas fa-medal"></i> 보훈 혜택</h4>
                                <div class="benefits-content">
                                    <div class="benefit-highlight">
                                        ${hospital.veteran_benefits}
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- 비급여 가격 정보 섹션 -->
                            ${hospital.non_covered_services && hospital.non_covered_services.length > 0 ? `
                            <div class="info-section">
                                <h4><i class="fas fa-won-sign"></i> 비급여 진료비 정보</h4>
                                <div class="price-table">
                                    <div class="price-header">
                                        <span>서비스명</span>
                                        <span>가격</span>
                                        <span>카테고리</span>
                                    </div>
                                    ${hospital.non_covered_services.slice(0, 5).map(service => `
                                        <div class="price-row">
                                            <span class="service-name">${service.service_name || '서비스명'}</span>
                                            <span class="service-price">
                                                ${service.price_min && service.price_max ? 
                                                    `${service.price_min.toLocaleString()}원 ~ ${service.price_max.toLocaleString()}원` :
                                                    service.price_min ? `${service.price_min.toLocaleString()}원` :
                                                    '가격 문의'
                                                }
                                            </span>
                                            <span class="service-category">${service.service_category || '기타'}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                ${hospital.non_covered_services.length > 5 ? `
                                <div class="show-more-prices">
                                    <button onclick="showAllPrices('${hospitalId}')" class="show-more-btn">
                                        <i class="fas fa-plus"></i>
                                        ${hospital.non_covered_services.length - 5}개 가격 더보기
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            ` : ''}
                            
                            <!-- 액션 버튼들 -->
                            <div class="modal-actions">
                                <button class="modal-action-btn primary" onclick="reserveHospital('${hospital.name || hospital.hospital_name}')">
                                    <i class="fas fa-calendar-check"></i>
                                    예약하기
                                </button>
                                <button class="modal-action-btn secondary" onclick="getDirections('${hospital.name || hospital.hospital_name}')">
                                    <i class="fas fa-directions"></i>
                                    길찾기
                                </button>
                                ${hospital.phone || hospital.contact_number ? `
                                <button class="modal-action-btn tertiary" onclick="callHospital('${hospital.phone || hospital.contact_number}')">
                                    <i class="fas fa-phone"></i>
                                    전화하기
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 모달을 body에 추가
            const modalElement = document.createElement('div');
            modalElement.innerHTML = modalHTML;
            document.body.appendChild(modalElement);
            
            // 모달 스타일 추가
            addEnhancedModalStyles();
            
            // 음성 안내
            if (window.speechEnabled) {
                speakText(`${hospital.name || hospital.hospital_name} 상세 정보를 표시합니다.`);
            }
            
        } else {
            alert('병원 상세 정보를 불러올 수 없습니다.');
        }
    } catch (error) {
        console.error('병원 상세 정보 로드 오류:', error);
        alert('병원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
        hideLoadingSpinner();
    }
};

// 모달 닫기
window.closeEnhancedModal = function() {
    const modal = document.querySelector('.enhanced-modal-overlay');
    if (modal) {
        modal.remove();
    }
};

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEnhancedModal();
    }
});

// 향상된 모달 스타일 추가
function addEnhancedModalStyles() {
    if (document.getElementById('enhanced-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-modal-styles';
    style.textContent = `
        .enhanced-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .enhanced-modal-content {
            background: white;
            border-radius: 20px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.3s ease;
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .modal-header {
            background: linear-gradient(135deg, #2c5aa0 0%, #4a90e2 100%);
            color: white;
            padding: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .modal-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background 0.3s ease;
            min-width: 40px;
            min-height: 40px;
        }
        
        .modal-close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .modal-body {
            padding: 0;
            overflow-y: auto;
            max-height: calc(90vh - 140px);
        }
        
        .info-section {
            padding: 25px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .info-section:last-child {
            border-bottom: none;
        }
        
        .info-section h4 {
            color: #2c5aa0;
            font-size: 20px;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e8f4f8;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .info-item label {
            font-weight: 600;
            color: #666;
            font-size: 14px;
        }
        
        .info-item span {
            color: #333;
            font-size: 16px;
            line-height: 1.5;
        }
        
        .phone-link {
            color: #2c5aa0;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: color 0.3s ease;
        }
        
        .phone-link:hover {
            color: #1e3a5f;
        }
        
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .service-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #2c5aa0;
        }
        
        .service-card h5 {
            color: #2c5aa0;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        
        .service-card p {
            color: #666;
            margin: 0;
            line-height: 1.5;
            font-size: 14px;
        }
        
        .equipment-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .equipment-item {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #27ae60;
        }
        
        .equipment-name {
            font-weight: 600;
            color: #27ae60;
            margin-bottom: 5px;
        }
        
        .equipment-category {
            font-size: 12px;
            color: #666;
            background: #fff;
            padding: 4px 8px;
            border-radius: 12px;
            display: inline-block;
            margin-bottom: 5px;
        }
        
        .equipment-purpose {
            font-size: 13px;
            color: #666;
            line-height: 1.4;
        }
        
        .highlight-section {
            background: linear-gradient(135deg, #fff9e6 0%, #fef5e7 100%);
        }
        
        .benefit-highlight {
            background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
            color: #333;
            padding: 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
            line-height: 1.6;
            box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
        }
        
        .price-table {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .price-header {
            background: #f8f9fa;
            padding: 15px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 15px;
            font-weight: 600;
            color: #2c5aa0;
            border-bottom: 2px solid #e9ecef;
        }
        
        .price-row {
            padding: 15px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 15px;
            border-bottom: 1px solid #f0f0f0;
            align-items: center;
        }
        
        .price-row:last-child {
            border-bottom: none;
        }
        
        .price-row:hover {
            background: #f8f9fa;
        }
        
        .service-name {
            font-weight: 500;
            color: #333;
        }
        
        .service-price {
            color: #e74c3c;
            font-weight: 600;
        }
        
        .service-category {
            background: #e9ecef;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        
        .show-more-btn {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            color: #6c757d;
            padding: 15px;
            border-radius: 12px;
            width: 100%;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.3s ease;
            margin-top: 15px;
        }
        
        .show-more-btn:hover {
            background: #e9ecef;
            border-color: #adb5bd;
            color: #495057;
        }
        
        .modal-actions {
            padding: 25px;
            background: #f8f9fa;
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .modal-action-btn {
            flex: 1;
            max-width: 200px;
            padding: 15px 25px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s ease;
            min-height: 48px;
        }
        
        .modal-action-btn.primary {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
        }
        
        .modal-action-btn.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
        }
        
        .modal-action-btn.secondary {
            background: linear-gradient(135deg, #3498db 0%, #5dade2 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        
        .modal-action-btn.secondary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }
        
        .modal-action-btn.tertiary {
            background: linear-gradient(135deg, #e74c3c 0%, #ec7063 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        
        .modal-action-btn.tertiary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
        }
        
        @media (max-width: 768px) {
            .enhanced-modal-content {
                margin: 10px;
                max-height: 95vh;
            }
            
            .modal-header {
                padding: 20px;
            }
            
            .modal-header h3 {
                font-size: 20px;
            }
            
            .info-section {
                padding: 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .services-grid {
                grid-template-columns: 1fr;
            }
            
            .equipment-grid {
                grid-template-columns: 1fr;
            }
            
            .price-header,
            .price-row {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            
            .modal-actions {
                flex-direction: column;
                padding: 20px;
            }
            
            .modal-action-btn {
                max-width: none;
            }
        }
    `;
    
    document.head.appendChild(style);
}

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
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
}// 향상된 추천 결과 표시 시스템
window.displayEnhancedRecommendations = function(recommendations) {
    const resultsContainer = document.getElementById('recommendationResults');
    
    if (!recommendations || recommendations.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; color: #ddd;"></i>
                <h4>조건에 맞는 병원을 찾을 수 없습니다</h4>
                <p>검색 조건을 변경하여 다시 시도해주세요.</p>
            </div>
        `;
        return;
    }
    
    let resultsHTML = `
        <div class="enhanced-results-header">
            <h4>🤖 AI 맞춤 병원 추천</h4>
            <p>23,252개 데이터 분석 결과 • ${recommendations.length}개 병원 추천</p>
        </div>
    `;
    
    recommendations.forEach((hospital, index) => {
        const rankClass = index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : index === 2 ? 'rank-third' : '';
        
        resultsHTML += `
            <div class="enhanced-hospital-card ${rankClass}" onclick="showHospitalDetail('${hospital.id || hospital.hospital_id}')">
                <div class="hospital-rank-badge">
                    ${index + 1}위 추천
                    ${hospital.score ? `<span class="score">${hospital.score.toFixed(1)}점</span>` : ''}
                </div>
                
                <div class="hospital-main-info">
                    <h5 class="hospital-name">
                        <i class="fas fa-hospital"></i>
                        ${hospital.name || hospital.hospital_name || '이름 없음'}
                    </h5>
                    
                    <div class="hospital-meta">
                        ${hospital.type || hospital.hospital_type ? `
                        <span class="hospital-type">
                            <i class="fas fa-building"></i>
                            ${hospital.type || hospital.hospital_type}
                        </span>
                        ` : ''}
                        ${hospital.distance ? `
                        <span class="hospital-distance">
                            <i class="fas fa-map-marker-alt"></i>
                            ${hospital.distance}km
                        </span>
                        ` : ''}
                        ${hospital.estimated_wait_time ? `
                        <span class="hospital-wait-time">
                            <i class="fas fa-clock"></i>
                            ${hospital.estimated_wait_time}
                        </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="hospital-details">
                    <div class="hospital-address">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${hospital.address || hospital.full_address || '주소 정보 없음'}</span>
                    </div>
                    
                    ${hospital.phone || hospital.contact_number ? `
                    <div class="hospital-phone">
                        <i class="fas fa-phone"></i>
                        <span>${hospital.phone || hospital.contact_number}</span>
                    </div>
                    ` : ''}
                    
                    ${hospital.specialties ? `
                    <div class="hospital-specialties">
                        <i class="fas fa-user-md"></i>
                        <span><strong>전문분야:</strong> ${hospital.specialties}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${hospital.recommendation_reason ? `
                <div class="recommendation-reason">
                    <i class="fas fa-lightbulb"></i>
                    <strong>추천 이유:</strong> ${hospital.recommendation_reason}
                </div>
                ` : ''}
                
                ${hospital.veteran_benefits ? `
                <div class="veteran-benefits">
                    <i class="fas fa-medal"></i>
                    <div class="benefits-content">
                        <strong>보훈 혜택</strong>
                        <p>${hospital.veteran_benefits}</p>
                    </div>
                </div>
                ` : ''}
                
                ${hospital.equipment && Array.isArray(hospital.equipment) && hospital.equipment.length > 0 ? `
                <div class="hospital-equipment">
                    <i class="fas fa-stethoscope"></i>
                    <strong>보유 장비:</strong>
                    <div class="equipment-tags">
                        ${hospital.equipment.slice(0, 4).map(eq => `
                            <span class="equipment-tag">${eq.equipment_name || eq}</span>
                        `).join('')}
                        ${hospital.equipment.length > 4 ? `<span class="equipment-more">+${hospital.equipment.length - 4}개 더</span>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <div class="hospital-actions">
                    <button class="action-btn primary" onclick="event.stopPropagation(); reserveHospital('${hospital.name || hospital.hospital_name}')">
                        <i class="fas fa-calendar-check"></i>
                        예약하기
                    </button>
                    <button class="action-btn secondary" onclick="event.stopPropagation(); getDirections('${hospital.name || hospital.hospital_name}')">
                        <i class="fas fa-directions"></i>
                        길찾기
                    </button>
                    ${hospital.phone || hospital.contact_number ? `
                    <button class="action-btn tertiary" onclick="event.stopPropagation(); callHospital('${hospital.phone || hospital.contact_number}')">
                        <i class="fas fa-phone"></i>
                        전화
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = resultsHTML;
    
    // 향상된 스타일 추가
    addEnhancedRecommendationStyles();
    
    // 첫 번째 결과에 포커스
    const firstCard = document.querySelector('.enhanced-hospital-card');
    if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // 음성 안내
    if (window.speechEnabled) {
        speakText(`${recommendations.length}개의 맞춤 병원을 추천했습니다. ${recommendations[0].name || recommendations[0].hospital_name}이 가장 적합한 병원입니다.`);
    }
};

// 향상된 추천 결과 스타일 추가
function addEnhancedRecommendationStyles() {
    if (document.getElementById('enhanced-recommendation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-recommendation-styles';
    style.textContent = `
        .enhanced-results-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .enhanced-results-header h4 {
            font-size: 24px;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .enhanced-results-header p {
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
        }
        
        .enhanced-hospital-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        
        .enhanced-hospital-card:hover {
            border-color: #2c5aa0;
            box-shadow: 0 12px 32px rgba(44, 90, 160, 0.15);
            transform: translateY(-4px);
        }
        
        .enhanced-hospital-card.rank-first {
            border-left: 6px solid #FFD700;
            background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
        }
        
        .enhanced-hospital-card.rank-second {
            border-left: 6px solid #C0C0C0;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        }
        
        .enhanced-hospital-card.rank-third {
            border-left: 6px solid #CD7F32;
            background: linear-gradient(135deg, #fff5f0 0%, #ffffff 100%);
        }
        
        .hospital-rank-badge {
            position: absolute;
            top: -10px;
            right: 20px;
            background: #2c5aa0;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(44, 90, 160, 0.3);
        }
        
        .hospital-rank-badge .score {
            background: rgba(255,255,255,0.2);
            padding: 4px 8px;
            border-radius: 10px;
            font-size: 12px;
        }
        
        .rank-first .hospital-rank-badge {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #333;
        }
        
        .hospital-main-info {
            margin-bottom: 20px;
        }
        
        .hospital-name {
            font-size: 22px;
            color: #2c5aa0;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .hospital-name i {
            color: #e74c3c;
        }
        
        .hospital-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 14px;
            color: #666;
        }
        
        .hospital-meta span {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #f8f9fa;
            padding: 6px 12px;
            border-radius: 20px;
        }
        
        .hospital-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        
        .hospital-details > div {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        
        .hospital-details > div:last-child {
            margin-bottom: 0;
        }
        
        .hospital-details i {
            color: #2c5aa0;
            margin-top: 2px;
            min-width: 16px;
        }
        
        .recommendation-reason {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 12px 12px 0;
            font-size: 15px;
            color: #1976d2;
        }
        
        .recommendation-reason i {
            color: #ff9800;
            margin-right: 8px;
        }
        
        .veteran-benefits {
            background: linear-gradient(135deg, #fff3cd 0%, #fef9e7 100%);
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 12px 12px 0;
        }
        
        .veteran-benefits i {
            color: #f39c12;
            float: left;
            margin-right: 12px;
            margin-top: 2px;
            font-size: 18px;
        }
        
        .benefits-content strong {
            color: #856404;
            display: block;
            margin-bottom: 8px;
            font-size: 16px;
        }
        
        .benefits-content p {
            color: #856404;
            margin: 0;
            line-height: 1.6;
        }
        
        .hospital-equipment {
            background: #e8f5e8;
            padding: 15px;
            margin: 15px 0;
            border-radius: 12px;
            border-left: 4px solid #27ae60;
        }
        
        .hospital-equipment i {
            color: #27ae60;
            margin-right: 8px;
        }
        
        .equipment-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .equipment-tag {
            background: #27ae60;
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .equipment-more {
            background: #95a5a6;
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
        }
        
        .hospital-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px solid #f1f3f4;
        }
        
        .action-btn {
            flex: 1;
            min-width: 120px;
            padding: 14px 20px;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.3s ease;
            text-decoration: none;
            min-height: 48px;
        }
        
        .action-btn.primary {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
        }
        
        .action-btn.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
        }
        
        .action-btn.secondary {
            background: linear-gradient(135deg, #3498db 0%, #5dade2 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        
        .action-btn.secondary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }
        
        .action-btn.tertiary {
            background: linear-gradient(135deg, #e74c3c 0%, #ec7063 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        
        .action-btn.tertiary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .enhanced-hospital-card {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        .enhanced-hospital-card:nth-child(2) { animation-delay: 0.1s; }
        .enhanced-hospital-card:nth-child(3) { animation-delay: 0.2s; }
        .enhanced-hospital-card:nth-child(4) { animation-delay: 0.3s; }
        .enhanced-hospital-card:nth-child(5) { animation-delay: 0.4s; }
        .enhanced-hospital-card:nth-child(6) { animation-delay: 0.5s; }
        
        @media (max-width: 768px) {
            .enhanced-hospital-card {
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .hospital-actions {
                flex-direction: column;
            }
            
            .action-btn {
                flex: none;
                width: 100%;
            }
            
            .hospital-meta {
                flex-direction: column;
                gap: 8px;
            }
        }
    `;
    
    document.head.appendChild(style);
}// 병원 상세 정보 표시 (향상된 버전)
async function showHospitalDetail(hospitalId) {
    console.log('병원 상세 정보 표시:', hospitalId);
    
    // 로딩 모달 먼저 표시
    const loadingModal = createLoadingModal('병원 상세 정보를 불러오는 중...');
    document.body.appendChild(loadingModal);
    
    try {
        // 백엔드에서 병원 상세 정보 가져오기
        const hospitalDetail = await fetchHospitalDetail(hospitalId);
        
        // 로딩 모달 제거
        loadingModal.remove();
        
        // 상세 정보 모달 표시
        const detailModal = createHospitalDetailModal(hospitalDetail);
        document.body.appendChild(detailModal);
        
    } catch (error) {
        console.error('병원 상세 정보 로딩 실패:', error);
        
        // 로딩 모달 제거
        loadingModal.remove();
        
        // 기본 정보 모달 표시
        const basicModal = createBasicInfoModal(hospitalId);
        document.body.appendChild(basicModal);
    }
}

// 로딩 모달 생성
function createLoadingModal(message) {
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
            <div class="loading-spinner" style="
                border: 4px solid #f3f3f3;
                border-top: 4px solid #2c5aa0;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <p style="color: #666; margin: 0;">${message}</p>
        </div>
    `;
    
    return modal;
}

// 병원 상세 정보 API 호출
async function fetchHospitalDetail(hospitalId) {
    const apiUrl = `${window.API_BASE_URL || 'http://localhost:5001'}/api/hospitals/${hospitalId}`;
    
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
    
    // 모달 외부 클릭 시 닫기
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
    
    // 의료장비 정보 (있는 경우)
    if (hospitalDetail.equipment && Array.isArray(hospitalDetail.equipment) && hospitalDetail.equipment.length > 0) {
        content += `
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h5 style="color: #1976d2; margin-bottom: 15px;"><i class="fas fa-stethoscope"></i> 보유 의료장비</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${hospitalDetail.equipment.map(eq => `
                        <span style="
                            background: #bbdefb;
                            color: #1565c0;
                            padding: 6px 12px;
                            border-radius: 16px;
                            font-size: 14px;
                        ">${eq.equipment_name || eq}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 추천 이유 (있는 경우)
    if (hospitalDetail.recommendation_reason) {
        content += `
            <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #9c27b0;">
                <h5 style="color: #7b1fa2; margin-bottom: 15px;"><i class="fas fa-lightbulb"></i> 추천 이유</h5>
                <p style="margin: 0; line-height: 1.6; color: #7b1fa2;">
                    ${hospitalDetail.recommendation_reason}
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
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}// 전역 변수
window.API_BASE_URL = 'http://localhost:5001';
let currentStep = 1;
let selectedSymptoms = [];
let formData = {};
let regionData = {}; // API에서 로드될 지역 데이터
let userLocation = null; // 사용자 위치 정보
let hospitalStats = null; // 병원 통계 정보

// 진료과목과 증상 매핑 (백엔드 API와 연동)
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

// 샘플 병원 데이터 (실제로는 백엔드 API에서 가져옴)
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
    },
    {
        name: "삼성서울병원",
        address: "서울특별시 강남구 일원로 81",
        phone: "02-3410-2114",
        distance: "8.1km",
        waitTime: "60분",
        specialty: "내과, 외과, 신경외과, 순환기내과",
        benefits: "보훈 위탁병원 - 의료비 85% 지원"
    },
    {
        name: "서울대학교병원",
        address: "서울특별시 종로구 대학로 101",
        phone: "02-2072-2114",
        distance: "6.4km",
        waitTime: "50분",
        specialty: "내과, 외과, 신경외과, 정형외과",
        benefits: "보훈 위탁병원 - 의료비 90% 지원"
    }
];

// 병원 통계 데이터 로드 및 업데이트
async function loadHospitalStats() {
    try {
        const stats = await veteransCareAPI.getHospitalStats();
        
        // 히어로 섹션의 통계 업데이트
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle && stats) {
            const totalHospitals = stats.total_hospitals || '1,000+';
            heroSubtitle.innerHTML = `
                전국 <strong>${totalHospitals}개</strong> 의료기관과 연결된<br>
                보훈대상자 맞춤 의료서비스를 제공합니다.
            `;
        }
        
        hospitalStats = stats;
        console.log('병원 통계 데이터 로드 완료:', stats);
        
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

// 데이터 초기화 함수
async function initializeData() {
    try {
        // 지역 데이터 초기화 (실제로는 API에서 가져옴)
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
        
        // 병원 통계 데이터 로드 및 업데이트
        await loadHospitalStats();
        
        // 사용자 위치 정보 요청 (선택적)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    console.log('사용자 위치 정보 획득 완료');
                },
                (error) => {
                    console.log('위치 정보 획득 실패:', error.message);
                }
            );
        }
        
        console.log('데이터 초기화 완료');
        
    } catch (error) {
        console.error('데이터 초기화 오류:', error);
        handleError(error, '데이터 로딩 중 오류가 발생했습니다.');
    }
}

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', async function() {
    initializeEventListeners();
    setupVoiceGuide();
    await initializeData();
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
    // 모든 단계 표시기에서 active 클래스 제거
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // 현재 단계 표시기에 active 클래스 추가
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
                // 폴백: 기본 결과 표시
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
        displayHospitalResults();
    }
}

// 실제 AI 추천 API 호출 - 백엔드 연동 최적화
async function getAIRecommendations() {
    try {
        // 모든 폼 데이터를 종합하여 요청 데이터 구성
        const requestData = {
            // 기본 정보
            veteranType: formData.veteranType || 'NATIONAL_MERIT',
            disabilityGrade: formData.disabilityGrade,
            
            // 위치 정보
            region: formData.region,
            district: formData.district,
            
            // 증상 정보
            symptoms: formData.symptoms || [],
            urgency: formData.urgency || 'normal',
            
            // 사용자 위치 (있는 경우)
            ...(userLocation && {
                lat: userLocation.latitude,
                lng: userLocation.longitude
            }),
            
            // 기본 설정
            limit: 5
        };
        
        console.log('AI 추천 요청 데이터:', requestData);
        
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5001'}/api/hospitals/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('AI 추천 결과:', data);
        
        // 응답 데이터 구조 확인 및 정규화
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

// 기본 추천 결과 표시 (폴백)
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
                    ${hospital.estimated_wait_time ? `
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>대기시간: ${hospital.estimated_wait_time}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${hospital.specialties ? `
                <div class="info-item" style="margin-top: 12px;">
                    <i class="fas fa-user-md"></i>
                    <span><strong>전문분야:</strong> ${hospital.specialties}</span>
                </div>
                ` : ''}
                
                ${hospital.recommendation_reason ? `
                <div class="recommendation-reason">
                    <i class="fas fa-lightbulb"></i>
                    <strong>추천 이유:</strong> ${hospital.recommendation_reason}
                </div>
                ` : ''}
                
                ${hospital.veteran_benefits ? `
                <div class="hospital-benefits">
                    <h5><i class="fas fa-gift"></i> 보훈 혜택</h5>
                    <p>${hospital.veteran_benefits}</p>
                </div>
                ` : ''}
                
                <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn-reserve" onclick="event.stopPropagation(); reserveHospital('${hospital.name || hospital.hospital_name}')">
                        <i class="fas fa-calendar-check"></i> 예약하기
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
    
    // 향상된 스타일 추가
    addEnhancedResultStyles();
}

// 병원 결과 표시
function displayHospitalResults() {
    const resultsContainer = document.getElementById('recommendationResults');
    let resultsHTML = '<div class="results-header"><h5>🏥 추천 병원 목록</h5><p>회원님의 조건에 맞는 병원들입니다.</p></div>';
    
    // 지역에 따라 적절한 병원 필터링 (실제로는 서버에서 처리)
    let filteredHospitals = sampleHospitals;
    if (formData.region === 'busan') {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('부산'));
    } else {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('서울') || h.name.includes('중앙'));
    }
    
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
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>대기시간: ${hospital.waitTime}</span>
                    </div>
                </div>
                <div class="info-item" style="margin-top: 12px;">
                    <i class="fas fa-user-md"></i>
                    <span><strong>진료과목:</strong> ${hospital.specialty}</span>
                </div>
                <div class="hospital-benefits">
                    <h5><i class="fas fa-gift"></i> 보훈 혜택</h5>
                    <p>${hospital.benefits}</p>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 12px;">
                    <button class="btn-reserve" onclick="reserveHospital('${hospital.name}')" style="background: #27ae60; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 44px;">
                        <i class="fas fa-calendar-check"></i> 예약하기
                    </button>
                    <button class="btn-directions" onclick="getDirections('${hospital.name}')" style="background: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 44px;">
                        <i class="fas fa-directions"></i> 길찾기
                    </button>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = resultsHTML;
    
    // CSS 애니메이션을 위한 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .results-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .results-header h5 {
            font-size: 24px;
            color: #2c5aa0;
            margin-bottom: 8px;
        }
        .results-header p {
            color: #666;
            font-size: 16px;
        }
        .btn-reserve:hover {
            background: #219a52 !important;
        }
        .btn-directions:hover {
            background: #2980b9 !important;
        }
    `;
    document.head.appendChild(style);
}

// 향상된 결과 스타일 추가
function addEnhancedResultStyles() {
    if (document.getElementById('enhanced-result-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-result-styles';
    style.textContent = `
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
    `;
    
    document.head.appendChild(style);
}

// 병원 예약 기능 (향상됨)
function reserveHospital(hospitalName) {
    // 음성 안내
    if (window.speechEnabled) {
        speakText(`${hospitalName} 예약 기능을 실행합니다.`);
    }
    
    // 실제 예약 시스템 연동 예정
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
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 길찾기 기능 (향상됨)
function getDirections(hospitalName) {
    // 음성 안내
    if (window.speechEnabled) {
        speakText(`${hospitalName}로 길찾기를 시작합니다.`);
    }
    
    // 여러 지도 서비스 중 선택
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
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 지도 서비스별 열기 함수들
function openKakaoMap(hospitalName) {
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(hospitalName)}`;
    window.open(url, '_blank');
}

function openNaverMap(hospitalName) {
    const url = `https://map.naver.com/v5/search/${encodeURIComponent(hospitalName)}`;
    window.open(url, '_blank');
}

function openGoogleMaps(hospitalName) {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(hospitalName)}`;
    window.open(url, '_blank');
}

// 전화하기 기능 (향상됨)
function callHospital(phoneNumber) {
    if (!phoneNumber || phoneNumber === '전화번호 정보 없음') {
        alert('전화번호 정보가 없습니다.');
        return;
    }
    
    // 음성 안내
    if (window.speechEnabled) {
        speakText('병원에 전화를 겁니다.');
    }
    
    // 모바일에서는 바로 전화, 데스크톱에서는 확인 후 전화
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
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// 클립보드에 복사하기
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('전화번호가 복사되었습니다.');
        }).catch(() => {
            // 폴백: 수동 복사 안내
            promptManualCopy(text);
        });
    } else {
        // 폴백: 수동 복사 안내
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

// 음성 안내 설정
function setupVoiceGuide() {
    // 웹 음성 API 지원 확인
    if ('speechSynthesis' in window) {
        window.speechEnabled = false;
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
            button.style.background = '#e74c3c';
            window.speechSynthesis.cancel();
        }
    }
}

// 텍스트를 음성으로 변환
function speakText(text) {
    if ('speechSynthesis' in window && window.speechEnabled) {
        // 기존 음성 중지
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8; // 느린 속도로 설정 (고령자 친화적)
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        // 한국어 음성 찾기
        const voices = speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice => voice.lang.includes('ko'));
        if (koreanVoice) {
            utterance.voice = koreanVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

// 스크린 리더 사용자를 위한 공지
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // 음성 안내가 켜져있으면 함께 읽기
    if (window.speechEnabled) {
        setTimeout(() => speakText(message), 100);
    }
    
    // 3초 후 제거
    setTimeout(() => {
        if (announcement.parentNode) {
            announcement.parentNode.removeChild(announcement);
        }
    }, 3000);
}

// 키보드 네비게이션 처리
function handleKeyboardNavigation(event) {
    // ESC 키로 음성 중지
    if (event.key === 'Escape' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // Enter 키로 증상 카드 선택
    if (event.key === 'Enter' && event.target.classList.contains('symptom-card')) {
        event.preventDefault();
        toggleSymptom(event);
    }
    
    // 탭 키 네비게이션 개선
    if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
            'button, select, input, a, [tabindex]:not([tabindex="-1"]), .symptom-card'
        );
        
        // 현재 포커스된 요소가 마지막 요소인 경우
        if (event.target === focusableElements[focusableElements.length - 1] && !event.shiftKey) {
            // 첫 번째 요소로 이동 (순환)
            event.preventDefault();
            focusableElements[0].focus();
        }
        // 현재 포커스된 요소가 첫 번째 요소이고 Shift+Tab인 경우
        else if (event.target === focusableElements[0] && event.shiftKey) {
            // 마지막 요소로 이동 (순환)
            event.preventDefault();
            focusableElements[focusableElements.length - 1].focus();
        }
    }
}

// 폼 데이터 저장 (로컬 스토리지 대신 메모리 사용)
function saveFormData() {
    // 실제 구현에서는 서버에 저장하거나 세션 스토리지 사용
    window.formDataBackup = { ...formData };
}

// 폼 데이터 복원
function restoreFormData() {
    if (window.formDataBackup) {
        formData = { ...window.formDataBackup };
        
        // 폼 필드에 데이터 복원
        if (formData.veteranType) {
            document.getElementById('veteranType').value = formData.veteranType;
        }
        if (formData.disabilityGrade) {
            document.getElementById('disabilityGrade').value = formData.disabilityGrade;
        }
        if (formData.region) {
            document.getElementById('region').value = formData.region;
            updateDistrictOptions();
            if (formData.district) {
                setTimeout(() => {
                    document.getElementById('district').value = formData.district;
                }, 100);
            }
        }
        if (formData.symptoms) {
            selectedSymptoms = [...formData.symptoms];
            formData.symptoms.forEach(symptom => {
                const card = document.querySelector(`[data-value="${symptom}"]`);
                if (card) {
                    card.classList.add('selected');
                }
            });
        }
        if (formData.urgency) {
            const urgencyRadio = document.querySelector(`input[name="urgency"][value="${formData.urgency}"]`);
            if (urgencyRadio) {
                urgencyRadio.checked = true;
            }
        }
    }
}

// 페이지 언로드 시 데이터 저장
window.addEventListener('beforeunload', saveFormData);

// 페이지 로드 시 데이터 복원
window.addEventListener('load', restoreFormData);

// 가까운 병원 백업 검색
async function getNearbyHospitalsAsBackup() {
    try {
        let lat = 37.5665; // 서울시청 기본값
        let lng = 126.9780;
        
        if (userLocation) {
            lat = userLocation.latitude;
            lng = userLocation.longitude;
        } else if (formData.region) {
            const regionCoords = {
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
            
            if (regionCoords[formData.region]) {
                lat = regionCoords[formData.region].lat;
                lng = regionCoords[formData.region].lng;
            }
        }
        
        const response = await fetch(`http://localhost:5001/api/hospitals/nearby?lat=${lat}&lng=${lng}&radius=50&limit=5`);
        
        if (!response.ok) {
            throw new Error(`근처 병원 검색 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.hospitals) {
            return data.data.hospitals;
        } else if (data.hospitals) {
            return data.hospitals;
        } else if (Array.isArray(data)) {
            return data;
        }
        
        return [];
        
    } catch (error) {
        console.error('백업 병원 검색 오류:', error);
        return [];
    }
}

// 폴백 결과 표시 (서버 연결 실패 시)
function displayFallbackResults() {
    const resultsContainer = document.getElementById('recommendationResults');
    
    // 지역에 따라 적절한 병원 필터링
    let filteredHospitals = sampleHospitals;
    if (formData.region === 'busan') {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('부산'));
    } else if (formData.region === 'daejeon') {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('대전') || h.name.includes('중앙'));
    } else {
        filteredHospitals = sampleHospitals.filter(h => h.name.includes('서울') || h.name.includes('중앙') || h.name.includes('삼성') || h.name.includes('서울대'));
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
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>대기시간: ${hospital.waitTime}</span>
                    </div>
                </div>
                <div class="info-item" style="margin-top: 12px;">
                    <i class="fas fa-user-md"></i>
                    <span><strong>진료과목:</strong> ${hospital.specialty}</span>
                </div>
                <div class="hospital-benefits">
                    <h5><i class="fas fa-gift"></i> 보훈 혜택</h5>
                    <p>${hospital.benefits}</p>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
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

// 병원 결과 표시 (기존 함수 - 호환성 유지)
function displayHospitalResults() {
    displayFallbackResults();
}

// 접근성 개선을 위한 추가 기능들

// 포커스 표시 개선
function enhanceFocusVisibility() {
    const style = document.createElement('style');
    style.textContent = `
        .symptom-card:focus {
            outline: 3px solid #2c5aa0;
            outline-offset: 2px;
            box-shadow: 0 0 0 6px rgba(44, 90, 160, 0.2);
        }
        
        .radio-option:focus-within {
            outline: 3px solid #2c5aa0;
            outline-offset: 2px;
        }
        
        button:focus, select:focus, input:focus {
            box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.3);
        }
    `;
    document.head.appendChild(style);
}

// 고대비 모드 지원
function setupHighContrastMode() {
    const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (isHighContrast) {
        document.body.classList.add('high-contrast');
    }
    
    // 고대비 모드 변경 감지
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
        if (e.matches) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    });
}

// 애니메이션 감소 모드 지원
function setupReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        document.body.classList.add('reduced-motion');
    }
}

// 큰 텍스트 모드 지원
function setupLargeTextMode() {
    // 사용자가 브라우저에서 폰트 크기를 크게 설정한 경우 감지
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (rootFontSize > 16) {
        document.body.classList.add('large-text');
    }
}

// 터치 디바이스 지원 개선
function setupTouchSupport() {
    // 터치 디바이스 감지
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        // 터치 영역 확대
        const style = document.createElement('style');
        style.textContent = `
            .touch-device button,
            .touch-device select,
            .touch-device .symptom-card,
            .touch-device .radio-option {
                min-height: 48px;
                min-width: 48px;
            }
            
            .touch-device .symptom-card {
                padding: 20px;
            }
        `;
        document.head.appendChild(style);
    }
}

// 에러 처리 및 사용자 피드백
function handleError(error, userMessage = '오류가 발생했습니다. 다시 시도해주세요.') {
    console.error('Error:', error);
    
    // 사용자에게 친화적인 에러 메시지 표시
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.innerHTML = `
        <div style="background: #fee; border: 2px solid #e74c3c; color: #c0392b; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
            ${userMessage}
        </div>
    `;
    
    const mainContent = document.querySelector('.main');
    if (mainContent) {
        mainContent.insertBefore(errorContainer, mainContent.firstChild);
        
        // 5초 후 에러 메시지 제거
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.parentNode.removeChild(errorContainer);
            }
        }, 5000);
    }
    
    // 스크린 리더에 알림
    announceToScreenReader(userMessage);
}

// 성공 메시지 표시
function showSuccessMessage(message) {
    const successContainer = document.createElement('div');
    successContainer.className = 'success-message';
    successContainer.innerHTML = `
        <div style="background: #e8f5e8; border: 2px solid #27ae60; color: #2d5016; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
            ${message}
        </div>
    `;
    
    const mainContent = document.querySelector('.main');
    if (mainContent) {
        mainContent.insertBefore(successContainer, mainContent.firstChild);
        
        // 3초 후 성공 메시지 제거
        setTimeout(() => {
            if (successContainer.parentNode) {
                successContainer.parentNode.removeChild(successContainer);
            }
        }, 3000);
    }
    
    announceToScreenReader(message);
}

// 초기화 함수들 실행
document.addEventListener('DOMContentLoaded', function() {
    enhanceFocusVisibility();
    setupHighContrastMode();
    setupReducedMotion();
    setupLargeTextMode();
    setupTouchSupport();
    
    // 음성 API 로드 대기
    if ('speechSynthesis' in window) {
        // 음성 목록 로드 대기
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

// 전역 에러 핸들러
window.addEventListener('error', function(event) {
    handleError(event.error, '페이지에서 오류가 발생했습니다. 페이지를 새로고침하거나 고객센터에 문의해주세요.');
});

// 네트워크 상태 감지
window.addEventListener('online', function() {
    showSuccessMessage('인터넷 연결이 복구되었습니다.');
});

window.addEventListener('offline', function() {
    handleError(new Error('Network offline'), '인터넷 연결이 끊어졌습니다. 연결을 확인해주세요.');
});

// 브라우저 호환성 체크
function checkBrowserCompatibility() {
    const isCompatible = 
        'querySelector' in document &&
        'addEventListener' in window &&
        'classList' in document.createElement('div');
    
    if (!isCompatible) {
        handleError(
            new Error('Browser compatibility'),
            '브라우저가 이 서비스를 완전히 지원하지 않습니다. 최신 브라우저로 업데이트해주세요.'
        );
    }
}

// 페이지 성능 모니터링
function monitorPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                try {
                    // 최신 Performance API 사용 (권장)
                    if ('getEntriesByType' in performance) {
                        const navigationEntries = performance.getEntriesByType('navigation');
                        if (navigationEntries.length > 0) {
                            const loadTime = navigationEntries[0].loadEventEnd - navigationEntries[0].loadEventStart;
                            
                            if (loadTime > 5000) {
                                console.warn('페이지 로딩이 느립니다:', loadTime + 'ms');
                            }
                            return;
                        }
                    }
                    
                    // 레거시 API 사용 (안전하게 체크)
                    if ('navigation' in performance && 
                        performance.navigation.timing && 
                        performance.navigation.timing.loadEventEnd && 
                        performance.navigation.timing.navigationStart) {
                        
                        const loadTime = performance.navigation.timing.loadEventEnd - 
                                        performance.navigation.timing.navigationStart;
                        
                        // 로딩이 5초 이상 걸린 경우 사용자에게 알림
                        if (loadTime > 5000) {
                            console.warn('페이지 로딩이 느립니다:', loadTime + 'ms');
                        }
                    } else {
                        console.log('성능 측정 API를 사용할 수 없습니다.');
                    }
                    
                } catch (error) {
                    console.warn('성능 모니터링 중 오류:', error.message);
                }
            }, 1000); // 1초 대기로 증가 (로딩 완료 보장)
        });
    }
}

// 사용자 활동 추적 (접근성 개선을 위해)
function trackUserActivity() {
    let inactiveTime = 0;
    const maxInactiveTime = 300000; // 5분
    
    // 비활성 시간 초기화 함수
    function resetInactiveTime() {
        inactiveTime = 0;
    }
    
    // 사용자 활동 감지 이벤트들
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, resetInactiveTime, true);
    });
    
    // 1분마다 비활성 시간 체크
    setInterval(() => {
        inactiveTime += 60000;
        
        // 5분 비활성 시 알림
        if (inactiveTime >= maxInactiveTime) {
            if (window.speechEnabled) {
                speakText('5분간 활동이 없었습니다. 도움이 필요하시면 고객센터에 문의해주세요.');
            }
            inactiveTime = 0; // 알림 후 초기화
        }
    }, 60000);
}

// 모든 초기화 함수 실행
checkBrowserCompatibility();
monitorPerformance();
trackUserActivity();