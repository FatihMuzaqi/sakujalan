import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class ExpenseCategory extends Model {}

ExpenseCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'ExpenseCategory',
    tableName: 'expense_categories'
  }
);
