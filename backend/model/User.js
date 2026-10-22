import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ROLES, USER_STATUS } from '../config/constants.js';

export class User extends Model {
  // Method to remove sensitive fields when converting to JSON
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

User.init(
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
      onDelete: 'SET NULL'
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
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    auth_provider: {
      type: DataTypes.STRING(50),
      defaultValue: 'LOCAL',
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM(
        ROLES.SUPER_ADMIN,
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
        USER_STATUS.ACTIVE,
        USER_STATUS.INACTIVE,
        USER_STATUS.SUSPENDED
      ),
      defaultValue: USER_STATUS.ACTIVE,
      allowNull: false
    },
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users'
  }
);
