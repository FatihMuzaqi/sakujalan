export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('payments', {
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
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    payment_gateway: {
      type: DataTypes.STRING(50),
      defaultValue: 'SIMULATOR',
      allowNull: false
    },
    gateway_transaction_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    gateway_order_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'IDR',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'),
      defaultValue: 'PENDING',
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    raw_response: {
      type: DataTypes.JSON,
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

  await queryInterface.addIndex('payments', ['company_id']);
  await queryInterface.addIndex('payments', ['subscription_id']);
  await queryInterface.addIndex('payments', ['status']);
  await queryInterface.addIndex('payments', ['gateway_order_id']);
  await queryInterface.addIndex('payments', ['gateway_transaction_id']);
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('payments');
};
