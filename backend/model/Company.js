import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { COMPANY_STATUS } from '../config/constants.js';

export class Company extends Model {}

Company.init(
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
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        COMPANY_STATUS.TRIAL,
        COMPANY_STATUS.ACTIVE,
        COMPANY_STATUS.PAST_DUE,
        COMPANY_STATUS.EXPIRED,
        COMPANY_STATUS.CANCELLED,
        COMPANY_STATUS.SUSPENDED
      ),
      defaultValue: COMPANY_STATUS.TRIAL,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['status'] }
    ]
  }
);
