const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VeteranType = sequelize.define('VeteranType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    medicalCoverageRate: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.90,
      comment: 'Medical coverage rate (0.0 to 1.0)'
    },
    specialBenefits: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of special benefits'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'veteran_types',
    timestamps: true
  });

  // 인스턴스 메서드
  VeteranType.prototype.getSpecialBenefitsArray = function() {
    try {
      return this.specialBenefits ? JSON.parse(this.specialBenefits) : [];
    } catch (error) {
      return [];
    }
  };

  return VeteranType;
};
