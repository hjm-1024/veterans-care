class GeoUtils {
  /**
   * 하버사인 공식으로 두 지점 간 거리 계산 (km)
   * @param {number} lat1 - 첫 번째 지점 위도
   * @param {number} lon1 - 첫 번째 지점 경도
   * @param {number} lat2 - 두 번째 지점 위도
   * @param {number} lon2 - 두 번째 지점 경도
   * @returns {number} 거리 (km)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 도를 라디안으로 변환
   * @param {number} degrees 
   * @returns {number}
   */
  static toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * 주변 병원 찾기
   * @param {number} userLat - 사용자 위도
   * @param {number} userLon - 사용자 경도
   * @param {Array} hospitals - 병원 목록
   * @param {number} radius - 반경 (km)
   * @returns {Array} 거리순으로 정렬된 병원 목록
   */
  static findNearbyHospitals(userLat, userLon, hospitals, radius = 10) {
    return hospitals
      .map(hospital => ({
        ...hospital,
        distance: this.calculateDistance(
          userLat, userLon, 
          parseFloat(hospital.latitude), 
          parseFloat(hospital.longitude)
        )
      }))
      .filter(hospital => hospital.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * 거리 점수 계산 (0-100)
   * @param {number} distance - 거리 (km)
   * @returns {number} 점수
   */
  static calculateDistanceScore(distance) {
    if (distance <= 2) return 100;
    if (distance <= 5) return 90;
    if (distance <= 10) return 70;
    if (distance <= 20) return 50;
    if (distance <= 50) return 30;
    return 10;
  }

  /**
   * 경계박스 내 병원 찾기
   * @param {number} centerLat - 중심 위도
   * @param {number} centerLon - 중심 경도
   * @param {number} radiusKm - 반경 (km)
   * @returns {Object} 경계박스 좌표
   */
  static getBoundingBox(centerLat, centerLon, radiusKm) {
    const lat = this.toRadians(centerLat);
    const lon = this.toRadians(centerLon);
    const R = 6371; // 지구 반지름 (km)

    const deltaLat = radiusKm / R;
    const deltaLon = Math.asin(Math.sin(radiusKm / R) / Math.cos(lat));

    const minLat = centerLat - this.toDegrees(deltaLat);
    const maxLat = centerLat + this.toDegrees(deltaLat);
    const minLon = centerLon - this.toDegrees(deltaLon);
    const maxLon = centerLon + this.toDegrees(deltaLon);

    return { minLat, maxLat, minLon, maxLon };
  }

  /**
   * 라디안을 도로 변환
   * @param {number} radians 
   * @returns {number}
   */
  static toDegrees(radians) {
    return radians * (180/Math.PI);
  }

  /**
   * 좌표가 유효한지 확인
   * @param {number} lat - 위도
   * @param {number} lon - 경도
   * @returns {boolean}
   */
  static isValidCoordinate(lat, lon) {
    return (
      typeof lat === 'number' && 
      typeof lon === 'number' &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    );
  }

  /**
   * 한국 좌표계 범위 내인지 확인
   * @param {number} lat - 위도
   * @param {number} lon - 경도
   * @returns {boolean}
   */
  static isKoreanCoordinate(lat, lon) {
    return (
      lat >= 33 && lat <= 39 &&
      lon >= 124 && lon <= 132
    );
  }
}

module.exports = GeoUtils;
