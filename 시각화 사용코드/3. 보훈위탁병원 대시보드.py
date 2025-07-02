import pandas as pd
import folium
from folium import plugins
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from geopy.distance import geodesic
import json
from streamlit_folium import st_folium

# Streamlit 페이지 설정
st.set_page_config(
    page_title="보훈 의료 위탁병원 대시보드",
    page_icon="🏥",
    layout="wide"
)

# 제목
st.title("🏥 보훈 의료 위탁병원 현황 대시보드")
st.markdown("---")

# 데이터 로드 함수
@st.cache_data
def load_data():
    base_path = "/Users/jm/Desktop/충북대학교/충대 4학년 1학기/5. 기타/국가보훈부/전처리된 보훈병원"
    hospitals_df = pd.read_csv("/Users/jm/Desktop/충북대학교/충대 4학년 1학기/5. 기타/국가보훈부/전처리된 보훈병원/국가보훈부_보훈의료 위탁병원 현황_20250101.csv", encoding='cp949')
    
    # 데이터 전처리
    hospitals_df['병상수'] = pd.to_numeric(hospitals_df['병상수'], errors='coerce')
    hospitals_df['진료과수'] = pd.to_numeric(hospitals_df['진료과수'], errors='coerce')
    
    return hospitals_df

# 데이터 로드
hospitals_df = load_data()

# 사이드바 필터
st.sidebar.header("🔍 필터 옵션")

# 시도 선택
selected_sido = st.sidebar.multiselect(
    "시도 선택",
    options=hospitals_df['광역시도명'].unique(),
    default=hospitals_df['광역시도명'].unique()
)

# 종별 선택
selected_type = st.sidebar.multiselect(
    "병원 종별 선택",
    options=hospitals_df['종별'].unique(),
    default=hospitals_df['종별'].unique()
)

# 병상수 범위
min_beds, max_beds = st.sidebar.slider(
    "병상수 범위",
    min_value=int(hospitals_df['병상수'].min()),
    max_value=int(hospitals_df['병상수'].max()),
    value=(int(hospitals_df['병상수'].min()), int(hospitals_df['병상수'].max()))
)

# 필터링된 데이터
filtered_df = hospitals_df[
    (hospitals_df['광역시도명'].isin(selected_sido)) &
    (hospitals_df['종별'].isin(selected_type)) &
    (hospitals_df['병상수'] >= min_beds) &
    (hospitals_df['병상수'] <= max_beds)
]

# 메인 대시보드
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="총 위탁병원 수",
        value=f"{len(filtered_df)}개",
        delta=f"{len(filtered_df) - len(hospitals_df)}개" if len(filtered_df) != len(hospitals_df) else None
    )

with col2:
    st.metric(
        label="총 병상수",
        value=f"{filtered_df['병상수'].sum():,}개",
        delta=None
    )

with col3:
    st.metric(
        label="평균 병상수",
        value=f"{filtered_df['병상수'].mean():.1f}개",
        delta=None
    )

with col4:
    st.metric(
        label="평균 진료과수",
        value=f"{filtered_df['진료과수'].mean():.1f}개",
        delta=None
    )

st.markdown("---")

# 탭 생성
tab1, tab2, tab3, tab4, tab5 = st.tabs(["📊 통계 분석", "🗺️ 지도 시각화", "🔎 병원 검색", "📈 상세 분석", "📍 접근성 분석"])

with tab1:
    col1, col2 = st.columns(2)
    
    with col1:
        # 시도별 병원 수
        fig_sido = px.bar(
            filtered_df['광역시도명'].value_counts().reset_index(),
            x='count',
            y='광역시도명',
            orientation='h',
            title='시도별 위탁병원 수',
            labels={'count': '병원 수', '광역시도명': '시도'}
        )
        st.plotly_chart(fig_sido, use_container_width=True)
        
        # 병상수 분포
        fig_beds = px.histogram(
            filtered_df,
            x='병상수',
            nbins=30,
            title='병상수 분포',
            labels={'병상수': '병상수', 'count': '병원 수'}
        )
        st.plotly_chart(fig_beds, use_container_width=True)
    
    with col2:
        # 종별 분포
        fig_type = px.pie(
            values=filtered_df['종별'].value_counts().values,
            names=filtered_df['종별'].value_counts().index,
            title='병원 종별 분포'
        )
        st.plotly_chart(fig_type, use_container_width=True)
        
        # 진료과수 박스플롯
        fig_dept = px.box(
            filtered_df,
            x='종별',
            y='진료과수',
            title='종별 진료과수 분포'
        )
        st.plotly_chart(fig_dept, use_container_width=True)

with tab2:
    st.subheader("🗺️ 보훈 의료 위탁병원 위치")
    
    # 지도 옵션
    map_col1, map_col2 = st.columns([3, 1])
    
    with map_col2:
        map_type = st.radio("지도 유형", ["개별 마커", "히트맵", "클러스터"])
        show_regions = st.checkbox("시도 경계 표시", value=False)
    
    with map_col1:
        # Folium 지도 생성
        m = folium.Map(location=[36.5, 127.5], zoom_start=7)
        
        if map_type == "개별 마커":
            # 색상 설정
            color_dict = {
                '종합병원': 'red',
                '병원': 'blue',
                '의원': 'green',
                '한방병원': 'purple',
                '한의원': 'orange',
                '치과병원': 'pink',
                '치과의원': 'lightblue'
            }
            
            for idx, row in filtered_df.iterrows():
                if pd.notna(row['위도']) and pd.notna(row['경도']):
                    popup_html = f"""
                    <div style="font-family: 'Malgun Gothic', sans-serif;">
                        <h4>{row['위탁병원명']}</h4>
                        <p>종별: {row['종별']}</p>
                        <p>병상수: {row['병상수']}개</p>
                        <p>진료과수: {row['진료과수']}개</p>
                        <p>주소: {row['광역시도명']} {row['시군구명']} {row['상세주소']}</p>
                        <p>전화: {row['전화번호']}</p>
                    </div>
                    """
                    
                    folium.Marker(
                        location=[row['위도'], row['경도']],
                        popup=folium.Popup(popup_html, max_width=300),
                        tooltip=row['위탁병원명'],
                        icon=folium.Icon(
                            color=color_dict.get(row['종별'], 'gray'),
                            icon='hospital-o',
                            prefix='fa'
                        )
                    ).add_to(m)
        
        elif map_type == "히트맵":
            heat_data = []
            for idx, row in filtered_df.iterrows():
                if pd.notna(row['위도']) and pd.notna(row['경도']):
                    weight = min(row['병상수'] / 100, 10) if pd.notna(row['병상수']) else 1
                    heat_data.append([row['위도'], row['경도'], weight])
            
            plugins.HeatMap(heat_data).add_to(m)
        
        elif map_type == "클러스터":
            marker_cluster = plugins.MarkerCluster().add_to(m)
            
            for idx, row in filtered_df.iterrows():
                if pd.notna(row['위도']) and pd.notna(row['경도']):
                    popup_html = f"<b>{row['위탁병원명']}</b><br>{row['종별']}<br>{row['전화번호']}"
                    
                    folium.Marker(
                        location=[row['위도'], row['경도']],
                        popup=popup_html,
                        tooltip=row['위탁병원명']
                    ).add_to(marker_cluster)
        
        # 지도 표시
        st_folium(m, width=700, height=600)

with tab3:
    st.subheader("🔎 병원 검색")
    
    # 검색 옵션
    search_col1, search_col2 = st.columns([2, 1])
    
    with search_col1:
        search_term = st.text_input("병원명 검색", placeholder="병원명을 입력하세요...")
    
    with search_col2:
        sort_by = st.selectbox("정렬 기준", ["병원명", "병상수", "진료과수"])
    
    # 검색 결과
    if search_term:
        search_results = filtered_df[
            filtered_df['위탁병원명'].str.contains(search_term, case=False, na=False)
        ]
    else:
        search_results = filtered_df
    
    # 정렬
    if sort_by == "병원명":
        search_results = search_results.sort_values('위탁병원명')
    elif sort_by == "병상수":
        search_results = search_results.sort_values('병상수', ascending=False)
    else:
        search_results = search_results.sort_values('진료과수', ascending=False)
    
    # 결과 표시
    st.write(f"검색 결과: {len(search_results)}개 병원")
    
    # 데이터 테이블
    st.dataframe(
        search_results[[
            '위탁병원명', '종별', '병상수', '진료과수',
            '광역시도명', '시군구명', '전화번호'
        ]],
        use_container_width=True,
        height=400
    )
    
    # 다운로드 버튼
    csv = search_results.to_csv(index=False, encoding='utf-8-sig')
    st.download_button(
        label="📥 검색 결과 다운로드 (CSV)",
        data=csv,
        file_name='hospital_search_results.csv',
        mime='text/csv'
    )

with tab4:
    st.subheader("📈 상세 분석")
    
    analysis_col1, analysis_col2 = st.columns(2)
    
    with analysis_col1:
        # 시도별 평균 병상수
        avg_beds_by_sido = filtered_df.groupby('광역시도명')['병상수'].mean().sort_values(ascending=False)
        
        fig_avg_beds = px.bar(
            x=avg_beds_by_sido.index,
            y=avg_beds_by_sido.values,
            title='시도별 평균 병상수',
            labels={'x': '시도', 'y': '평균 병상수'}
        )
        st.plotly_chart(fig_avg_beds, use_container_width=True)
        
        # 상위 10개 대형 병원
        st.write("### 🏆 상위 10개 대형 병원")
        top_hospitals = filtered_df.nlargest(10, '병상수')[
            ['위탁병원명', '병상수', '진료과수', '광역시도명']
        ]
        st.dataframe(top_hospitals, use_container_width=True)
    
    with analysis_col2:
        # 종별-시도 크로스탭
        crosstab = pd.crosstab(filtered_df['광역시도명'], filtered_df['종별'])
        
        fig_heatmap = px.imshow(
            crosstab,
            title='시도별 병원 종별 분포 히트맵',
            labels=dict(x="병원 종별", y="시도", color="병원 수"),
            aspect="auto"
        )
        st.plotly_chart(fig_heatmap, use_container_width=True)
        
        # 병상수와 진료과수 상관관계
        fig_scatter = px.scatter(
            filtered_df,
            x='병상수',
            y='진료과수',
            color='종별',
            title='병상수와 진료과수의 관계',
            hover_data=['위탁병원명']
        )
        st.plotly_chart(fig_scatter, use_container_width=True)

with tab5:
    st.subheader("📍 접근성 분석")
    
    # 사용자 위치 입력
    st.write("### 내 위치에서 가까운 병원 찾기")
    
    loc_col1, loc_col2, loc_col3 = st.columns([2, 2, 1])
    
    with loc_col1:
        user_lat = st.number_input("위도", value=36.6284, format="%.4f")
    
    with loc_col2:
        user_lon = st.number_input("경도", value=127.4573, format="%.4f")
    
    with loc_col3:
        max_distance = st.number_input("최대 거리(km)", value=50, min_value=10, max_value=200)
    
    if st.button("🔍 주변 병원 검색"):
        user_location = (user_lat, user_lon)
        
        # 거리 계산
        distances = []
        for idx, row in filtered_df.iterrows():
            if pd.notna(row['위도']) and pd.notna(row['경도']):
                hospital_location = (row['위도'], row['경도'])
                distance = geodesic(user_location, hospital_location).kilometers
                
                if distance <= max_distance:
                    distances.append({
                        '병원명': row['위탁병원명'],
                        '종별': row['종별'],
                        '거리(km)': round(distance, 1),
                        '병상수': row['병상수'],
                        '진료과수': row['진료과수'],
                        '전화번호': row['전화번호'],
                        '주소': f"{row['광역시도명']} {row['시군구명']} {row['상세주소']}"
                    })
        
        # 거리순 정렬
        distances_df = pd.DataFrame(distances).sort_values('거리(km)')
        
        # 결과 표시
        st.write(f"### 반경 {max_distance}km 내 병원: {len(distances_df)}개")
        
        # 거리별 통계
        stat_col1, stat_col2, stat_col3 = st.columns(3)
        
        with stat_col1:
            within_10 = len(distances_df[distances_df['거리(km)'] <= 10])
            st.metric("10km 이내", f"{within_10}개")
        
        with stat_col2:
            within_30 = len(distances_df[distances_df['거리(km)'] <= 30])
            st.metric("30km 이내", f"{within_30}개")
        
        with stat_col3:
            if len(distances_df) > 0:
                nearest = distances_df.iloc[0]['거리(km)']
                st.metric("가장 가까운 병원", f"{nearest}km")
            else:
                st.metric("가장 가까운 병원", "없음")
        
        # 검색 결과 테이블
        st.dataframe(distances_df, use_container_width=True, height=400)
        
        # 거리별 분포 차트
        fig_distance = px.histogram(
            distances_df,
            x='거리(km)',
            nbins=20,
            title='거리별 병원 분포'
        )
        st.plotly_chart(fig_distance, use_container_width=True)

# 푸터
st.markdown("---")
st.markdown(
    """
    <div style='text-align: center'>
        <p>데이터 기준일: 2025-01-01 | 출처: 국가보훈부 공공데이터</p>
    </div>
    """,
    unsafe_allow_html=True
)