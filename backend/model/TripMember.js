import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class TripMember extends Model {}

TripMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
      type: DataTypes.STRING(50),
      defaultValue: 'OFFICER',
      allowNull: false
    },
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'TripMember',
    tableName: 'trip_members',
    indexes: [
      {
        unique: true,
        fields: ['trip_id', 'user_id']
      }
    ]
  }
);
