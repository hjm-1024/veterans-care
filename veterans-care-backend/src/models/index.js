const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'veterans_care',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 모델 imports
const User = require('./User')(sequelize);
const Hospital = require('./Hospital')(sequelize);
const Booking = require('./Booking')(sequelize);
const HealthRecord = require('./HealthRecord')(sequelize);
const VeteranType = require('./VeteranType')(sequelize);
const HospitalDepartment = require('./HospitalDepartment')(sequelize);
const MedicalEquipment = require('./MedicalEquipment')(sequelize);

// 관계 설정
User.hasMany(Booking, { foreignKey: 'userId' });
Booking.belongsTo(User, { foreignKey: 'userId' });

Hospital.hasMany(Booking, { foreignKey: 'hospitalId' });
Booking.belongsTo(Hospital, { foreignKey: 'hospitalId' });

User.hasMany(HealthRecord, { foreignKey: 'userId' });
HealthRecord.belongsTo(User, { foreignKey: 'userId' });

Hospital.hasMany(HealthRecord, { foreignKey: 'hospitalId' });
HealthRecord.belongsTo(Hospital, { foreignKey: 'hospitalId' });

User.belongsTo(VeteranType, { foreignKey: 'veteranTypeId' });
VeteranType.hasMany(User, { foreignKey: 'veteranTypeId' });

// 새로운 관계 설정
Hospital.hasMany(HospitalDepartment, { foreignKey: 'hospital_id', as: 'hospitalDepartments' });
HospitalDepartment.belongsTo(Hospital, { foreignKey: 'hospital_id' });

Hospital.hasMany(MedicalEquipment, { foreignKey: 'hospital_id', as: 'medicalEquipment' });
MedicalEquipment.belongsTo(Hospital, { foreignKey: 'hospital_id' });

// 데이터베이스 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// 테이블 동기화 (의존성 순서 고려)
const syncDatabase = async (force = false) => {
  try {
    // 1단계: 독립적인 테이블들 먼저 생성
    await VeteranType.sync({ force });
    await Hospital.sync({ force });
    
    // 2단계: 외래키가 있는 테이블들 생성
    await User.sync({ force });
    await Booking.sync({ force });
    await HealthRecord.sync({ force });
    await HospitalDepartment.sync({ force });
    await MedicalEquipment.sync({ force });
    
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Hospital,
  Booking,
  HealthRecord,
  VeteranType,
  HospitalDepartment,
  MedicalEquipment,
  testConnection,
  syncDatabase
};
