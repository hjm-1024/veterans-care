require('dotenv').config();
const { VeteranType, sequelize } = require('../src/models');

const veteranTypesData = [
  {
    name: '국가유공자',
    code: 'NATIONAL_MERIT',
    description: '국가유공자 등록증을 발급받은 분',
    medicalCoverageRate: 0.90,
    specialBenefits: JSON.stringify(['chronic_disease', 'surgery', 'rehabilitation'])
  },
  {
    name: '고엽제환자',
    code: 'AGENT_ORANGE',
    description: '고엽제후유의증환자 등록증을 발급받은 분',
    medicalCoverageRate: 0.95,
    specialBenefits: JSON.stringify(['all_related_diseases', 'specialized_treatment'])
  },
  {
    name: '참전유공자',
    code: 'WAR_VETERAN',
    description: '참전유공자 등록증을 발급받은 분',
    medicalCoverageRate: 0.85,
    specialBenefits: JSON.stringify(['outpatient_care', 'prescription'])
  },
  {
    name: '보훈보상대상자',
    code: 'COMPENSATION_TARGET',
    description: '보훈보상대상자 등록증을 발급받은 분',
    medicalCoverageRate: 1.00,
    specialBenefits: JSON.stringify(['full_coverage', 'rehabilitation', 'assistive_devices'])
  },
  {
    name: '5.18민주유공자',
    code: 'MAY18_MERIT',
    description: '5.18민주유공자 등록증을 발급받은 분',  
    medicalCoverageRate: 0.90,
    specialBenefits: JSON.stringify(['chronic_disease', 'mental_health'])
  },
  {
    name: '특수임무유공자',
    code: 'SPECIAL_MISSION',
    description: '특수임무유공자 등록증을 발급받은 분',
    medicalCoverageRate: 0.90,
    specialBenefits: JSON.stringify(['specialized_care', 'priority_treatment'])
  }
];

async function seedVeteranTypes() {
  try {
    console.log('🌱 Seeding veteran types...');
    
    // 기존 데이터 확인
    const existingCount = await VeteranType.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing veteran types. Skipping seed.`);
      return;
    }

    // 데이터 삽입
    await VeteranType.bulkCreate(veteranTypesData);
    
    console.log('✅ Veteran types seeded successfully!');
    console.log(`📊 Created ${veteranTypesData.length} veteran types:`);
    
    veteranTypesData.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type.name} (${type.code})`);
    });
    
  } catch (error) {
    console.error('❌ Failed to seed veteran types:', error);
    throw error;
  }
}

// 스크립트로 직접 실행되는 경우
if (require.main === module) {
  seedVeteranTypes()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedVeteranTypes };
