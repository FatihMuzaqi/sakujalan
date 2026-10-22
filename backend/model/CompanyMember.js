import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ROLES, MEMBER_STATUS } from '../config/constants.js';

export class CompanyMember extends Model {}

CompanyMember.init(
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.ENUM(
        ROLES.OWNER,
        ROLES.ADMIN,
        ROLES.MANAGER,
        ROLES.OFFICER
      ),
      defaultValue: ROLES.OFFICER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        MEMBER_STATUS.ACTIVE,
        MEMBER_STATUS.INACTIVE,
        MEMBER_STATUS.SUSPENDED
      ),
      defaultValue: MEMBER_STATUS.ACTIVE,
      allowNull: false
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'CompanyMember',
    tableName: 'company_members',
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'user_id']
      }
    ]
  }
);
