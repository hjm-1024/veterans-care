const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Hospital = sequelize.define('Hospital', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('상급종합병원', '종합병원', '병원', '의원', '요양병원', '치과병원', '한방병원'),
      allowNull: false
    },
    bedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    departmentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    departments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of departments'
    },
    specialDepartments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of special departments'
    },
    operatingHours: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON object with operating hours'
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 3.0,
      validate: {
        min: 1.0,
        max: 5.0
      }
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isVeteranFriendly: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether hospital provides veteran services'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'hospitals',
    timestamps: true,
    indexes: [
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['city', 'district']
      },
      {
        fields: ['type']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  // 인스턴스 메서드
  Hospital.prototype.getDepartmentsArray = function() {
    try {
      return this.departments ? JSON.parse(this.departments) : [];
    } catch (error) {
      return [];
    }
  };

  Hospital.prototype.getSpecialDepartmentsArray = function() {
    try {
      return this.specialDepartments ? JSON.parse(this.specialDepartments) : [];
    } catch (error) {
      return [];
    }
  };

  Hospital.prototype.getOperatingHours = function() {
    try {
      return this.operatingHours ? JSON.parse(this.operatingHours) : {};
    } catch (error) {
      return {};
    }
  };

  return Hospital;
};
