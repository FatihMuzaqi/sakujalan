import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class TripLocation extends Model {}

TripLocation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'trips',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    officer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('officer_id');
      },
      set(val) {
        this.setDataValue('officer_id', val);
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    speed: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    heading: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    battery_level: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    recorded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'TripLocation',
    tableName: 'trip_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);
