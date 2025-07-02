/**
 * 보훈케어 내비게이터 - 지도 기능 모듈
 * 기존 API 클래스와 완전히 호환되는 지도 전용 기능들
 */

// 전역 지도 관련 변수
let markerClusterGroup = null;
let heatmapLayer = null;
let userLocationMarker = null;

// 지도 모드 설정
function setMapMode(mode) {
    currentMode = mode;
    
    // 모든 모드 버튼 비활성화
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택된 모드 버튼 활성화
    document.getElementById(`${mode}-mode`).classList.add('active');
    
    // 기존 레이어 제거
    clearAllLayers();
    
    // 새로운 모드로 표시
    displayHospitals();
}

// 모든 레이어 제거
function clearAllLayers() {
    if (markerClusterGroup) {
        map.removeLayer(markerClusterGroup);
    }
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
    }
    
    // 개별 마커들 제거
    currentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentMarkers = [];
}

// 병원 데이터 표시 (모드에 따라)
function displayHospitals() {
    clearAllLayers();
    
    if (filteredHospitals.length === 0) {
        return;
    }
    
    switch (currentMode) {
        case 'markers':
            displayMarkersMode();
            break;
        case 'clusters':
            displayClustersMode();
            break;
        case 'heatmap':
            displayHeatmapMode();
            break;
    }
}

// 마커 모드 표시
function displayMarkersMode() {
    filteredHospitals.forEach(hospital => {
        const marker = createHospitalMarker(hospital);
        marker.addTo(map);
        currentMarkers.push(marker);
    });
}

// 클러스터 모드 표시
function displayClustersMode() {
    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let className = 'marker-cluster marker-cluster-';
            
            if (count < 10) {
                className += 'small';
            } else if (count < 100) {
                className += 'medium';
            } else {
                className += 'large';
            }
            
            return new L.DivIcon({
                html: `<div><span>${count}</span></div>`,
                className: className,
                iconSize: new L.Point(40, 40)
            });
        }
    });
    
    filteredHospitals.forEach(hospital => {
        const marker = createHospitalMarker(hospital);
        markerClusterGroup.addLayer(marker);
    });
    
    map.addLayer(markerClusterGroup);
}

// 히트맵 모드 표시
function displayHeatmapMode() {
    const heatData = filteredHospitals.map(hospital => {
        const intensity = getHospitalIntensity(hospital);
        return [hospital.latitude, hospital.longitude, intensity];
    });
    
    heatmapLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
            0.0: '#3CB371',
            0.5: '#FFD700', 
            1.0: '#FF6B35'
        }
    });
    
    map.addLayer(heatmapLayer);
}

// 병원 강도 계산 (히트맵용)
function getHospitalIntensity(hospital) {
    let intensity = 0.3; // 기본값
    
    // 병원 유형별 가중치
    const hospitalType = hospital.type || hospital.hospital_type || '';
    switch (hospitalType) {
        case '상급종합병원':
            intensity = 1.0;
            break;
        case '종합병원':
            intensity = 0.8;
            break;
        case '보훈병원':
            intensity = 0.9;
            break;
        case '병원':
            intensity = 0.6;
            break;
        case '의원':
            intensity = 0.4;
            break;
        case '한의원':
            intensity = 0.3;
            break;
    }
    
    // 병상 수에 따른 조정
    const beds = hospital.beds || hospital.bed_count || 0;
    if (beds > 500) {
        intensity += 0.2;
    } else if (beds > 200) {
        intensity += 0.1;
    }
    
    return Math.min(intensity, 1.0);
}

// 병원 마커 생성
function createHospitalMarker(hospital) {
    const markerIcon = getMarkerIcon(hospital);
    const marker = L.marker([hospital.latitude, hospital.longitude], {
        icon: markerIcon
    });
    
    // 팝업 내용 생성
    const popupContent = createPopupContent(hospital);
    marker.bindPopup(popupContent);
    
    // 클릭 이벤트
    marker.on('click', function() {
        showHospitalInfo(hospital);
    });
    
    return marker;
}

// 마커 아이콘 생성
function getMarkerIcon(hospital) {
    let color = '#2E8B57'; // 기본 색상
    let size = 20;
    
    // 병원 유형별 색상
    if (isVeteranHospital(hospital)) {
        color = '#FF6B35'; // 보훈병원
        size = 24;
    } else if (hospital.recommended) {
        color = '#FFD700'; // 추천 병원
        size = 26;
    } else {
        const hospitalType = hospital.type || hospital.hospital_type || '';
        switch (hospitalType) {
            case '상급종합병원':
            case '종합병원':
                color = '#2E8B57';
                break;
            case '병원':
                color = '#3CB371';
                break;
            case '의원':
                color = '#90EE90';
                break;
            case '한의원':
                color = '#98FB98';
                break;
        }
    }
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

// 보훈병원 확인
function isVeteranHospital(hospital) {
    const veteranHospitalNames = [
        '중앙보훈병원', '대전보훈병원', '부산보훈병원', 
        '광주보훈병원', '대구보훈병원', '인천보훈병원'
    ];
    
    const hospitalName = hospital.name || hospital.hospital_name || '';
    return veteranHospitalNames.some(name => hospitalName.includes(name)) ||
           (hospital.type || hospital.hospital_type) === '보훈병원';
}

// 팝업 내용 생성
function createPopupContent(hospital) {
    const hospitalName = hospital.name || hospital.hospital_name || '상세정보 없음';
    const hospitalType = hospital.type || hospital.hospital_type || '미상';
    const hospitalAddress = hospital.address || hospital.full_address || '';
    const hospitalPhone = hospital.phone || hospital.contact_number || '';
    const hospitalBeds = hospital.beds || hospital.bed_count || '';
    const hospitalDepts = hospital.departments || hospital.department_count || '';
    
    let content = `
        <div class="popup-hospital-name">${hospitalName}</div>
        <div class="popup-hospital-type">${hospitalType}</div>
        <div class="popup-hospital-details">
    `;
    
    if (hospitalAddress) {
        content += `📍 ${hospitalAddress}<br>`;
    }
    
    if (hospitalPhone) {
        content += `📞 ${hospitalPhone}<br>`;
    }
    
    if (hospitalBeds) {
        content += `🏥 병상: ${hospitalBeds}개<br>`;
    }
    
    if (hospitalDepts) {
        content += `🏢 진료과: ${hospitalDepts}개<br>`;
    }
    
    // 거리 표시 (사용자 위치가 있는 경우)
    if (userLocation) {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            hospital.latitude, hospital.longitude
        );
        content += `<div class="popup-distance">📏 약 ${distance.toFixed(1)}km</div>`;
    }
    
    content += `
        </div>
        <button onclick="showHospitalInfo(${JSON.stringify(hospital).replace(/"/g, '&quot;')})" 
                style="width: 100%; padding: 8px; background: #2E8B57; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px;">
            상세 정보 보기
        </button>
    `;
    
    return content;
}

// 거리 계산 (하버사인 공식)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRadians(degrees) {
    return degrees * (Math.PI/180);
}

// 필터링 함수
function filterHospitals() {
    const typeFilter = document.getElementById('hospital-type-filter').value;
    const regionFilter = document.getElementById('region-filter').value;
    
    filteredHospitals = allHospitals.filter(hospital => {
        let typeMatch = true;
        let regionMatch = true;
        
        // 타입 필터
        if (typeFilter) {
            if (typeFilter === '보훈병원') {
                typeMatch = isVeteranHospital(hospital);
            } else {
                const hospitalType = hospital.type || hospital.hospital_type || '';
                typeMatch = hospitalType === typeFilter;
            }
        }
        
        // 지역 필터
        if (regionFilter) {
            const hospitalAddress = hospital.address || hospital.full_address || '';
            regionMatch = hospitalAddress.includes(regionFilter);
        }
        
        return typeMatch && regionMatch;
    });
    
    updateStats();
    displayHospitals();
}

// 사용자 위치 획득
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
        return;
    }
    
    const loadingBtn = document.querySelector('.nav-btn.primary');
    const originalText = loadingBtn.textContent;
    loadingBtn.textContent = '📍 위치 확인 중...';
    loadingBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            userLocation = { lat, lng };
            addUserLocationMarker(lat, lng);
            
            // 지도 중심을 사용자 위치로 이동
            map.setView([lat, lng], 12);
            
            loadingBtn.textContent = originalText;
            loadingBtn.disabled = false;
            
            // 가까운 병원들 다시 표시
            displayHospitals();
        },
        function(error) {
            console.error('위치 획득 오류:', error);
            alert('위치를 가져올 수 없습니다. 설정을 확인해주세요.');
            
            loadingBtn.textContent = originalText;
            loadingBtn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// 사용자 위치 마커 추가
function addUserLocationMarker(lat, lng) {
    if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
    }
    
    userLocationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: `<div style="
                background: #007bff;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,123,255,0.5);
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: -5px;
                    left: -5px;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: rgba(0,123,255,0.2);
                    animation: pulse 2s infinite;
                "></div>
            </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    });
    
    userLocationMarker.addTo(map);
    userLocationMarker.bindPopup('📍 내 위치');
}

// 추천된 병원 표시 (메인 페이지에서 전달받은 경우)
function displayRecommendedHospitals(recommendations) {
    // 추천 병원에 특별 표시
    recommendations.forEach(rec => {
        rec.recommended = true;
    });
    
    // 전체 병원 데이터와 병합
    allHospitals = [...recommendations, ...allHospitals.filter(h => 
        !recommendations.some(r => (r.id === h.id) || (r.name === h.name))
    )];
    
    filteredHospitals = [...allHospitals];
    updateStats();
    displayHospitals();
    
    // 추천 병원들의 경계에 맞춰 지도 확대
    if (recommendations.length > 0) {
        const group = new L.featureGroup(
            recommendations.map(hospital => 
                L.marker([hospital.latitude, hospital.longitude])
            )
        );
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// 병원 상세 정보 패널 표시
function showHospitalInfo(hospital) {
    selectedHospital = hospital;
    
    const hospitalName = hospital.name || hospital.hospital_name || '상세정보 없음';
    document.getElementById('panel-hospital-name').textContent = hospitalName;
    
    const hospitalType = hospital.type || hospital.hospital_type || '미상';
    const hospitalAddress = hospital.address || hospital.full_address || '';
    const hospitalPhone = hospital.phone || hospital.contact_number || '';
    const hospitalBeds = hospital.beds || hospital.bed_count || '';
    const hospitalDepts = hospital.departments || hospital.department_count || '';
    
    let detailsHTML = `
        <div style="margin-bottom: 16px;">
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <strong>🏥 ${hospitalType}</strong>
            </div>
    `;
    
    if (hospitalAddress) {
        detailsHTML += `
            <div style="margin-bottom: 8px;">
                <strong>📍 주소:</strong><br>
                <span style="color: #666;">${hospitalAddress}</span>
            </div>
        `;
    }
    
    if (hospitalPhone) {
        detailsHTML += `
            <div style="margin-bottom: 8px;">
                <strong>📞 전화:</strong>
                <a href="tel:${hospitalPhone}" style="color: #2E8B57; text-decoration: none;">
                    ${hospitalPhone}
                </a>
            </div>
        `;
    }
    
    if (hospitalBeds) {
        detailsHTML += `
            <div style="margin-bottom: 8px;">
                <strong>🏥 병상수:</strong> ${hospitalBeds}개
            </div>
        `;
    }
    
    if (hospitalDepts) {
        detailsHTML += `
            <div style="margin-bottom: 8px;">
                <strong>🏢 진료과수:</strong> ${hospitalDepts}개
            </div>
        `;
    }
    
    if (userLocation) {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            hospital.latitude, hospital.longitude
        );
        detailsHTML += `
            <div style="margin-bottom: 8px;">
                <strong>📏 거리:</strong> 약 ${distance.toFixed(1)}km
            </div>
        `;
    }
    
    if (isVeteranHospital(hospital)) {
        detailsHTML += `
            <div style="background: #ff6b35; color: white; padding: 8px; border-radius: 6px; margin-top: 12px; text-align: center;">
                🏆 보훈병원 - 보훈대상자 전문 진료
            </div>
        `;
    }
    
    if (hospital.recommended) {
        detailsHTML += `
            <div style="background: #ffd700; color: #333; padding: 8px; border-radius: 6px; margin-top: 12px; text-align: center;">
                ⭐ AI 추천 병원
            </div>
        `;
    }
    
    detailsHTML += '</div>';
    
    document.getElementById('panel-hospital-details').innerHTML = detailsHTML;
    document.getElementById('hospital-info-panel').style.display = 'block';
}

// 정보 패널 닫기
function closeInfoPanel() {
    document.getElementById('hospital-info-panel').style.display = 'none';
    selectedHospital = null;
}

// 길찾기 열기
function openDirections() {
    if (!selectedHospital) return;
    
    const destination = `${selectedHospital.latitude},${selectedHospital.longitude}`;
    const hospitalName = encodeURIComponent(selectedHospital.name || selectedHospital.hospital_name);
    
    // 사용자 기기에 따라 적절한 앱 열기
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        // iOS - Apple Maps
        window.open(`http://maps.apple.com/?daddr=${destination}&dirflg=d`);
    } else if (navigator.userAgent.includes('Android')) {
        // Android - Google Maps
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`);
    } else {
        // 웹 - 카카오맵 또는 네이버맵
        const kakaoUrl = `https://map.kakao.com/link/to/${hospitalName},${destination}`;
        const naverUrl = `https://map.naver.com/v5/directions/-/-/-/car?c=${selectedHospital.longitude},${selectedHospital.latitude},15,0,0,0,dh`;
        
        // 사용자에게 선택하게 하기
        if (confirm('길찾기 앱을 선택하세요.\n확인: 카카오맵\n취소: 네이버맵')) {
            window.open(kakaoUrl, '_blank');
        } else {
            window.open(naverUrl, '_blank');
        }
    }
}

// 병원 전화하기
function callHospital() {
    if (!selectedHospital) {
        alert('선택된 병원이 없습니다.');
        return;
    }
    
    const hospitalPhone = selectedHospital.phone || selectedHospital.contact_number;
    if (!hospitalPhone) {
        alert('전화번호 정보가 없습니다.');
        return;
    }
    
    const hospitalName = selectedHospital.name || selectedHospital.hospital_name;
    if (confirm(`${hospitalName}에 전화하시겠습니까?\n📞 ${hospitalPhone}`)) {
        window.location.href = `tel:${hospitalPhone}`;
    }
}

// CSS 애니메이션 추가 (동적으로)
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        100% {
            transform: scale(1.5);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);