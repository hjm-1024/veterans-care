const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalEquipment = sequelize.define('MedicalEquipment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hospital_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'hospitals',
        key: 'id'
      }
    },
    equipment_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '장비명'
    },
    equipment_clean_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '정제된 장비명'
    },
    equipment_category: {
      type: DataTypes.ENUM('진단', '치료', '수술', '지원', '기타'),
      allowNull: true,
      comment: '장비 분류'
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '사용 목적'
    },
    purpose_tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '목적 관련 태그'
    },
    department_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '소속 진료과'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '활성화 여부'
    }
  }, {
    tableName: 'medical_equipment',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['hospital_id']
      },
      {
        fields: ['equipment_category']
      },
      {
        fields: ['department_name']
      },
      {
        type: 'FULLTEXT',
        fields: ['equipment_name', 'purpose', 'purpose_tags']
      }
    ]
  });

  return MedicalEquipment;
};
