import pandas as pd
import numpy as np
import folium
from folium import plugins
import json
import os
from geopy.distance import geodesic
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib import font_manager, rc

# 한글 폰트 설정 (Windows 환경)
try:
    # Windows 환경에서 맑은 고딕 사용
    plt.rcParams['font.family'] = 'Malgun Gothic'
    plt.rcParams['axes.unicode_minus'] = False
except:
    # 맑은 고딕이 없는 경우 기본 폰트 사용
    plt.rcParams['axes.unicode_minus'] = False

class VeteransHospitalAnalyzer:
    """보훈 위탁병원 분석 및 시각화 클래스"""
    
    def __init__(self, hospital_data_path, admin_codes_path=None, geojson_path=None):
        """
        초기화 메서드
        
        Parameters:
        - hospital_data_path: 병원 데이터 CSV 파일 경로
        - admin_codes_path: 행정구역 코드 CSV 파일 경로 (선택사항)
        - geojson_path: GeoJSON 파일 경로 (선택사항)
        """
        # CSV 파일 인코딩 자동 감지 및 로드
        self.hospitals_df = self._load_csv_with_encoding(hospital_data_path)
        
        # 선택적 파일들 로드
        if admin_codes_path and os.path.exists(admin_codes_path):
            self.admin_codes_df = self._load_csv_with_encoding(admin_codes_path)
        else:
            self.admin_codes_df = None
            print("행정구역 코드 파일이 없습니다. (선택사항)")
        
        if geojson_path and os.path.exists(geojson_path):
            with open(geojson_path, 'r', encoding='utf-8') as f:
                self.geojson_data = json.load(f)
        else:
            self.geojson_data = None
            print("GeoJSON 파일이 없습니다. (선택사항)")
        
        # 색상 설정
        self.color_dict = {
            '종합병원': 'red',
            '병원': 'blue',
            '의원': 'green',
            '한방병원': 'purple',
            '한의원': 'orange',
            '치과병원': 'pink',
            '치과의원': 'lightblue',
            '요양병원': 'darkred',
            '상급종합병원': 'darkblue'
        }
        
        print(f"병원 데이터 로드 완료: {len(self.hospitals_df)}개 병원")
        print(f"데이터 컬럼: {list(self.hospitals_df.columns)}")
    
    def _load_csv_with_encoding(self, file_path):
        """인코딩을 자동으로 감지하여 CSV 파일 로드"""
        encodings = ['cp949', 'euc-kr', 'utf-8', 'utf-8-sig']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                print(f"파일 로드 성공: {file_path} (인코딩: {encoding})")
                return df
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"파일 로드 중 오류 발생 ({encoding}): {e}")
                continue
        
        raise Exception(f"파일을 로드할 수 없습니다: {file_path}")
    
    def create_accessibility_map(self, user_location, max_distance_km=50):
        """
        사용자 위치 기반 접근성 지도 생성
        
        Parameters:
        - user_location: (위도, 경도) 튜플
        - max_distance_km: 최대 표시 거리 (km)
        """
        # 지도 생성
        m = folium.Map(location=user_location, zoom_start=10)
        
        # 사용자 위치 마커
        folium.Marker(
            location=user_location,
            popup="현재 위치",
            icon=folium.Icon(color='black', icon='home')
        ).add_to(m)
        
        # 접근 가능한 병원 찾기
        accessible_hospitals = []
        
        for idx, row in self.hospitals_df.iterrows():
            # 위도, 경도 컬럼명 확인 및 처리
            lat_col = '위도' if '위도' in self.hospitals_df.columns else 'latitude'
            lon_col = '경도' if '경도' in self.hospitals_df.columns else 'longitude'
            
            if lat_col in row and lon_col in row and pd.notna(row[lat_col]) and pd.notna(row[lon_col]):
                hospital_location = (row[lat_col], row[lon_col])
                distance = geodesic(user_location, hospital_location).kilometers
                
                if distance <= max_distance_km:
                    # 컬럼명 동적 처리
                    name_col = '위탁병원명' if '위탁병원명' in row else '병원명'
                    type_col = '종별' if '종별' in row else '분류'
                    beds_col = '병상수' if '병상수' in row else '병상'
                    dept_col = '진료과수' if '진료과수' in row else '진료과'
                    phone_col = '전화번호' if '전화번호' in row else '연락처'
                    addr_col = '상세주소' if '상세주소' in row else '주소'
                    
                    accessible_hospitals.append({
                        'name': str(row.get(name_col, '정보없음')),
                        'type': str(row.get(type_col, '정보없음')),
                        'location': hospital_location,
                        'distance': distance,
                        'beds': int(row.get(beds_col, 0)) if pd.notna(row.get(beds_col)) else 0,
                        'departments': int(row.get(dept_col, 0)) if pd.notna(row.get(dept_col)) else 0,
                        'phone': str(row.get(phone_col, '정보없음')),
                        'address': str(row.get(addr_col, '정보없음'))
                    })
        
        # 거리순 정렬
        accessible_hospitals.sort(key=lambda x: x['distance'])
        
        # 병원 마커 추가
        for i, hospital in enumerate(accessible_hospitals):
            # 거리에 따른 투명도 및 선 굵기
            if hospital['distance'] < 10:
                opacity = 1.0
                weight = 3
            elif hospital['distance'] < 30:
                opacity = 0.7
                weight = 2
            else:
                opacity = 0.5
                weight = 1
            
            popup_html = f"""
            <div style="font-family: Arial, sans-serif; width: 250px;">
                <h4>{hospital['name']}</h4>
                <p><b>거리:</b> {hospital['distance']:.1f}km</p>
                <p><b>종별:</b> {hospital['type']}</p>
                <p><b>병상수:</b> {hospital['beds']}개</p>
                <p><b>진료과수:</b> {hospital['departments']}개</p>
                <p><b>주소:</b> {hospital['address']}</p>
                <p><b>전화:</b> {hospital['phone']}</p>
            </div>
            """
            
            # 마커 추가
            folium.Marker(
                location=hospital['location'],
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"{i+1}. {hospital['name']} ({hospital['distance']:.1f}km)",
                icon=folium.Icon(
                    color=self.color_dict.get(hospital['type'], 'gray'),
                    icon='hospital-o',
                    prefix='fa'
                )
            ).add_to(m)
            
            # 사용자 위치에서 병원까지 선 그리기 (가장 가까운 5개만)
            if i < 5:
                folium.PolyLine(
                    locations=[user_location, hospital['location']],
                    color='blue',
                    weight=weight,
                    opacity=opacity,
                    dash_array='5, 10'
                ).add_to(m)
        
        # 범위 원 그리기
        for radius in [10, 30, 50]:
            if radius <= max_distance_km:
                folium.Circle(
                    location=user_location,
                    radius=radius * 1000,  # 미터로 변환
                    popup=f'{radius}km 반경',
                    color='red',
                    fill=False,
                    weight=1,
                    opacity=0.5,
                    dash_array='5, 5'
                ).add_to(m)
        
        # 통계 정보 추가
        stats_html = f'''
        <div style="position: fixed; 
                    top: 10px; right: 10px; width: 250px; height: auto; 
                    background-color: white; z-index:9999; font-size:14px;
                    border:2px solid grey; border-radius: 5px; padding: 10px">
            <h4>접근 가능한 위탁병원</h4>
            <p>총 {len(accessible_hospitals)}개 병원</p>
            <p>10km 이내: {sum(1 for h in accessible_hospitals if h['distance'] < 10)}개</p>
            <p>30km 이내: {sum(1 for h in accessible_hospitals if h['distance'] < 30)}개</p>
            <p>가장 가까운 병원: {accessible_hospitals[0]['name'] if accessible_hospitals else 'N/A'}</p>
        </div>
        '''
        m.get_root().html.add_child(folium.Element(stats_html))
        
        return m, accessible_hospitals
    
    def analyze_hospital_distribution(self):
        """병원 분포 분석 및 시각화"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # 컬럼명 동적 처리
        sido_col = '광역시도명' if '광역시도명' in self.hospitals_df.columns else '시도'
        type_col = '종별' if '종별' in self.hospitals_df.columns else '분류'
        beds_col = '병상수' if '병상수' in self.hospitals_df.columns else '병상'
        dept_col = '진료과수' if '진료과수' in self.hospitals_df.columns else '진료과'
        
        # 1. 시도별 병원 수
        if sido_col in self.hospitals_df.columns:
            sido_counts = self.hospitals_df[sido_col].value_counts()
            axes[0, 0].bar(range(len(sido_counts)), sido_counts.values)
            axes[0, 0].set_xticks(range(len(sido_counts)))
            axes[0, 0].set_xticklabels(sido_counts.index, rotation=45, ha='right')
            axes[0, 0].set_title('시도별 위탁병원 수')
            axes[0, 0].set_ylabel('병원 수')
        
        # 2. 종별 분포
        if type_col in self.hospitals_df.columns:
            type_counts = self.hospitals_df[type_col].value_counts()
            axes[0, 1].pie(type_counts.values, labels=type_counts.index, autopct='%1.1f%%')
            axes[0, 1].set_title('병원 종별 분포')
        
        # 3. 병상수 분포
        if beds_col in self.hospitals_df.columns:
            beds_data = self.hospitals_df[beds_col].dropna()
            if len(beds_data) > 0:
                axes[1, 0].hist(beds_data, bins=30, edgecolor='black')
                axes[1, 0].set_title('병상수 분포')
                axes[1, 0].set_xlabel('병상수')
                axes[1, 0].set_ylabel('병원 수')
        
        # 4. 진료과수 분포
        if type_col in self.hospitals_df.columns and dept_col in self.hospitals_df.columns:
            try:
                type_unique = self.hospitals_df[type_col].unique()
                dept_data = [
                    self.hospitals_df[self.hospitals_df[type_col] == t][dept_col].dropna()
                    for t in type_unique if len(self.hospitals_df[self.hospitals_df[type_col] == t][dept_col].dropna()) > 0
                ]
                if dept_data:
                    axes[1, 1].boxplot(dept_data, tick_labels=[t for t in type_unique if len(self.hospitals_df[self.hospitals_df[type_col] == t][dept_col].dropna()) > 0])
                    axes[1, 1].set_title('종별 진료과수 분포')
                    axes[1, 1].set_xlabel('병원 종별')
                    axes[1, 1].set_ylabel('진료과수')
                    axes[1, 1].tick_params(axis='x', rotation=45)
            except Exception as e:
                print(f"진료과수 분포 차트 생성 중 오류: {e}")
        
        plt.tight_layout()
        return fig
    
    def find_underserved_areas(self, k_clusters=10):
        """의료 서비스 부족 지역 찾기"""
        # 컬럼명 동적 처리
        lat_col = '위도' if '위도' in self.hospitals_df.columns else 'latitude'
        lon_col = '경도' if '경도' in self.hospitals_df.columns else 'longitude'
        name_col = '위탁병원명' if '위탁병원명' in self.hospitals_df.columns else '병원명'
        
        # 병원 위치 데이터 준비
        hospital_coords = self.hospitals_df[[lat_col, lon_col]].dropna()
        
        if len(hospital_coords) == 0:
            print("위치 데이터가 있는 병원이 없습니다.")
            return None, None, None
        
        # K-means 클러스터링
        kmeans = KMeans(n_clusters=min(k_clusters, len(hospital_coords)), random_state=42)
        clusters = kmeans.fit_predict(hospital_coords)
        
        # 클러스터 중심과 각 클러스터의 병원 수 계산
        cluster_centers = kmeans.cluster_centers_
        cluster_sizes = pd.Series(clusters).value_counts().sort_index()
        
        # 지도 생성
        m = folium.Map(location=[36.5, 127.5], zoom_start=7)
        
        # 클러스터 중심 표시
        for i, center in enumerate(cluster_centers):
            size = int(cluster_sizes.get(i, 0))  # int64를 int로 변환
            
            # 클러스터 크기에 따른 색상
            if size < 5:
                color = 'red'
                status = '의료 서비스 부족'
            elif size < 10:
                color = 'orange'
                status = '의료 서비스 보통'
            else:
                color = 'green'
                status = '의료 서비스 충분'
            
            folium.CircleMarker(
                location=[float(center[0]), float(center[1])],  # float64를 float로 변환
                radius=max(size * 2, 5),
                popup=f'클러스터 {i+1}<br>병원 수: {size}개<br>상태: {status}',
                color=color,
                fill=True,
                fillOpacity=0.3
            ).add_to(m)
        
        # 실제 병원 위치 표시
        for idx, row in self.hospitals_df.iterrows():
            if pd.notna(row.get(lat_col)) and pd.notna(row.get(lon_col)):
                folium.CircleMarker(
                    location=[float(row[lat_col]), float(row[lon_col])],  # float64를 float로 변환
                    radius=3,
                    popup=row.get(name_col, '정보없음'),
                    color='blue',
                    fill=True,
                    fillOpacity=0.8
                ).add_to(m)
        
        return m, cluster_centers, cluster_sizes
    
    def create_heatmap(self):
        """병원 밀도 히트맵 생성"""
        # 컬럼명 동적 처리
        lat_col = '위도' if '위도' in self.hospitals_df.columns else 'latitude'
        lon_col = '경도' if '경도' in self.hospitals_df.columns else 'longitude'
        beds_col = '병상수' if '병상수' in self.hospitals_df.columns else '병상'
        
        m = folium.Map(location=[36.5, 127.5], zoom_start=7)
        
        # 히트맵 데이터 준비
        heat_data = []
        for idx, row in self.hospitals_df.iterrows():
            if pd.notna(row.get(lat_col)) and pd.notna(row.get(lon_col)):
                # 병상수를 가중치로 사용
                beds_value = row.get(beds_col, 1)
                weight = float(min(beds_value / 100, 10)) if pd.notna(beds_value) else 1.0
                heat_data.append([float(row[lat_col]), float(row[lon_col]), weight])
        
        if heat_data:
            # 히트맵 추가
            plugins.HeatMap(
                heat_data,
                min_opacity=0.2,
                max_zoom=18,
                radius=25,
                blur=15,
                gradient={
                    0.2: 'blue',
                    0.4: 'lime',
                    0.6: 'orange',
                    0.8: 'red',
                    1.0: 'darkred'
                }
            ).add_to(m)
        else:
            print("히트맵 생성을 위한 위치 데이터가 없습니다.")
        
        return m
    
    def generate_report(self, output_path='hospital_analysis_report.txt'):
        """종합 분석 보고서 생성"""
        # 컬럼명 동적 처리
        sido_col = '광역시도명' if '광역시도명' in self.hospitals_df.columns else '시도'
        type_col = '종별' if '종별' in self.hospitals_df.columns else '분류'
        beds_col = '병상수' if '병상수' in self.hospitals_df.columns else '병상'
        name_col = '위탁병원명' if '위탁병원명' in self.hospitals_df.columns else '병원명'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("=== 보훈 의료 위탁병원 현황 분석 보고서 ===\n\n")
            
            f.write(f"기준일: 2025-01-01\n")
            f.write(f"총 위탁병원 수: {len(self.hospitals_df)}개\n\n")
            
            # 시도별 분포
            if sido_col in self.hospitals_df.columns:
                f.write("1. 시도별 분포\n")
                for sido, count in self.hospitals_df[sido_col].value_counts().items():
                    f.write(f"   - {sido}: {count}개\n")
                f.write("\n")
            
            # 종별 분포
            if type_col in self.hospitals_df.columns:
                f.write("2. 종별 분포\n")
                for type_, count in self.hospitals_df[type_col].value_counts().items():
                    f.write(f"   - {type_}: {count}개\n")
                f.write("\n")
            
            # 병상수 통계
            if beds_col in self.hospitals_df.columns:
                beds_data = self.hospitals_df[beds_col].dropna()
                if len(beds_data) > 0:
                    f.write("3. 병상수 통계\n")
                    f.write(f"   - 총 병상수: {beds_data.sum():,}개\n")
                    f.write(f"   - 평균 병상수: {beds_data.mean():.1f}개\n")
                    f.write(f"   - 최대 병상수: {beds_data.max()}개\n")
                    f.write("\n")
            
            # 상위 10개 대형 병원
            if beds_col in self.hospitals_df.columns and name_col in self.hospitals_df.columns:
                f.write("4. 상위 10개 대형 병원\n")
                top_hospitals = self.hospitals_df.nlargest(10, beds_col)[[name_col, beds_col]]
                if sido_col in self.hospitals_df.columns:
                    top_hospitals = self.hospitals_df.nlargest(10, beds_col)[[name_col, beds_col, sido_col]]
                
                for idx, row in top_hospitals.iterrows():
                    if sido_col in row:
                        f.write(f"   - {row[name_col]} ({row[sido_col]}): {row[beds_col]}개\n")
                    else:
                        f.write(f"   - {row[name_col]}: {row[beds_col]}개\n")

# 사용 예시
if __name__ == "__main__":
    # 파일 경로 설정 (실제 경로에 맞게 수정)
    base_path = r"C:\Users\JongMin\Desktop\충북대학교\충대 4학년 1학기\5. 기타\국가보훈부\지도 및 접근성 데이터"
    
    try:
        # 분석기 초기화 (필수 파일만)
        analyzer = VeteransHospitalAnalyzer(
            hospital_data_path=os.path.join(base_path, "국가보훈부_보훈의료 위탁병원 현황_20250101.csv"),
            admin_codes_path=os.path.join(base_path, "admin_codes.csv"),  # 선택사항
            geojson_path=os.path.join(base_path, "admin_dong.geojson")    # 선택사항
        )
        
        print("=== 보훈 위탁병원 분석 시작 ===\n")
        
        # 1. 특정 위치에서의 접근성 분석 (예: 충북대학교)
        user_location = (36.6284, 127.4573)  # 충북대학교 좌표
        print("1. 접근성 지도 생성 중...")
        access_map, nearby_hospitals = analyzer.create_accessibility_map(user_location, max_distance_km=50)
        access_map.save("accessibility_map.html")
        print(f"   ✅ 접근성 지도 생성 완료 (반경 50km 내 {len(nearby_hospitals)}개 병원)")
        
        # 2. 병원 분포 분석
        print("2. 병원 분포 분석 중...")
        fig = analyzer.analyze_hospital_distribution()
        fig.savefig("hospital_distribution_analysis.png", dpi=300, bbox_inches='tight')
        plt.close(fig)
        print("   ✅ 병원 분포 분석 차트 생성 완료")
        
        # 3. 의료 서비스 부족 지역 찾기
        print("3. 의료 서비스 부족 지역 분석 중...")
        underserved_map, centers, sizes = analyzer.find_underserved_areas(k_clusters=15)
        if underserved_map:
            underserved_map.save("underserved_areas_map.html")
            print("   ✅ 의료 서비스 부족 지역 지도 생성 완료")
        
        # 4. 병원 밀도 히트맵
        print("4. 병원 밀도 히트맵 생성 중...")
        heatmap = analyzer.create_heatmap()
        heatmap.save("hospital_density_heatmap.html")
        print("   ✅ 병원 밀도 히트맵 생성 완료")
        
        # 5. 종합 보고서 생성
        print("5. 종합 보고서 생성 중...")
        analyzer.generate_report()
        print("   ✅ 분석 보고서 생성 완료")
        
        print("\n=== 모든 분석 완료 ===")
        print("생성된 파일:")
        print("- accessibility_map.html (접근성 지도)")
        print("- hospital_distribution_analysis.png (분포 분석 차트)")
        print("- underserved_areas_map.html (부족 지역 지도)")
        print("- hospital_density_heatmap.html (밀도 히트맵)")
        print("- hospital_analysis_report.txt (분석 보고서)")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        print("파일 경로와 데이터를 확인해주세요.")