/**
 * 보훈케어 내비게이터 - 길찾기 시스템
 * 기존 기능과 독립적으로 작동하는 실시간 길찾기 모듈
 */

// 전역 변수 충돌 방지를 위한 네임스페이스
const Navigation = {
    // 현재 사용자 위치
    userLocation: null,
    
    // 초기화 함수
    async init() {
        console.log('🗺 길찾기 시스템 초기화 중...');
        
        try {
            // 사용자 위치 감지 (비동기)
            const locationResult = await this.detectUserLocation();
            if (locationResult.error) {
                console.warn('⚠️ 위치 감지 문제:', locationResult.error);
                this.showLocationAlternatives();
            }
            
            // 카카오맵 초기화
            this.initKakaoMaps();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            console.log('✅ 길찾기 시스템 준비 완료');
            
        } catch (error) {
            console.error('❌ 길찾기 시스템 초기화 실패:', error);
            this.showErrorMessage('길찾기 시스템을 초기화할 수 없습니다.');
        }
    },

    /**
     * 사용자 위치 감지 (강화된 버전)
     */
    detectUserLocation() {
        return new Promise((resolve, reject) => {
            // HTTPS 체크
            const isHttps = window.location.protocol === 'https:';
            const isLocalhost = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' ||
                              window.location.hostname === '::1';
            
            if (!navigator.geolocation) {
                console.warn('📍 브라우저가 위치 정보를 지원하지 않습니다.');
                this.userLocation = window.VeteransCareConfig?.defaultLocation || { lat: 37.5665, lng: 126.9780 };
                resolve(this.userLocation);
                return;
            }
            
            if (!isHttps && !isLocalhost) {
                console.warn('📍 HTTPS 환경에서만 위치 정보를 사용할 수 있습니다.');
                this.userLocation = window.VeteransCareConfig?.defaultLocation || { lat: 37.5665, lng: 126.9780 };
                resolve(this.userLocation);
                return;
            }
            
            // 사용자 위치 요청
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    console.log('📍 사용자 위치 감지 성공:', this.userLocation);
                    resolve(this.userLocation);
                },
                (error) => {
                    console.warn('📍 위치 감지 실패:', error.message);
                    
                    let errorMessage = '위치 정보를 가져올 수 없습니다.';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '위치 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '위치 정보를 사용할 수 없습니다. GPS가 활성화되어 있는지 확인해주세요.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = '위치 요청 시간이 초과되었습니다. 다시 시도해주세요.';
                            break;
                    }
                    
                    // 기본값으로 폴백 (서울)
                    this.userLocation = window.VeteransCareConfig?.defaultLocation || { lat: 37.5665, lng: 126.9780 };
                    console.log('📍 기본 위치 사용:', this.userLocation);
                    
                    // 에러 정보와 함께 resolve (reject하지 않음)
                    resolve({ ...this.userLocation, error: errorMessage });
                },
                {
                    enableHighAccuracy: false, // HTTPS 문제 완화
                    timeout: 15000,
                    maximumAge: 300000 // 5분 캐시
                }
            );
        });
    },

    /**
     * 카카오맵 길찾기 API 연동
     */
    initKakaoMaps() {
        if (typeof kakao !== 'undefined' && kakao.maps) {
            this.geocoder = new kakao.maps.services.Geocoder();
            this.directions = new kakao.maps.services.DirectionsService();
            console.log('🗺 카카오맵 서비스 초기화 완료');
        }
    },

    /**
     * 주소를 좌표로 변환
     */
    geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('Geocoder not initialized'));
                return;
            }

            this.geocoder.addressSearch(address, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    resolve({
                        lat: parseFloat(result[0].y),
                        lng: parseFloat(result[0].x)
                    });
                } else {
                    reject(new Error('Address not found'));
                }
            });
        });
    },

    /**
     * 두 지점 간 경로 계산
     */
    calculateRoute(origin, destination) {
        return new Promise((resolve, reject) => {
            // 카카오맵 길찾기 API 사용
            const start = new kakao.maps.LatLng(origin.lat, origin.lng);
            const end = new kakao.maps.LatLng(destination.lat, destination.lng);
            
            // 직선거리 계산 (실제 도로 거리는 카카오맵 API에서 제공)
            const distance = this.calculateDistance(origin, destination);
            const estimatedTime = this.estimateTravelTime(distance);
            
            resolve({
                distance: distance,
                duration: estimatedTime,
                path: [start, end]
            });
        });
    },

    /**
     * 직선거리 계산 (Haversine formula)
     */
    calculateDistance(pos1, pos2) {
        const R = 6371; // 지구 반지름 (km)
        const dLat = this.toRad(pos2.lat - pos1.lat);
        const dLng = this.toRad(pos2.lng - pos1.lng);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(pos1.lat)) * Math.cos(this.toRad(pos2.lat)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    },

    /**
     * 도 -> 라디안 변환
     */
    toRad(degree) {
        return degree * (Math.PI / 180);
    },

    /**
     * 예상 이동시간 계산
     */
    estimateTravelTime(distance) {
        const config = window.VeteransCareConfig;
        let rate;
        
        if (distance <= 5) {
            rate = config.travelTimeRates.city;
        } else if (distance <= 15) {
            rate = config.travelTimeRates.suburban;
        } else {
            rate = config.travelTimeRates.highway;
        }
        
        return Math.round(distance * rate);
    },

    /**
     * 네비게이션 앱으로 길찾기
     */
    async startNavigation(hospitalName, hospitalLat, hospitalLng, navApp = 'kakao') {
        if (!this.userLocation) {
            throw new Error('사용자 위치 정보가 필요합니다.');
        }

        const destination = {
            name: hospitalName,
            lat: hospitalLat,
            lng: hospitalLng
        };

        // 경로 정보 계산
        const route = await this.calculateRoute(this.userLocation, destination);
        
        console.log(`🧭 ${hospitalName}까지 ${route.distance.toFixed(1)}km, 약 ${route.duration}분`);

        // 선택된 네비게이션 앱으로 열기
        switch (navApp) {
            case 'kakao':
                this.openKakaoNavi(destination);
                break;
            case 'naver':
                this.openNaverMap(destination);
                break;
            case 'tmap':
                this.openTmap(destination);
                break;
            case 'google':
                this.openGoogleMaps(destination);
                break;
            default:
                this.openKakaoNavi(destination);
        }

        return route;
    },

    /**
     * 카카오내비 열기
     */
    openKakaoNavi(destination) {
        const config = window.VeteransCareConfig.navigation.kakao;
        const appUrl = `${config.scheme}?name=${encodeURIComponent(destination.name)}&coord=${destination.lng},${destination.lat}`;
        const webUrl = `${config.web}/${encodeURIComponent(destination.name)},${destination.lat},${destination.lng}`;
        
        this.openWithFallback(appUrl, webUrl);
    },

    /**
     * 네이버지도 열기
     */
    openNaverMap(destination) {
        const config = window.VeteransCareConfig.navigation.naver;
        const webUrl = `${config.web}/-/-/${destination.lng},${destination.lat},${encodeURIComponent(destination.name)}`;
        
        window.open(webUrl, '_blank');
    },

    /**
     * 티맵 열기
     */
    openTmap(destination) {
        const config = window.VeteransCareConfig.navigation.tmap;
        const appUrl = `${config.scheme}?goalname=${encodeURIComponent(destination.name)}&goalx=${destination.lng}&goaly=${destination.lat}`;
        const webUrl = `${config.web}/route/search?goalname=${encodeURIComponent(destination.name)}&goalx=${destination.lng}&goaly=${destination.lat}`;
        
        this.openWithFallback(appUrl, webUrl);
    },

    /**
     * 구글맵 열기
     */
    openGoogleMaps(destination) {
        const config = window.VeteransCareConfig.navigation.google;
        const webUrl = `${config.web}/${this.userLocation.lat},${this.userLocation.lng}/${destination.lat},${destination.lng}`;
        
        window.open(webUrl, '_blank');
    },

    /**
     * 앱으로 열기 시도 후 웹으로 폴백
     */
    openWithFallback(appUrl, webUrl) {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 모바일에서 앱 실행 시도
            window.location.href = appUrl;
            
            // 3초 후 웹으로 폴백
            setTimeout(() => {
                window.open(webUrl, '_blank');
            }, 3000);
        } else {
            // 데스크톱에서는 바로 웹으로
            window.open(webUrl, '_blank');
        }
    },

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // 모달 오버레이 클릭으로 닫기
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'nav-modal-overlay') {
                this.closeModal();
            }
        });
    },

    /**
     * 길찾기 옵션 모달 표시
     * @param {Object} hospital - 병원 정보 객체
     */
    showOptions(hospital) {
        try {
            console.log('🗺 길찾기 모달 표시:', hospital.name);
            
            // 사용자 위치 기준 거리 및 소요시간 계산
            const distance = this.calculateDistance(hospital);
            const travelTime = this.calculateTravelTime(distance);
            
            // 모달 HTML 생성
            const modalHTML = this.generateModalHTML(hospital, distance, travelTime);
            
            // 모달 표시
            this.displayModal(modalHTML);
            
            // 각 버튼에 이벤트 리스너 추가
            this.attachButtonListeners(hospital);
            
        } catch (error) {
            console.error('길찾기 모달 표시 중 오류:', error);
            this.showErrorMessage('길찾기 기능을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    },

    /**
     * 거리 계산 (하버사인 공식)
     */
    calculateDistance(hospital) {
        if (!this.userLocation || !hospital.latitude || !hospital.longitude) {
            return 10; // 기본값 10km
        }

        const R = 6371; // 지구 반지름 (km)
        const dLat = this.toRadians(hospital.latitude - this.userLocation.lat);
        const dLon = this.toRadians(hospital.longitude - this.userLocation.lng);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(this.userLocation.lat)) * 
                  Math.cos(this.toRadians(hospital.latitude)) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return Math.round(distance * 10) / 10; // 소수점 1자리까지
    },

    /**
     * 각도를 라디안으로 변환
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    },

    /**
     * 예상 소요시간 계산
     */
    calculateTravelTime(distance) {
        const rates = window.VeteransCareConfig.travelTimeRates;
        let timeMinutes;

        if (distance <= 5) {
            timeMinutes = distance * rates.city;
        } else if (distance <= 15) {
            timeMinutes = 5 * rates.city + (distance - 5) * rates.suburban;
        } else {
            timeMinutes = 5 * rates.city + 10 * rates.suburban + (distance - 15) * rates.highway;
        }

        return Math.ceil(timeMinutes);
    },

    /**
     * 모달 HTML 생성
     */
    generateModalHTML(hospital, distance, travelTime) {
        return `
            <div class="nav-modal-header">
                <h3>🗺 길찾기</h3>
                <button onclick="Navigation.closeModal()" class="nav-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="nav-hospital-info">
                <h4><i class="fas fa-hospital"></i> ${hospital.name}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${hospital.address || '주소 정보 없음'}</p>
                <div class="nav-distance-info">
                    <span class="nav-distance">📏 ${distance}km</span>
                    <span class="nav-time">⏱ 약 ${travelTime}분</span>
                </div>
            </div>

            <div class="nav-subtitle">
                <p>📱 원하시는 앱으로 길찾기를 시작하세요</p>
            </div>

            <div class="nav-buttons">
                <button id="nav-kakao" class="nav-btn kakao" title="카카오내비로 길찾기">
                    <i class="fas fa-route"></i>
                    <span>카카오내비</span>
                </button>
                
                <button id="nav-naver" class="nav-btn naver" title="네이버지도로 길찾기">
                    <i class="fas fa-map"></i>
                    <span>네이버지도</span>
                </button>
                
                <button id="nav-tmap" class="nav-btn tmap" title="티맵으로 길찾기">
                    <i class="fas fa-navigation"></i>
                    <span>티맵</span>
                </button>
                
                <button id="nav-google" class="nav-btn google" title="구글지도로 길찾기">
                    <i class="fas fa-globe"></i>
                    <span>구글지도</span>
                </button>
            </div>

            <div class="nav-additional-info">
                <p><i class="fas fa-info-circle"></i> 
                앱이 설치되지 않은 경우 웹 버전으로 연결됩니다.</p>
            </div>
        `;
    },

    /**
     * 모달 표시
     */
    displayModal(html) {
        const overlay = document.getElementById('nav-modal-overlay');
        const content = document.getElementById('nav-modal-content');
        
        if (overlay && content) {
            content.innerHTML = html;
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 스크롤 방지
            
            // 접근성: 모달에 포커스
            content.focus();
        }
    },

    /**
     * 버튼 이벤트 리스너 추가
     */
    attachButtonListeners(hospital) {
        const buttons = {
            'nav-kakao': () => this.openKakaoNavi(hospital),
            'nav-naver': () => this.openNaverMap(hospital),
            'nav-tmap': () => this.openTmap(hospital),
            'nav-google': () => this.openGoogleMaps(hospital)
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    },

    /**
     * 카카오내비 실행
     */
    openKakaoNavi(hospital) {
        const name = encodeURIComponent(hospital.name);
        const lat = hospital.latitude;
        const lng = hospital.longitude;
        
        // 앱 스키마 URL
        const appUrl = `kakaonavi://navigate?destination=${lat},${lng}&destination_name=${name}`;
        
        // 웹 폴백 URL  
        const webUrl = `https://map.kakao.com/link/to/${name},${lat},${lng}`;
        
        this.tryOpenApp(appUrl, webUrl, '카카오내비');
    },

    /**
     * 네이버지도 실행
     */
    openNaverMap(hospital) {
        const name = encodeURIComponent(hospital.name);
        const lat = hospital.latitude;
        const lng = hospital.longitude;
        
        // 앱 스키마 URL
        const appUrl = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${name}`;
        
        // 웹 폴백 URL
        const webUrl = `https://map.naver.com/v5/directions/-/-/${lat},${lng},${name}`;
        
        this.tryOpenApp(appUrl, webUrl, '네이버지도');
    },

    /**
     * 티맵 실행
     */
    openTmap(hospital) {
        const name = encodeURIComponent(hospital.name);
        const lat = hospital.latitude;
        const lng = hospital.longitude;
        
        // 앱 스키마 URL
        const appUrl = `tmap://route?goalname=${name}&goalx=${lng}&goaly=${lat}`;
        
        // 웹 폴백 URL
        const webUrl = `https://tmap.life/route/car?goalX=${lng}&goalY=${lat}&goalName=${name}`;
        
        this.tryOpenApp(appUrl, webUrl, '티맵');
    },

    /**
     * 구글지도 실행
     */
    openGoogleMaps(hospital) {
        const lat = hospital.latitude;
        const lng = hospital.longitude;
        
        // 구글지도는 웹만 지원
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        
        this.openWebUrl(webUrl, '구글지도');
    },

    /**
     * 앱 실행 시도 (폴백 포함)
     */
    tryOpenApp(appUrl, webUrl, appName) {
        console.log(`📱 ${appName} 앱 실행 시도:`, appUrl);
        
        // 모바일 기기 감지
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 모바일에서는 앱 스키마 시도
            const startTime = Date.now();
            
            // 앱 실행 시도
            window.location.href = appUrl;
            
            // 2초 후 앱 실행 실패로 간주하고 웹 버전 열기
            setTimeout(() => {
                const endTime = Date.now();
                if (endTime - startTime < 2500) {
                    console.log(`📱 ${appName} 앱 실행 실패, 웹 버전으로 이동`);
                    this.openWebUrl(webUrl, appName);
                }
            }, 2000);
        } else {
            // 데스크톱에서는 바로 웹 버전
            this.openWebUrl(webUrl, appName);
        }
        
        this.closeModal();
    },

    /**
     * 웹 URL 열기
     */
    openWebUrl(url, appName) {
        console.log(`🌐 ${appName} 웹 버전 열기:`, url);
        window.open(url, '_blank', 'noopener,noreferrer');
    },

    /**
     * 모달 닫기
     */
    closeModal() {
        const overlay = document.getElementById('nav-modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = ''; // 스크롤 복원
        }
    },

    /**
     * 오류 메시지 표시
     */
    showErrorMessage(message) {
        // 기존 알림 시스템 사용 또는 간단한 alert
        if (window.alert) {
            alert(message);
        } else {
            console.error('길찾기 오류:', message);
        }
    },

    /**
     * 위치 대안 옵션 표시
     */
    showLocationAlternatives() {
        // 간단한 대안 메뉴 표시
        const alternatives = document.createElement('div');
        alternatives.id = 'location-alternatives';
        alternatives.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(44, 90, 160, 0.95);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-size: 14px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        alternatives.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>📍 위치 설정 안내</strong>
            </div>
            <div style="margin-bottom: 8px;">
                • HTTPS 사이트에서만 위치 서비스 이용 가능
            </div>
            <div style="margin-bottom: 8px;">
                • 브라우저 설정에서 위치 권한 허용 필요
            </div>
            <div style="margin-bottom: 10px;">
                • 현재 서울 기본 위치로 설정됨
            </div>
            <button onclick="document.getElementById('location-alternatives').remove()" 
                    style="background: white; color: #2c5aa0; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                확인
            </button>
        `;
        
        // 기존 알림이 있으면 제거
        const existing = document.getElementById('location-alternatives');
        if (existing) {
            existing.remove();
        }
        
        document.body.appendChild(alternatives);
        
        // 10초 후 자동 제거
        setTimeout(() => {
            if (document.getElementById('location-alternatives')) {
                alternatives.remove();
            }
        }, 10000);
    }
};

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // config.js 로드 확인
    if (window.VeteransCareConfig) {
        Navigation.init();
    } else {
        console.error('❌ config.js가 로드되지 않았습니다.');
    }
});

console.log('✅ Navigation 모듈 로드 완료');
