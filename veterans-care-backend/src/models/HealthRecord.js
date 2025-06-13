const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HealthRecord = sequelize.define('HealthRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'hospitals',
        key: 'id'
      }
    },
    visitDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    doctorName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    treatment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of prescribed medications'
    },
    vitalSigns: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON object with blood pressure, pulse, etc.'
    },
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of file paths/URLs'
    },
    isEmergency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'low'
    }
  }, {
    tableName: 'health_records',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['hospitalId']
      },
      {
        fields: ['visitDate']
      },
      {
        fields: ['department']
      },
      {
        fields: ['followUpRequired', 'followUpDate']
      }
    ]
  });

  // 인스턴스 메서드
  HealthRecord.prototype.getPrescriptionArray = function() {
    try {
      return this.prescription ? JSON.parse(this.prescription) : [];
    } catch (error) {
      return [];
    }
  };

  HealthRecord.prototype.getVitalSigns = function() {
    try {
      return this.vitalSigns ? JSON.parse(this.vitalSigns) : {};
    } catch (error) {
      return {};
    }
  };

  HealthRecord.prototype.getAttachmentsArray = function() {
    try {
      return this.attachments ? JSON.parse(this.attachments) : [];
    } catch (error) {
      return [];
    }
  };

  HealthRecord.prototype.isRecentVisit = function(daysThreshold = 30) {
    const daysDifference = (new Date() - new Date(this.visitDate)) / (1000 * 60 * 60 * 24);
    return daysDifference <= daysThreshold;
  };

  return HealthRecord;
};
