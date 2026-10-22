export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('wallet_transactions', {
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
      onDelete: 'RESTRICT'
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'trips',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('DISBURSEMENT', 'EXPENSE_DEDUCTION', 'REFUND', 'TOP_UP'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    balance_before: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    balance_after: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    reference_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('wallet_transactions');
};
