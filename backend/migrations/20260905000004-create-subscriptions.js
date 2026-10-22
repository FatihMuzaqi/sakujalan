export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('subscriptions', {
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
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    status: {
      type: DataTypes.ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED'),
      defaultValue: 'TRIAL',
      allowNull: false
    },
    trial_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  await queryInterface.addIndex('subscriptions', ['company_id']);
  await queryInterface.addIndex('subscriptions', ['plan_id']);
  await queryInterface.addIndex('subscriptions', ['status']);
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('subscriptions');
};
