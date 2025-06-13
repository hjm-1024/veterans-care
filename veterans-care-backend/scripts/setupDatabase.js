require('dotenv').config();
const { testConnection, syncDatabase } = require('../src/models');
const { seedVeteranTypes } = require('./seedVeteranTypes');

async function setupDatabase() {
  console.log('🔧 Setting up database...');
  
  try {
    // 데이터베이스 연결 테스트
    await testConnection();
    
    // 테이블 생성/동기화
    await syncDatabase(false); // force: false (기존 데이터 유지)
    
    // 기본 데이터 시딩
    await seedVeteranTypes();
    
    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update .env file with your database credentials');
    console.log('2. Run: npm run dev');
    console.log('3. Test API: http://localhost:5001/health');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('1. Make sure MySQL is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Create database manually: CREATE DATABASE veterans_care;');
  }
  
  process.exit(0);
}

setupDatabase();
