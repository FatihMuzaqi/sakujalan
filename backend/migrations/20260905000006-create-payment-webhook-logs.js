export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('payment_webhook_logs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    payment_gateway: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    event_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    signature: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED', 'INVALID_SIGNATURE'),
      defaultValue: 'RECEIVED',
      allowNull: false
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  await queryInterface.addIndex('payment_webhook_logs', ['event_id']);
  await queryInterface.addIndex('payment_webhook_logs', ['payment_gateway']);
  await queryInterface.addIndex('payment_webhook_logs', ['status']);
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('payment_webhook_logs');
};
