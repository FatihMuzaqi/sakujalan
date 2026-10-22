import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TRANSACTION_TYPES } from '../config/constants.js';

export class WalletTransaction extends Model {}

WalletTransaction.init(
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
    trip_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'trips',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        TRANSACTION_TYPES.INITIAL,
        TRANSACTION_TYPES.EXPENSE,
        'DISBURSEMENT',
        'EXPENSE_DEDUCTION',
        TRANSACTION_TYPES.REFUND,
        TRANSACTION_TYPES.TOP_UP
      ),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    balance_before: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    balance_after: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    reference_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'WalletTransaction',
    tableName: 'wallet_transactions',
    updatedAt: false
  }
);
