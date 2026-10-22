import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { EXPENSE_APPROVAL_ACTION } from '../config/constants.js';

export class ExpenseApproval extends Model {}

ExpenseApproval.init(
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
    expense_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'expenses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    approver_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    action: {
      type: DataTypes.ENUM(EXPENSE_APPROVAL_ACTION.APPROVED, EXPENSE_APPROVAL_ACTION.REJECTED),
      allowNull: false
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'ExpenseApproval',
    tableName: 'expense_approvals'
  }
);
