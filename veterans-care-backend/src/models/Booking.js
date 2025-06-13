const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
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
      allowNull: false,
      references: {
        model: 'hospitals',
        key: 'id'
      }
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    appointmentTime: {
      type: DataTypes.TIME,
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
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Purpose of visit'
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Patient symptoms'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirmationNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'bookings',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['hospitalId']
      },
      {
        fields: ['appointmentDate', 'appointmentTime']
      },
      {
        fields: ['status']
      }
    ]
  });

  // 인스턴스 메서드
  Booking.prototype.generateConfirmationNumber = function() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BK${timestamp}${random}`.toUpperCase();
  };

  Booking.prototype.isUpcoming = function() {
    const appointmentDateTime = new Date(`${this.appointmentDate}T${this.appointmentTime}`);
    return appointmentDateTime > new Date() && this.status === 'confirmed';
  };

  Booking.prototype.canBeCancelled = function() {
    const appointmentDateTime = new Date(`${this.appointmentDate}T${this.appointmentTime}`);
    const hoursUntilAppointment = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
    return hoursUntilAppointment > 24 && ['pending', 'confirmed'].includes(this.status);
  };

  return Booking;
};
