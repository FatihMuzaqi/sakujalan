export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('expense_approvals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      expense_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'expenses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      approver_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      action: {
        type: Sequelize.ENUM('APPROVED', 'REJECTED'),
        allowNull: false
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('expense_approvals', ['expense_id']);
    await queryInterface.addIndex('expense_approvals', ['approver_id']);
    await queryInterface.addIndex('expense_approvals', ['company_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('expense_approvals');
  }
};
