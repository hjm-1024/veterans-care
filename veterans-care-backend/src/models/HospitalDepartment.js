const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HospitalDepartment = sequelize.define('HospitalDepartment', {
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
    department_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '진료과명'
    },
    sub_department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '부속부서/클리닉명'
    },
    equipment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '보유장비'
    },
    medical_content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '진료내용'
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '검색용 태그 (JSON 문자열)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '활성화 여부'
    }
  }, {
    tableName: 'hospital_departments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['hospital_id']
      },
      {
        fields: ['department_name']
      },
      {
        type: 'FULLTEXT',
        fields: ['medical_content', 'tags']
      }
    ]
  });

  return HospitalDepartment;
};
