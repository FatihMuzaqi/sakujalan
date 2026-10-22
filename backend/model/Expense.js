import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { EXPENSE_CATEGORIES, EXPENSE_STATUS, INPUT_METHOD } from '../config/constants.js';

export class Expense extends Model {}

Expense.init(
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
      allowNull: false,
      references: {
        model: 'trips',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    officer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'expense_categories',
        key: 'id'
      }
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'OTHER'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receipt_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    input_method: {
      type: DataTypes.ENUM(INPUT_METHOD.MANUAL, INPUT_METHOD.RECEIPT_SCAN),
      defaultValue: INPUT_METHOD.MANUAL,
      allowNull: false
    },
    ocr_raw_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ocr_confidence: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        EXPENSE_STATUS.DRAFT,
        EXPENSE_STATUS.PENDING,
        EXPENSE_STATUS.APPROVED,
        EXPENSE_STATUS.REJECTED,
        'SUBMITTED',
        'REIMBURSED'
      ),
      defaultValue: EXPENSE_STATUS.PENDING,
      allowNull: false
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Expense',
    tableName: 'expenses'
  }
);
