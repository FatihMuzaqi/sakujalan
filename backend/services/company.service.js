import { sequelize, Company, User, CompanyMember, Subscription, Plan } from '../model/index.js';
import { ROLES, COMPANY_STATUS, MEMBER_STATUS, USER_STATUS, SUBSCRIPTION_STATUS } from '../config/constants.js';
import { hashPassword } from '../utils/hash.util.js';

/**
 * Get current authenticated user's company profile
 */
export const getCompanyProfile = async (companyId) => {
  const company = await Company.findByPk(companyId, {
    include: [
      {
        model: CompanyMember,
        as: 'members',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role', 'phone', 'status', 'is_active']
          }
        ]
      },
      {
        model: Subscription,
        as: 'subscriptions',
        include: [{ model: Plan, as: 'plan' }],
        limit: 1,
        order: [['created_at', 'DESC']]
      }
    ]
  });

  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  const latestSub = company.subscriptions && company.subscriptions[0];
  const now = new Date();
  let daysRemaining = 0;
  let isReadOnly = false;

  if (latestSub) {
    if (latestSub.status === SUBSCRIPTION_STATUS.ACTIVE && latestSub.current_period_end) {
      daysRemaining = Math.ceil((new Date(latestSub.current_period_end) - now) / (1000 * 60 * 60 * 24));
    } else if (latestSub.status === SUBSCRIPTION_STATUS.TRIAL && latestSub.trial_ends_at) {
      daysRemaining = Math.ceil((new Date(latestSub.trial_ends_at) - now) / (1000 * 60 * 60 * 24));
    } else {
      isReadOnly = true;
    }
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      logo: company.logo,
      status: company.status,
      created_at: company.created_at,
      total_members: company.members ? company.members.length : 0
    },
    subscription_info: {
      status: latestSub ? latestSub.status : company.status,
      plan_name: latestSub?.plan?.name || 'Standard Plan',
      days_remaining: Math.max(0, daysRemaining),
      is_read_only: isReadOnly,
      trial_ends_at: latestSub?.trial_ends_at || null,
      current_period_end: latestSub?.current_period_end || null
    }
  };
};

/**
 * Update company profile (name, phone, address, logo, email)
 */
export const updateCompanyProfile = async (companyId, updateData) => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  const allowedFields = ['name', 'phone', 'address', 'logo', 'email'];
  const sanitizedData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sanitizedData[field] = updateData[field];
    }
  }

  await company.update(sanitizedData);
  return company;
};

/**
 * Get all members in company
 */
export const getCompanyMembers = async (companyId) => {
  const members = await CompanyMember.findAll({
    where: { company_id: companyId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'status', 'is_active', 'created_at']
      }
    ],
    order: [['joined_at', 'ASC']]
  });

  return members.map(m => ({
    id: m.id,
    company_id: m.company_id,
    user_id: m.user_id,
    name: m.user ? m.user.name : 'Unknown',
    email: m.user ? m.user.email : '',
    phone: m.user ? m.user.phone : null,
    role: m.role,
    status: m.status,
    joined_at: m.joined_at,
    is_active: m.status === MEMBER_STATUS.ACTIVE && (m.user ? m.user.is_active : true)
  }));
};

/**
 * Add a new member to the company with email and temporary password
 */
export const addCompanyMember = async (companyId, memberData) => {
  const normalizedEmail = (memberData.email || '').toLowerCase().trim();

  // Check if User already exists
  let user = await User.findOne({ where: { email: normalizedEmail } });

  if (user) {
    // Check if user is already a member of this company
    const existingMembership = await CompanyMember.findOne({
      where: {
        company_id: companyId,
        user_id: user.id
      }
    });

    if (existingMembership) {
      const err = new Error('User is already a member of this company');
      err.statusCode = 409;
      err.errorCode = 'MEMBER_ALREADY_EXISTS';
      throw err;
    }
  }

  const transaction = await sequelize.transaction();

  try {
    if (!user) {
      // Create new user with temporary password
      const hashedPassword = await hashPassword(memberData.password);
      user = await User.create(
        {
          company_id: companyId,
          name: memberData.name,
          email: normalizedEmail,
          password: hashedPassword,
          phone: memberData.phone || null,
          role: memberData.role || ROLES.OFFICER,
          status: USER_STATUS.ACTIVE,
          is_active: true
        },
        { transaction }
      );
    }

    // Create CompanyMember entry
    const member = await CompanyMember.create(
      {
        company_id: companyId,
        user_id: user.id,
        role: memberData.role || ROLES.OFFICER,
        status: memberData.status || MEMBER_STATUS.ACTIVE,
        joined_at: new Date()
      },
      { transaction }
    );

    await transaction.commit();

    return {
      id: member.id,
      company_id: member.company_id,
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: member.role,
      status: member.status,
      joined_at: member.joined_at
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update member in company (role, status, name, phone)
 */
export const updateCompanyMember = async (companyId, memberId, updateData, requesterRole) => {
  // Support finding by CompanyMember ID or User ID within this company
  let member = await CompanyMember.findOne({
    where: { id: memberId, company_id: companyId },
    include: [{ model: User, as: 'user' }]
  });

  if (!member) {
    member = await CompanyMember.findOne({
      where: { user_id: memberId, company_id: companyId },
      include: [{ model: User, as: 'user' }]
    });
  }

  if (!member) {
    const err = new Error('Member not found in this company');
    err.statusCode = 404;
    err.errorCode = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // Security: ADMIN cannot modify OWNER
  if (member.role === ROLES.OWNER && requesterRole === ROLES.ADMIN) {
    const err = new Error('Admins are not permitted to modify Company Owner');
    err.statusCode = 403;
    err.errorCode = 'FORBIDDEN_CANNOT_MODIFY_OWNER';
    throw err;
  }

  // Security: Only OWNER can assign OWNER role
  if (updateData.role === ROLES.OWNER && requesterRole !== ROLES.OWNER) {
    const err = new Error('Only the Owner can transfer or assign Owner role');
    err.statusCode = 403;
    err.errorCode = 'FORBIDDEN_OWNER_ROLE_REQUIRED';
    throw err;
  }

  const transaction = await sequelize.transaction();

  try {
    // Update Member fields (role, status)
    const memberUpdates = {};
    if (updateData.role) memberUpdates.role = updateData.role;
    if (updateData.status) memberUpdates.status = updateData.status;

    if (Object.keys(memberUpdates).length > 0) {
      await member.update(memberUpdates, { transaction });
    }

    // Update User fields (name, phone, role synchronization)
    if (member.user) {
      const userUpdates = {};
      if (updateData.name) userUpdates.name = updateData.name;
      if (updateData.phone !== undefined) userUpdates.phone = updateData.phone;
      if (updateData.role) userUpdates.role = updateData.role;
      if (updateData.status) {
        userUpdates.status = updateData.status === MEMBER_STATUS.ACTIVE ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE;
        userUpdates.is_active = updateData.status === MEMBER_STATUS.ACTIVE;
      }

      if (Object.keys(userUpdates).length > 0) {
        await member.user.update(userUpdates, { transaction });
      }
    }

    await transaction.commit();

    return {
      id: member.id,
      company_id: member.company_id,
      user_id: member.user_id,
      name: member.user ? member.user.name : 'Unknown',
      email: member.user ? member.user.email : '',
      phone: member.user ? member.user.phone : null,
      role: member.role,
      status: member.status,
      joined_at: member.joined_at
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Remove/delete member from company
 */
export const deleteCompanyMember = async (companyId, memberId, requesterRole) => {
  let member = await CompanyMember.findOne({
    where: { id: memberId, company_id: companyId },
    include: [{ model: User, as: 'user' }]
  });

  if (!member) {
    member = await CompanyMember.findOne({
      where: { user_id: memberId, company_id: companyId },
      include: [{ model: User, as: 'user' }]
    });
  }

  if (!member) {
    const err = new Error('Member not found in this company');
    err.statusCode = 404;
    err.errorCode = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // Security: Cannot remove the Owner
  if (member.role === ROLES.OWNER) {
    const err = new Error('Company Owner cannot be removed from company members');
    err.statusCode = 400;
    err.errorCode = 'CANNOT_DELETE_OWNER';
    throw err;
  }

  // Security: Admin cannot delete another Admin
  if (member.role === ROLES.ADMIN && requesterRole === ROLES.ADMIN) {
    const err = new Error('Admins cannot remove other Admins. Owner permission required.');
    err.statusCode = 403;
    err.errorCode = 'FORBIDDEN_INSUFFICIENT_PERMISSIONS';
    throw err;
  }

  // Delete membership
  await member.destroy();

  return {
    message: 'Member removed successfully from company'
  };
};
