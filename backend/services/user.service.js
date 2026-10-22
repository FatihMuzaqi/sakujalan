import { User } from '../model/index.js';
import { hashPassword } from '../utils/hash.util.js';
import { Op } from 'sequelize';

export const getCompanyUsers = async (companyId, { page = 1, limit = 20, search, role, is_active }) => {
  const where = { company_id: companyId };

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } }
    ];
  }

  if (role) {
    where.role = role;
  }

  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }

  const offset = (page - 1) * limit;

  const { rows: users, count: total } = await User.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['created_at', 'DESC']]
  });

  return {
    users,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total_pages: Math.ceil(total / limit)
    }
  };
};

export const getUserById = async (companyId, userId) => {
  const user = await User.findOne({
    where: {
      id: userId,
      company_id: companyId
    }
  });

  if (!user) {
    const err = new Error('User not found in this company');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

export const createCompanyUser = async (companyId, userData) => {
  // Check if email already in use globally or in company
  const existingUser = await User.findOne({ where: { email: userData.email } });
  if (existingUser) {
    const err = new Error('Email address is already in use');
    err.statusCode = 409;
    err.errorCode = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  const hashedPassword = await hashPassword(userData.password);

  const newUser = await User.create({
    company_id: companyId,
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    phone: userData.phone || null,
    role: userData.role,
    is_active: true
  });

  return newUser.toJSON();
};

export const updateCompanyUser = async (companyId, userId, updateData) => {
  const user = await User.findOne({
    where: {
      id: userId,
      company_id: companyId
    }
  });

  if (!user) {
    const err = new Error('User not found in this company');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ['name', 'phone', 'role', 'is_active', 'avatar_url'];
  const fieldsToUpdate = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      fieldsToUpdate[field] = updateData[field];
    }
  }

  await user.update(fieldsToUpdate);
  return user.toJSON();
};

export const toggleUserStatus = async (companyId, userId) => {
  const user = await User.findOne({
    where: {
      id: userId,
      company_id: companyId
    }
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  await user.update({ is_active: !user.is_active });
  return user.toJSON();
};
