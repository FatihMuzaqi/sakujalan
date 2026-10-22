import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class ExpenseReceipt extends Model {}

ExpenseReceipt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
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
    expense_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'expenses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'ExpenseReceipt',
    tableName: 'expense_receipts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);
