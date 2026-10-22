import { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.createTable('expense_ocrs', {
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

  await queryInterface.addIndex('expense_ocrs', ['receipt_id']);
  await queryInterface.addIndex('expense_ocrs', ['expense_id']);
  await queryInterface.addIndex('expense_ocrs', ['company_id']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('expense_ocrs');
}
