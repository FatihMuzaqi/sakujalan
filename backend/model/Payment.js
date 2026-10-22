import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { PAYMENT_STATUS } from '../config/constants.js';

export class Payment extends Model {}

Payment.init(
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
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    payment_gateway: {
      type: DataTypes.STRING(50),
      defaultValue: 'SIMULATOR',
      allowNull: false
    },
    gateway_transaction_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    gateway_order_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'IDR',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        PAYMENT_STATUS.PENDING,
        PAYMENT_STATUS.PAID,
        PAYMENT_STATUS.FAILED,
        PAYMENT_STATUS.EXPIRED,
        PAYMENT_STATUS.CANCELLED,
        PAYMENT_STATUS.REFUNDED
      ),
      defaultValue: PAYMENT_STATUS.PENDING,
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    raw_response: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['subscription_id'] },
      { fields: ['status'] },
      { fields: ['gateway_order_id'] },
      { fields: ['gateway_transaction_id'] }
    ]
  }
);
