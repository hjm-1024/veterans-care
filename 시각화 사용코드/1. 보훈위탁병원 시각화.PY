import pandas as pd
import folium
from folium import plugins
import json
import geopandas as gpd
from shapely.geometry import Point
import warnings
import os
import chardet
warnings.filterwarnings('ignore')

# 안전한 CSV 읽기 함수
def safe_read_csv(file_path, **kwargs):
    """다양한 인코딩을 시도하여 CSV 파일을 안전하게 읽습니다."""
    encodings = ['cp949', 'euc-kr', 'utf-8', 'utf-8-sig', 'latin1']
    
    for encoding in encodings:
        try:
            df = pd.read_csv(file_path, encoding=encoding, **kwargs)
            print(f"✓ {encoding} 인코딩으로 파일을 읽었습니다.")
            return df
        except UnicodeDecodeError:
            continue
        except Exception as e:
            continue
    
    raise ValueError(f"파일을 읽을 수 없습니다: {file_path}")

# 1. 데이터 파일 경로 설정
base_path = "/Users/jm/Desktop/충북대학교/충대 4학년 1학기/5. 기타/국가보훈부/지도 및 접근성 데이터"
hospital_csv_path = os.path.join("/Users/jm/Desktop/충북대학교/충대 4학년 1학기/5. 기타/국가보훈부/전처리된 보훈병원/국가보훈부_보훈의료 위탁병원 현황_20250101.csv")
admin_codes_path = os.path.join(base_path, "admin_codes.csv")
geojson_path = os.path.join(base_path, "admin_dong.geojson")
shp_path = os.path.join(base_path, "BND_ADM_DONG_PG.shp")

# 2. 보훈 의료 위탁병원 데이터 불러오기
print("보훈 의료 위탁병원 데이터 로딩 중...")
hospitals_df = safe_read_csv(hospital_csv_path)
print(f"총 {len(hospitals_df)}개의 위탁병원 데이터를 불러왔습니다.")

# 3. 행정구역 코드 데이터 불러오기
print("\n행정구역 코드 데이터 로딩 중...")
admin_codes_df = safe_read_csv(admin_codes_path)

# 4. GeoJSON 데이터 불러오기 (전국 행정동 경계)
print("\nGeoJSON 데이터 로딩 중...")
with open(geojson_path, 'r', encoding='utf-8') as f:
    geojson_data = json.load(f)

# 5. 대한민국 중심 좌표로 기본 지도 생성
center_lat = 36.5
center_lon = 127.5
m = folium.Map(
    location=[center_lat, center_lon],
    zoom_start=7,
    tiles='OpenStreetMap',
    control_scale=True
)

# 6. 행정구역 경계 추가 (선택사항 - 지도가 너무 무거워질 수 있음)
# 행정구역 경계를 추가하려면 아래 주석을 해제하세요
"""
folium.GeoJson(
    geojson_data,
    name='행정동 경계',
    style_function=lambda feature: {
        'fillColor': '#ffffff',
        'color': '#000000',
        'weight': 0.5,
        'fillOpacity': 0.1,
    }
).add_to(m)
"""

# 7. 병원 종별에 따른 색상 설정
color_dict = {
    '종합병원': 'red',
    '병원': 'blue',
    '의원': 'green',
    '한방병원': 'purple',
    '한의원': 'orange',
    '치과병원': 'pink',
    '치과의원': 'lightblue'
}

# 8. 시도별 병원 그룹 생성
hospital_groups = {}
for sido in hospitals_df['광역시도명'].unique():
    if pd.notna(sido):
        hospital_groups[sido] = folium.FeatureGroup(name=f'{sido} 위탁병원')
        
# 9. 병원 마커 추가
print("\n병원 마커 추가 중...")
for idx, row in hospitals_df.iterrows():
    if pd.notna(row['위도']) and pd.notna(row['경도']):
        # 팝업 내용 생성
        popup_html = f"""
        <div style="font-family: 'Malgun Gothic', sans-serif; width: 300px;">
            <h4 style="color: #2c3e50; margin-bottom: 10px;">{row['위탁병원명']}</h4>
            <table style="width: 100%; font-size: 12px;">
                <tr>
                    <td style="font-weight: bold; width: 80px;">종별:</td>
                    <td>{row['종별']}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">병상수:</td>
                    <td>{row['병상수']}개</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">진료과수:</td>
                    <td>{row['진료과수']}개</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">주소:</td>
                    <td>{row['광역시도명']} {row['시군구명']} {row['상세주소']}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">전화번호:</td>
                    <td>{row['전화번호']}</td>
                </tr>
            </table>
        </div>
        """
        
        # 마커 색상 결정
        marker_color = color_dict.get(row['종별'], 'gray')
        
        # 마커 생성
        marker = folium.Marker(
            location=[row['위도'], row['경도']],
            popup=folium.Popup(popup_html, max_width=300),
            tooltip=f"{row['위탁병원명']} ({row['종별']})",
            icon=folium.Icon(color=marker_color, icon='hospital-o', prefix='fa')
        )
        
        # 해당 시도 그룹에 마커 추가
        if row['광역시도명'] in hospital_groups:
            marker.add_to(hospital_groups[row['광역시도명']])

# 10. 모든 시도 그룹을 지도에 추가
for group in hospital_groups.values():
    group.add_to(m)

# 11. 레이어 컨트롤 추가 (시도별 병원 표시/숨기기 가능)
folium.LayerControl(collapsed=False).add_to(m)

# 12. 범례 추가
legend_html = '''
<div style="position: fixed; 
            bottom: 50px; right: 50px; width: 200px; height: auto; 
            background-color: white; z-index:9999; font-size:14px;
            border:2px solid grey; border-radius: 5px; padding: 10px">
    <p style="font-weight: bold; margin-bottom: 10px;">보훈 의료 위탁병원 종별</p>
'''

for hospital_type, color in color_dict.items():
    count = len(hospitals_df[hospitals_df['종별'] == hospital_type])
    if count > 0:
        legend_html += f'<p style="margin: 5px 0;"><i class="fa fa-circle" style="color:{color}"></i> {hospital_type} ({count}개)</p>'

legend_html += '</div>'
m.get_root().html.add_child(folium.Element(legend_html))

# 13. 플러그인 추가
# 전체화면 버튼
plugins.Fullscreen().add_to(m)

# 마우스 위치 표시
plugins.MousePosition().add_to(m)

# 14. 클러스터링 옵션 (마커가 많을 경우 사용)
# 클러스터링을 원하면 아래 코드를 활성화하고, 위의 개별 마커 추가 부분을 비활성화하세요
"""
from folium.plugins import MarkerCluster

# 마커 클러스터 생성
marker_cluster = MarkerCluster(name='병원 클러스터').add_to(m)

for idx, row in hospitals_df.iterrows():
    if pd.notna(row['위도']) and pd.notna(row['경도']):
        popup_html = f"<b>{row['위탁병원명']}</b><br>{row['종별']}<br>{row['전화번호']}"
        
        folium.Marker(
            location=[row['위도'], row['경도']],
            popup=popup_html,
            tooltip=row['위탁병원명']
        ).add_to(marker_cluster)
"""

# 15. 통계 정보 추가
stats_html = f'''
<div style="position: fixed; 
            top: 10px; right: 10px; width: 250px; height: auto; 
            background-color: white; z-index:9999; font-size:14px;
            border:2px solid grey; border-radius: 5px; padding: 10px">
    <h4 style="margin-bottom: 10px;">보훈 의료 위탁병원 현황</h4>
    <p style="margin: 5px 0;">총 위탁병원 수: <b>{len(hospitals_df)}개</b></p>
    <p style="margin: 5px 0;">데이터 기준일: 2025-01-01</p>
</div>
'''
m.get_root().html.add_child(folium.Element(stats_html))

# 16. 지도 저장
output_path = "veterans_hospital_map.html"
m.save(output_path)
print(f"\n지도가 성공적으로 생성되었습니다: {output_path}")

# 17. 추가 분석 정보 출력
print("\n=== 보훈 의료 위탁병원 통계 ===")
print("\n종별 분포:")
print(hospitals_df['종별'].value_counts())

print("\n시도별 분포:")
print(hospitals_df['광역시도명'].value_counts())

print("\n병상수 통계:")
print(f"- 총 병상수: {hospitals_df['병상수'].sum():,}개")
print(f"- 평균 병상수: {hospitals_df['병상수'].mean():.1f}개")
print(f"- 최대 병상수: {hospitals_df['병상수'].max()}개 ({hospitals_df.loc[hospitals_df['병상수'].idxmax(), '위탁병원명']})")

# 18. 히트맵 생성 (선택사항)
"""
from folium.plugins import HeatMap

# 히트맵용 데이터 준비
heat_data = [[row['위도'], row['경도']] for idx, row in hospitals_df.iterrows() 
             if pd.notna(row['위도']) and pd.notna(row['경도'])]

# 히트맵 레이어 추가
HeatMap(heat_data, name='병원 밀도').add_to(m)
"""

# 19. 특정 지역 확대 보기 함수
def create_regional_map(region_name, zoom_level=11):
    """특정 시도 지역의 병원만 표시하는 지도 생성"""
    regional_hospitals = hospitals_df[hospitals_df['광역시도명'] == region_name]
    
    if len(regional_hospitals) == 0:
        print(f"{region_name}에 위탁병원이 없습니다.")
        return
    
    # 지역 중심점 계산
    center_lat = regional_hospitals['위도'].mean()
    center_lon = regional_hospitals['경도'].mean()
    
    # 지역 지도 생성
    regional_map = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=zoom_level,
        tiles='OpenStreetMap'
    )
    
    # 병원 마커 추가
    for idx, row in regional_hospitals.iterrows():
        if pd.notna(row['위도']) and pd.notna(row['경도']):
            popup_html = f"""
            <b>{row['위탁병원명']}</b><br>
            종별: {row['종별']}<br>
            병상수: {row['병상수']}개<br>
            주소: {row['시군구명']} {row['상세주소']}<br>
            전화: {row['전화번호']}
            """
            
            folium.Marker(
                location=[row['위도'], row['경도']],
                popup=popup_html,
                tooltip=row['위탁병원명'],
                icon=folium.Icon(color=color_dict.get(row['종별'], 'gray'), 
                               icon='hospital-o', prefix='fa')
            ).add_to(regional_map)
    
    # 지도 저장
    regional_map.save(f"{region_name}_veterans_hospital_map.html")
    print(f"{region_name} 지도가 생성되었습니다.")

# 예시: 서울특별시 지도 생성
# create_regional_map('서울특별시')