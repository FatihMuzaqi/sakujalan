import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SUBSCRIPTION_STATUS } from '../config/constants.js';

export class Subscription extends Model {}

Subscription.init(
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
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    status: {
      type: DataTypes.ENUM(
        SUBSCRIPTION_STATUS.TRIAL,
        SUBSCRIPTION_STATUS.ACTIVE,
        SUBSCRIPTION_STATUS.PAST_DUE,
        SUBSCRIPTION_STATUS.EXPIRED,
        SUBSCRIPTION_STATUS.CANCELLED
      ),
      defaultValue: SUBSCRIPTION_STATUS.TRIAL,
      allowNull: false
    },
    trial_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['plan_id'] },
      { fields: ['status'] }
    ]
  }
);
