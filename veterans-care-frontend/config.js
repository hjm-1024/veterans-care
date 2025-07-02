/**
 * 보훈케어 내비게이터 - 설정 파일
 * 카카오맵 API 및 기타 설정값들을 관리합니다.
 */

const config = {
    // 카카오맵 JavaScript API 키
    KAKAO_API_KEY: '796a42e6ccbb3a6ae2f7268a24f574ee',
    
    // 길찾기 서비스별 URL 스키마
    navigation: {
        kakao: {
            scheme: 'kakaonavi://navigate',
            web: 'https://map.kakao.com/link/to'
        },
        naver: {
            scheme: 'nmap://route/car',
            web: 'https://map.naver.com/v5/directions'
        },
        tmap: {
            scheme: 'tmap://route',
            web: 'https://tmap.life/route'
        },
        google: {
            web: 'https://www.google.com/maps/dir'
        }
    },
    
    // 길찾기 기본 설정
    defaultLocation: {
        lat: 36.5, // 대한민국 중심 위도
        lng: 127.5 // 대한민국 중심 경도
    },
    
    // 소요시간 계산 설정 (분/km)
    travelTimeRates: {
        city: 8,      // 0-5km: 도심 지역 (신호등, 교통체증)
        suburban: 4,  // 5-15km: 교외 지역
        highway: 3    // 15km+: 고속도로/외곽
    }
};

// 전역 객체로 등록 (다른 파일에서 사용 가능)
window.VeteransCareConfig = config;

console.log('✅ 보훈케어 내비게이터 설정 로드 완료');
