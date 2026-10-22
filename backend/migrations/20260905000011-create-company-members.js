import { DataTypes } from 'sequelize';
import { ROLES, MEMBER_STATUS } from '../config/constants.js';

export async function up(queryInterface) {
  await queryInterface.createTable('company_members', {
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
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('company_members', ['company_id', 'user_id'], {
    unique: true,
    name: 'company_members_company_user_unique'
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('company_members');
}
