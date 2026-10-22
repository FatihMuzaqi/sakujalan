import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TRIP_STATUS } from '../config/constants.js';

export class Trip extends Model {}

Trip.init(
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
      onDelete: 'RESTRICT'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    officer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    trip_code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    start_location: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    origin: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    start_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    start_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    destination: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    destination_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    destination_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    start_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    initial_balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    allocated_budget: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    remaining_budget: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: TRIP_STATUS.DRAFT,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Trip',
    tableName: 'trips'
  }
);
