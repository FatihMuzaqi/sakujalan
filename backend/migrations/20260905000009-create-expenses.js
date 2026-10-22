export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('expenses', {
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
      allowNull: false,
      references: {
        model: 'trips',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    officer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    category: {
      type: DataTypes.ENUM('TRANSPORT', 'ACCOMMODATION', 'MEALS', 'FUEL', 'TOLL', 'SUPPLIES', 'OTHER'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receipt_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ocr_raw_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ocr_confidence: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'),
      defaultValue: 'SUBMITTED',
      allowNull: false
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
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
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('expenses');
};
