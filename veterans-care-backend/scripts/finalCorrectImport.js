// scripts/finalCorrectImport.js
// SQL 바인딩 오류를 해결한 최종 임포트 스크립트

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
require('dotenv').config();

class FinalCorrectImporter {
  constructor() {
    this.connection = null;
    this.baseDataPath = '/Users/jm/Desktop/충북대학교/충대 4학년 1학기/5. 기타/국가보훈부/전처리된 보훈병원';
    
    this.hospitals = [
      { name: '중앙보훈병원', folder: '중앙보훈병원_정제완료' },
      { name: '대전보훈병원', folder: '대전보훈병원_정제완료' },
      { name: '부산보훈병원', folder: '부산보훈병원_정제완료' },
      { name: '광주보훈병원', folder: '광주보훈병원_정제완료' },
      { name: '대구보훈병원', folder: '대구보훈병원_정제완료' },
      { name: '인천보훈병원', folder: '인천보훈병원_정제완료' }
    ];
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'veterans_care',
        charset: 'utf8mb4'
      });
      console.log('✅ 데이터베이스 연결 성공');
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error);
      throw error;
    }
  }

  // 인코딩 자동 감지 및 변환
  detectAndConvertEncoding(filePath) {
    try {
      // UTF-8 시도
      const contentUtf8 = fs.readFileSync(filePath, 'utf8');
      if (!contentUtf8.includes('�')) {
        return contentUtf8;
      }
    } catch (error) {
      console.log(`UTF-8 읽기 실패: ${error.message}`);
    }
    
    try {
      // EUC-KR 시도
      const iconv = require('iconv-lite');
      const buffer = fs.readFileSync(filePath);
      const contentEucKr = iconv.decode(buffer, 'euc-kr');
      return contentEucKr;
    } catch (error) {
      console.log(`EUC-KR 읽기 실패: ${error.message}`);
    }
    
    // 마지막 시도 - 원본 그대로
    return fs.readFileSync(filePath, 'utf8');
  }

  async readFile(filePath) {
    try {
      if (filePath.endsWith('.csv')) {
        const content = this.detectAndConvertEncoding(filePath);
        const lines = content.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return { headers: [], rows: [] };
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/["\uFEFF]/g, ''));
        const rows = lines.slice(1).map(line => {
          return line.split(',').map(cell => cell.trim().replace(/["\uFEFF]/g, ''));
        }).filter(row => row.some(cell => cell && cell !== ''));
        
        return { headers, rows };
      } else {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const data = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false
        });
        
        if (data.length === 0) return { headers: [], rows: [] };
        
        const headers = data[0].map(h => String(h || '').trim());
        const rows = data.slice(1).filter(row => 
          row.some(cell => cell && cell.toString().trim() !== '')
        );
        
        return { headers, rows };
      }
    } catch (error) {
      console.error(`❌ 파일 읽기 오류: ${error.message}`);
      return { headers: [], rows: [] };
    }
  }

  categorizeEquipment(name) {
    const lowerName = String(name).toLowerCase();
    if (lowerName.includes('ct')) return 'CT';
    if (lowerName.includes('mri')) return 'MRI';
    if (lowerName.includes('x선') || lowerName.includes('x-ray')) return 'X-RAY';
    if (lowerName.includes('초음파')) return '초음파';
    if (lowerName.includes('내시경')) return '내시경';
    if (lowerName.includes('혈액')) return '혈액검사';
    if (lowerName.includes('심전도')) return '심전도';
    if (lowerName.includes('수술')) return '수술장비';
    if (lowerName.includes('영상')) return '영상장비';
    if (lowerName.includes('치료')) return '치료장비';
    if (lowerName.includes('진단')) return '진단장비';
    if (lowerName.includes('검사')) return '검사장비';
    return '기타';
  }

  // 개별 삽입 방식으로 변경 (배열 바인딩 오류 해결)
  async insertEquipmentBatch(equipmentBatch) {
    let successCount = 0;
    
    for (const equipment of equipmentBatch) {
      try {
        const query = `
          INSERT INTO veteran_hospital_equipment 
          (hospital_name, hospital_location, equipment_name, equipment_category, purpose, tags)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await this.connection.execute(query, equipment);
        successCount++;
      } catch (error) {
        console.error(`❌ 장비 삽입 실패: ${error.message}`);
        console.error(`데이터: ${JSON.stringify(equipment)}`);
      }
    }
    
    return successCount;
  }

  async insertDiseaseBatch(diseaseBatch) {
    let successCount = 0;
    
    for (const disease of diseaseBatch) {
      try {
        const query = `
          INSERT INTO veteran_hospital_disease_statistics 
          (hospital_name, hospital_location, type, code, name, 
           government_cost, private_cost, total_cost, major_category_code, major_category)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await this.connection.execute(query, disease);
        successCount++;
      } catch (error) {
        console.error(`❌ 질병통계 삽입 실패: ${error.message}`);
        console.error(`데이터: ${JSON.stringify(disease)}`);
      }
    }
    
    return successCount;
  }

  async tryImportAsEquipment(filePath, hospital) {
    console.log(`🔧 의료장비로 임포트 시도: ${path.basename(filePath)}`);
    
    const { headers, rows } = await this.readFile(filePath);
    
    if (rows.length === 0) {
      console.log(`⚠️ 데이터 없음`);
      return 0;
    }
    
    console.log(`📋 헤더: [${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}]`);
    console.log(`📊 데이터 행: ${rows.length}개`);
    
    // 장비명으로 사용할 컬럼 찾기
    let nameIndex = -1;
    let purposeIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header && (header.includes('품명') || header.includes('장비') || header.includes('기기') || 
          header.includes('name') || (header.includes('명') && !header.includes('병명')))) {
        nameIndex = i;
        break;
      }
    }
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header && (header.includes('용도') || header.includes('목적') || header.includes('기능'))) {
        purposeIndex = i;
        break;
      }
    }
    
    // 찾지 못했으면 첫 번째 컬럼 사용
    if (nameIndex === -1 && headers.length > 0) {
      nameIndex = 0;
    }
    
    if (nameIndex === -1) {
      console.log(`⚠️ 장비명 컬럼을 찾을 수 없음`);
      return 0;
    }
    
    console.log(`✅ 장비명 컬럼: "${headers[nameIndex]}" (${nameIndex})`);
    if (purposeIndex !== -1) {
      console.log(`✅ 용도 컬럼: "${headers[purposeIndex]}" (${purposeIndex})`);
    }
    
    const equipmentBatch = [];
    
    for (const row of rows) {
      const equipmentName = row[nameIndex];
      if (!equipmentName || String(equipmentName).trim() === '') continue;
      
      const purpose = purposeIndex !== -1 ? String(row[purposeIndex] || '') : '';
      const category = this.categorizeEquipment(equipmentName);
      const tags = JSON.stringify([String(equipmentName), category]);
      
      equipmentBatch.push([
        hospital.name,
        hospital.name.replace('보훈병원', '').trim(),
        String(equipmentName).trim(),
        category,
        purpose.trim(),
        tags
      ]);
    }
    
    if (equipmentBatch.length > 0) {
      const insertedCount = await this.insertEquipmentBatch(equipmentBatch);
      console.log(`✅ ${insertedCount}개 장비 임포트 성공 (총 ${equipmentBatch.length}개 시도)`);
      return insertedCount;
    }
    
    console.log(`⚠️ 유효한 데이터 없음`);
    return 0;
  }

  async tryImportAsDisease(filePath, hospital) {
    console.log(`🦠 질병통계로 임포트 시도: ${path.basename(filePath)}`);
    
    const { headers, rows } = await this.readFile(filePath);
    
    if (rows.length === 0) {
      console.log(`⚠️ 데이터 없음`);
      return 0;
    }
    
    console.log(`📋 헤더: [${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}]`);
    console.log(`📊 데이터 행: ${rows.length}개`);
    
    // 질병명으로 사용할 컬럼 찾기
    let nameIndex = -1, codeIndex = -1, typeIndex = -1;
    let costIndices = { gov: -1, private: -1, total: -1 };
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase().trim();
      if (header && (header.includes('병명') || header.includes('상병명') || 
          (header.includes('명') && header.includes('병')))) {
        nameIndex = i;
        break;
      }
    }
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header && header.includes('코드') && !header.includes('대분류')) {
        codeIndex = i;
        break;
      }
    }
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header && (header.includes('구분') || header === 'type')) {
        typeIndex = i;
        break;
      }
    }
    
    // 비용 관련 컬럼 찾기
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header.includes('국비')) costIndices.gov = i;
      if (header.includes('사비')) costIndices.private = i;
      if (header === '계' || header.includes('총계')) costIndices.total = i;
    }
    
    // 찾지 못했으면 적절한 위치 추정
    if (nameIndex === -1 && headers.length > 1) {
      nameIndex = 1; // 보통 2번째 컬럼이 질병명
    }
    
    if (nameIndex === -1) {
      console.log(`⚠️ 질병명 컬럼을 찾을 수 없음`);
      return 0;
    }
    
    console.log(`✅ 질병명 컬럼: "${headers[nameIndex]}" (${nameIndex})`);
    
    const diseaseBatch = [];
    
    for (const row of rows) {
      const diseaseName = row[nameIndex];
      if (!diseaseName || String(diseaseName).trim() === '') continue;
      
      const diseaseType = typeIndex !== -1 ? String(row[typeIndex] || '질병') : '질병';
      const diseaseCode = codeIndex !== -1 ? String(row[codeIndex] || '') : '';
      
      const govCost = costIndices.gov !== -1 ? parseInt(String(row[costIndices.gov] || '0')) || 0 : 0;
      const privateCost = costIndices.private !== -1 ? parseInt(String(row[costIndices.private] || '0')) || 0 : 0;
      const totalCost = costIndices.total !== -1 ? parseInt(String(row[costIndices.total] || '0')) || 0 : (govCost + privateCost);
      
      diseaseBatch.push([
        hospital.name,
        hospital.name.replace('보훈병원', '').trim(),
        diseaseType.trim(),
        diseaseCode.trim(),
        String(diseaseName).trim(),
        govCost,
        privateCost,
        totalCost,
        '', // major_category_code
        '기타' // major_category
      ]);
    }
    
    if (diseaseBatch.length > 0) {
      const insertedCount = await this.insertDiseaseBatch(diseaseBatch);
      console.log(`✅ ${insertedCount}개 질병통계 임포트 성공 (총 ${diseaseBatch.length}개 시도)`);
      return insertedCount;
    }
    
    console.log(`⚠️ 유효한 데이터 없음`);
    return 0;
  }

  async importAllFilesInHospital(hospital) {
    const hospitalPath = path.join(this.baseDataPath, hospital.folder);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🏥 ${hospital.name} - 모든 파일 시도`);
    console.log('='.repeat(70));
    
    if (!fs.existsSync(hospitalPath)) {
      console.log(`❌ 폴더가 존재하지 않습니다: ${hospitalPath}`);
      return { equipment: 0, disease: 0 };
    }
    
    const files = fs.readdirSync(hospitalPath);
    console.log(`📁 총 ${files.length}개 파일 발견`);
    
    let totalEquipment = 0;
    let totalDisease = 0;
    
    for (const file of files) {
      // 진료정보와 비급여정보는 스킵 (이미 임포트됨)
      if (file.includes('진료정보') || file.includes('비급여')) {
        console.log(`⏭️ 스킵: ${file}`);
        continue;
      }
      
      // Excel, CSV 파일만 처리
      if (!file.endsWith('.xlsx') && !file.endsWith('.xls') && !file.endsWith('.csv')) {
        console.log(`⏭️ 지원하지 않는 형식: ${file}`);
        continue;
      }
      
      const filePath = path.join(hospitalPath, file);
      
      console.log(`\n📄 처리중: ${file}`);
      
      // 파일명으로 유형 추정
      if (file.includes('장비') || file.includes('equipment')) {
        // 의료장비로 시도
        const equipmentCount = await this.tryImportAsEquipment(filePath, hospital);
        totalEquipment += equipmentCount;
      } else if (file.includes('질병') || file.includes('통계') || file.includes('disease')) {
        // 질병통계로 시도
        const diseaseCount = await this.tryImportAsDisease(filePath, hospital);
        totalDisease += diseaseCount;
      } else {
        // 둘 다 시도
        const equipmentCount = await this.tryImportAsEquipment(filePath, hospital);
        totalEquipment += equipmentCount;
        
        if (equipmentCount < 5) { // 장비가 적으면 질병통계로도 시도
          const diseaseCount = await this.tryImportAsDisease(filePath, hospital);
          totalDisease += diseaseCount;
        }
      }
    }
    
    console.log(`\n✨ ${hospital.name} 완료: 장비 ${totalEquipment}개, 질병통계 ${totalDisease}개`);
    return { equipment: totalEquipment, disease: totalDisease };
  }

  async importAll() {
    console.log('🚀 SQL 바인딩 오류 해결된 최종 임포트 시작\n');
    
    let totalEquipment = 0;
    let totalDisease = 0;
    
    for (const hospital of this.hospitals) {
      const result = await this.importAllFilesInHospital(hospital);
      totalEquipment += result.equipment;
      totalDisease += result.disease;
    }
    
    // 최종 통계
    const [equipmentTotal] = await this.connection.execute('SELECT COUNT(*) as total FROM veteran_hospital_equipment');
    const [diseaseTotal] = await this.connection.execute('SELECT COUNT(*) as total FROM veteran_hospital_disease_statistics');
    
    console.log('\n🎉 최종 임포트 완료!');
    console.log(`신규 데이터: ${totalEquipment + totalDisease}개 (장비 ${totalEquipment}개 + 질병통계 ${totalDisease}개)`);
    console.log(`전체 의료장비: ${equipmentTotal[0].total}개`);
    console.log(`전체 질병통계: ${diseaseTotal[0].total}개`);
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ 데이터베이스 연결 종료');
    }
  }
}

async function main() {
  const importer = new FinalCorrectImporter();
  
  try {
    await importer.connect();
    await importer.importAll();
  } catch (error) {
    console.error('❌ 전체 임포트 과정에서 오류 발생:', error);
  } finally {
    await importer.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FinalCorrectImporter };