import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class ExpenseOCR extends Model {}

ExpenseOCR.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    receipt_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'expense_receipts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    raw_text: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    structured_data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    },
    ai_model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'hybrid_ocr_ai'
    },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'PARTIAL', 'FAILED'),
      allowNull: false,
      defaultValue: 'SUCCESS'
    }
  },
  {
    sequelize,
    modelName: 'ExpenseOCR',
    tableName: 'expense_ocrs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);
