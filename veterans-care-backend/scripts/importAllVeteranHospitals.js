const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// 데이터베이스 연결 설정
const sequelize = new Sequelize(
  process.env.DB_NAME || 'veterans_care',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// 병원별 정보 설정
const hospitalInfo = {
  '대전보훈병원': {
    location: '대전광역시',
    csvFile: '한국보훈복지의료공단_보훈병원 진료정보_대전보훈병원_20231231 (1)_태그포함.csv'
  },
  '부산보훈병원': {
    location: '부산광역시',
    csvFile: '한국보훈복지의료공단_보훈병원 진료정보_부산보훈병원_20231231_태그포함.csv'
  },
  '광주보훈병원': {
    location: '광주광역시',
    csvFile: '한국보훈복지의료공단_보훈병원 진료정보_광주보훈병원_20231231_태그포함.csv'
  },
  '대구보훈병원': {
    location: '대구광역시',
    csvFile: '한국보훈복지의료공단_보훈병원 진료정보_대구보훈병원_20231231_태그포함.csv'
  },
  '인천보훈병원': {
    location: '인천광역시',
    csvFile: '한국보훈복지의료공단_보훈병원 진료정보_인천보훈병원_20231231_태그포함.csv'
  }
};

// CSV 파싱 함수
function parseCSV(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }

  return data;
}

// 태그 파싱 함수
function parseTags(tagString) {
  if (!tagString || tagString.trim() === '') return [];
  
  try {
    // 다양한 태그 형식 처리
    let cleaned = tagString.trim();
    
    // 배열 형식이면 JSON 파싱 시도
    if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        // JSON 파싱 실패시 문자열 처리
        cleaned = cleaned.slice(1, -1); // 대괄호 제거
      }
    }
    
    // 쉼표로 분리하고 따옴표 제거
    return cleaned.split(',')
      .map(tag => tag.trim().replace(/['"]/g, ''))
      .filter(tag => tag.length > 0);
  } catch (error) {
    console.warn(`태그 파싱 오류: ${tagString}`, error.message);
    return [];
  }
}

// 단일 병원 데이터 임포트 함수
async function importHospitalData(hospitalName, hospitalData) {
  const { location, csvFile } = hospitalData;
  const basePath = '/Users/jm/Desktop/충북대학교/충대 4학년 1학기/5. 기타/국가보훈부/전처리된 보훈병원';
  const folderName = `${hospitalName}_정제완료`;
  const filePath = path.join(basePath, folderName, csvFile);

  console.log(`\n🏥 ${hospitalName} 데이터 임포트 시작...`);
  console.log(`📁 파일 경로: ${filePath}`);

  // 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    return 0;
  }

  try {
    // 파일 읽기 (인코딩 자동 감지)
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      // UTF-8 실패시 CP949로 시도
      console.log('UTF-8 읽기 실패, CP949로 재시도...');
      const iconv = require('iconv-lite');
      const buffer = fs.readFileSync(filePath);
      content = iconv.decode(buffer, 'cp949');
    }

    // CSV 파싱
    const csvData = parseCSV(content);
    console.log(`📊 파싱된 데이터: ${csvData.length}개`);

    if (csvData.length === 0) {
      console.warn(`⚠️ ${hospitalName}: 유효한 데이터가 없습니다.`);
      return 0;
    }

    // 샘플 데이터 출력
    console.log(`📋 첫 번째 데이터 샘플:`, csvData[0]);

    // 데이터 검증 및 변환
    const validData = [];
    const invalidData = [];

    for (const row of csvData) {
      // 필수 필드 확인 (다양한 컬럼명 지원)
      const department = row['진료과'] || row['진료과별'] || row['department'] || '';
      const services = row['진료 내용'] || row['진료내용'] || row['내용'] || row['services'] || '';

      if (!department.trim() || !services.trim()) {
        invalidData.push(row);
        continue;
      }

      // 태그 처리
      const tagString = row['태그'] || row['tags'] || '';
      const tags = parseTags(tagString);

      // 부속부서 필드 처리 (다양한 컬럼명 지원)
      const subDepartment = row['부속부서'] || row['소속부서'] || row['sub_department'] || '';
      
      // 보유장비 필드 처리 (다양한 컬럼명 지원)
      const equipment = row['보유장비'] || row['보유장비(한글)'] || row['equipment'] || '';

      validData.push({
        hospital_name: hospitalName,
        hospital_location: location,
        department: department.trim(),
        sub_department: subDepartment.trim(),
        equipment: equipment.trim(),
        services: services.trim(),
        tags: JSON.stringify(tags)
      });
    }

    console.log(`✅ 유효한 데이터: ${validData.length}개`);
    if (invalidData.length > 0) {
      console.log(`⚠️ 무효한 데이터: ${invalidData.length}개`);
    }

    if (validData.length === 0) {
      console.warn(`⚠️ ${hospitalName}: 임포트할 유효한 데이터가 없습니다.`);
      return 0;
    }

    // 기존 데이터 확인 (중복 방지)
    const [existingData] = await sequelize.query(
      'SELECT COUNT(*) as count FROM veteran_hospital_medical_services WHERE hospital_name = ?',
      { 
        replacements: [hospitalName],
        type: sequelize.QueryTypes.SELECT 
      }
    );

    if (existingData.count > 0) {
      console.log(`⚠️ ${hospitalName}: 이미 ${existingData.count}개 데이터가 존재합니다. 삭제 후 재임포트...`);
      await sequelize.query(
        'DELETE FROM veteran_hospital_medical_services WHERE hospital_name = ?',
        { replacements: [hospitalName] }
      );
    }

    // 배치 삽입
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < validData.length; i += batchSize) {
      const batch = validData.slice(i, i + batchSize);
      
      try {
        await sequelize.query(`
          INSERT INTO veteran_hospital_medical_services 
          (hospital_name, hospital_location, department, sub_department, equipment, services, tags)
          VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}
        `, {
          replacements: batch.flatMap(item => [
            item.hospital_name,
            item.hospital_location,
            item.department,
            item.sub_department,
            item.equipment,
            item.services,
            item.tags
          ])
        });

        totalInserted += batch.length;
        process.stdout.write(`\r💾 ${hospitalName} 저장 중... ${totalInserted}/${validData.length}`);
      } catch (error) {
        console.error(`❌ ${hospitalName} 배치 삽입 오류 (${i}-${i + batchSize}):`, error.message);
      }
    }

    console.log(`\n✅ ${hospitalName} 임포트 완료: ${totalInserted}개`);
    return totalInserted;

  } catch (error) {
    console.error(`❌ ${hospitalName} 임포트 실패:`, error.message);
    return 0;
  }
}

// 메인 실행 함수
async function main() {
  console.log('🏥 나머지 5개 보훈병원 진료정보 임포트 시작\n');
  console.log('=' * 60);

  try {
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');

    // 테이블 존재 확인
    await sequelize.query('SELECT 1 FROM veteran_hospital_medical_services LIMIT 1');
    console.log('✅ 테이블 확인 완료');

    let totalImported = 0;
    const results = {};

    // 각 병원별로 순차 임포트
    for (const [hospitalName, hospitalData] of Object.entries(hospitalInfo)) {
      const imported = await importHospitalData(hospitalName, hospitalData);
      results[hospitalName] = imported;
      totalImported += imported;
    }

    // 최종 결과 확인
    console.log('\n' + '=' * 60);
    console.log('🎉 전체 임포트 완료!');
    console.log('📊 병원별 임포트 결과:');
    
    for (const [hospitalName, count] of Object.entries(results)) {
      console.log(`   • ${hospitalName}: ${count}개`);
    }
    
    console.log(`📈 총 임포트된 데이터: ${totalImported}개`);

    // 전체 데이터 현황 확인
    const [totalCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM veteran_hospital_medical_services',
      { type: sequelize.QueryTypes.SELECT }
    );

    const [hospitalCounts] = await sequelize.query(`
      SELECT hospital_name, COUNT(*) as count 
      FROM veteran_hospital_medical_services 
      GROUP BY hospital_name 
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📊 전체 데이터베이스 현황:`);
    console.log(`   • 총 진료정보: ${totalCount.count}개`);
    console.log(`   • 병원별 분포:`);
    
    if (Array.isArray(hospitalCounts)) {
      hospitalCounts.forEach(hospital => {
        console.log(`     - ${hospital.hospital_name}: ${hospital.count}개`);
      });
    }

    console.log('\n🚀 다음 단계:');
    console.log('   1. 백엔드 서버 실행: npm run dev');
    console.log('   2. API 테스트: http://localhost:5001/api/hospitals');
    console.log('   3. 진료정보 검색 API 개발');

  } catch (error) {
    console.error('❌ 임포트 실패:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { main };
