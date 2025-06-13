require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Hospital } = require('../src/models');

const CSV_FILE_PATH = '../../전처리된 보훈병원/국가보훈부_보훈의료 위탁병원 현황_20250101.csv';

async function importHospitalData() {
  try {
    console.log('🏥 Importing hospital data...');
    
    // CSV 파일 존재 확인
    const csvPath = path.resolve(__dirname, CSV_FILE_PATH);
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      return;
    }

    // 기존 데이터 확인
    const existingCount = await Hospital.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing hospitals. Skipping import to avoid duplicates.`);
      console.log('💡 To reimport, clear the hospitals table first.');
      return;
    }

    const hospitals = [];
    
    // CSV 파일 읽기
    return new Promise((resolve, reject) => {
      // 먼저 UTF-8로 시도
      let readStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
      
      readStream
        .pipe(csv())
        .on('data', (row) => {
          const hospital = parseHospitalRow(row);
          if (hospital) hospitals.push(hospital);
        })
        .on('end', async () => {
          if (hospitals.length === 0) {
            console.log('🔄 UTF-8 parsing failed, trying CP949 encoding...');
            // CP949로 다시 시도
            tryCP949Encoding(csvPath, hospitals, resolve, reject);
          } else {
            await processHospitalData(hospitals);
            resolve();
          }
        })
        .on('error', (err) => {
          console.log('🔄 UTF-8 failed, trying CP949 encoding...');
          tryCP949Encoding(csvPath, hospitals, resolve, reject);
        });
    });

  } catch (error) {
    console.error('❌ Failed to import hospital data:', error);
    throw error;
  }
}

function tryCP949Encoding(csvPath, hospitals, resolve, reject) {
  try {
    // iconv-lite가 없으면 설치 안내
    let iconv;
    try {
      iconv = require('iconv-lite');
    } catch (e) {
      console.error('❌ iconv-lite not found. Install it with: npm install iconv-lite');
      reject(e);
      return;
    }

    hospitals.length = 0; // 배열 초기화
    
    fs.createReadStream(csvPath)
      .pipe(iconv.decodeStream('cp949'))
      .pipe(csv())
      .on('data', (row) => {
        const hospital = parseHospitalRow(row);
        if (hospital) hospitals.push(hospital);
      })
      .on('end', async () => {
        await processHospitalData(hospitals);
        resolve();
      })
      .on('error', reject);
  } catch (error) {
    console.error('❌ CP949 encoding also failed:', error);
    reject(error);
  }
}

function parseHospitalRow(row) {
  try {
    // CSV 컬럼명 정리 (실제 CSV에서 확인 필요)
    const possibleNames = ['위탁병원명', '병원명', '요양기관명'];
    const possibleTypes = ['종별', '구분'];
    const possibleAddresses = ['상세주소', '주소', '소재지'];
    const possibleCities = ['광역시도명', '시도', '광역시도'];
    const possibleDistricts = ['시군구명', '시군구'];
    const possiblePhones = ['전화번호', '연락처'];
    const possibleLatitudes = ['위도', 'Y좌표', 'lat'];
    const possibleLongitudes = ['경도', 'X좌표', 'lng', 'lon'];
    const possibleBeds = ['병상수', '총병상수'];
    const possibleDepts = ['진료과수', '진료과목수'];

    // 헬퍼 함수: 가능한 컬럼명들 중에서 값 찾기
    const findValue = (possibleKeys) => {
      for (let key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
      return '';
    };

    const hospital = {
      name: findValue(possibleNames),
      type: mapHospitalType(findValue(possibleTypes)),
      bedCount: parseInt(findValue(possibleBeds)) || 0,
      departmentCount: parseInt(findValue(possibleDepts)) || 0,
      address: findValue(possibleAddresses),
      city: findValue(possibleCities),
      district: findValue(possibleDistricts),
      phone: findValue(possiblePhones),
      latitude: parseFloat(findValue(possibleLatitudes)) || 0,
      longitude: parseFloat(findValue(possibleLongitudes)) || 0,
      isVeteranFriendly: true,
      isActive: true,
      rating: 3.5, // 기본 평점
      reviewCount: 0
    };

    // 필수 데이터 검증
    if (!hospital.name || !hospital.latitude || !hospital.longitude) {
      return null;
    }

    // 좌표 범위 검증 (한국 내)
    if (hospital.latitude < 33 || hospital.latitude > 39 || 
        hospital.longitude < 124 || hospital.longitude > 132) {
      console.warn(`⚠️  Invalid coordinates for ${hospital.name}: ${hospital.latitude}, ${hospital.longitude}`);
      return null;
    }

    return hospital;
  } catch (error) {
    return null;
  }
}

function mapHospitalType(type) {
  if (!type) return '의원';
  
  const typeMapping = {
    '상급종합병원': '상급종합병원',
    '종합병원': '종합병원',
    '병원': '병원',
    '의원': '의원',
    '요양병원': '요양병원',
    '치과병원': '치과병원',
    '한방병원': '한방병원',
    '치과의원': '의원',
    '한의원': '의원'
  };
  
  // 부분 매칭도 시도
  for (let [key, value] of Object.entries(typeMapping)) {
    if (type.includes(key)) {
      return value;
    }
  }
  
  return '의원'; // 기본값
}

async function processHospitalData(hospitals) {
  try {
    if (hospitals.length === 0) {
      console.log('❌ No valid hospital data found');
      return;
    }

    console.log(`📊 Processing ${hospitals.length} hospitals...`);

    // 배치 단위로 데이터 삽입 (성능 최적화)
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < hospitals.length; i += batchSize) {
      const batch = hospitals.slice(i, i + batchSize);
      
      try {
        await Hospital.bulkCreate(batch, {
          ignoreDuplicates: true, // 중복 데이터 무시
          validate: true
        });
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} hospitals`);
      } catch (error) {
        errors += batch.length;
        console.error(`❌ Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }

    // 최종 통계
    const finalCount = await Hospital.count();
    
    console.log('\n🎉 Hospital data import completed!');
    console.log(`📊 Statistics:`);
    console.log(`   • Total processed: ${hospitals.length}`);
    console.log(`   • Successfully inserted: ${inserted}`);
    console.log(`   • Errors: ${errors}`);
    console.log(`   • Final database count: ${finalCount}`);

    // 타입별 통계
    const typeStats = await Hospital.findAll({
      attributes: [
        'type',
        [Hospital.sequelize.fn('COUNT', Hospital.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      order: [[Hospital.sequelize.fn('COUNT', Hospital.sequelize.col('id')), 'DESC']]
    });

    console.log('\n📈 Hospital types distribution:');
    typeStats.forEach(stat => {
      console.log(`   • ${stat.type}: ${stat.getDataValue('count')}개`);
    });

  } catch (error) {
    console.error('❌ Error processing hospital data:', error);
    throw error;
  }
}

// 스크립트로 직접 실행되는 경우
if (require.main === module) {
  importHospitalData()
    .then(() => {
      console.log('🎉 Import completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importHospitalData };
