export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('trips', {
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    origin: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    destination: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    allocated_budget: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    remaining_budget: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'DRAFT',
      allowNull: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    officer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
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
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('trips');
};
