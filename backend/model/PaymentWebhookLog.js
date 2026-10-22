import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class PaymentWebhookLog extends Model {}

PaymentWebhookLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    payment_gateway: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    event_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    signature: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        'RECEIVED',
        'PROCESSED',
        'DUPLICATE',
        'FAILED',
        'INVALID_SIGNATURE'
      ),
      defaultValue: 'RECEIVED',
      allowNull: false
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'PaymentWebhookLog',
    tableName: 'payment_webhook_logs',
    updatedAt: false,
    indexes: [
      { fields: ['event_id'] },
      { fields: ['payment_gateway'] },
      { fields: ['status'] }
    ]
  }
);
