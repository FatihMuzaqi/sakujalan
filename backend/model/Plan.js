import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { BILLING_INTERVAL } from '../config/constants.js';

export class Plan extends Model {}

Plan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 50000.00,
      allowNull: false
    },
    billing_interval: {
      type: DataTypes.ENUM(BILLING_INTERVAL.MONTHLY, BILLING_INTERVAL.YEARLY),
      defaultValue: BILLING_INTERVAL.MONTHLY,
      allowNull: false
    },
    trial_days: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: false
    },
    max_users: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_active_trips: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_expenses: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Plan',
    tableName: 'plans',
    indexes: [
      { fields: ['code'], unique: true },
      { fields: ['is_active'] }
    ]
  }
);
