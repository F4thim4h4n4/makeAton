import Customer from '../models/Customer.js';
import Subscription from '../models/Subscription.js';
import { validateEmail } from '../validators/authValidators.js';

/**
 * @desc    Get all customers (with search, filter, pagination)
 * @route   GET /api/customers
 * @access  Private (Admin, Staff; Customer gets self)
 */
export const getCustomers = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const query = {};

    // Customer role is strictly restricted to their own record
    if (req.user.role === 'customer') {
      if (!req.user.customer) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: Number(limit), totalPages: 0 },
        });
      }
      query._id = req.user.customer;
    } else {
      // Admin / Staff can filter and search
      if (status) {
        query.status = status;
      }

      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { company: searchRegex },
          { phone: searchRegex },
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Customer.countDocuments(query),
    ]);

    // Enhance customers with active subscription counts
    const customerIds = customers.map((c) => c._id);
    const subscriptionCounts = await Subscription.aggregate([
      { $match: { customer: { $in: customerIds }, status: { $in: ['active', 'confirmed'] } } },
      { $group: { _id: '$customer', count: { $sum: 1 } } },
    ]);

    const subCountMap = {};
    subscriptionCounts.forEach((sc) => {
      subCountMap[sc._id.toString()] = sc.count;
    });

    const customersWithStats = customers.map((c) => ({
      ...c,
      activeSubscriptionsCount: subCountMap[c._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      data: customersWithStats,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single customer by ID
 * @route   GET /api/customers/:id
 * @access  Private (Admin, Staff, or Customer if own ID)
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cross-customer data isolation
    if (req.user.role === 'customer' && req.user.customer?.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view other customers',
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Include recent subscriptions
    const subscriptions = await Subscription.find({ customer: id }).sort('-createdAt').limit(5);

    res.status(200).json({
      success: true,
      data: {
        customer,
        subscriptions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new customer
 * @route   POST /api/customers
 * @access  Private (Admin, Staff)
 */
export const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, company, address, notes, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Customer.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A customer with this email already exists',
      });
    }

    const customer = await Customer.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone || '',
      company: company || '',
      address: address || {},
      notes: notes || '',
      status: status || 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update customer
 * @route   PUT /api/customers/:id
 * @access  Private (Admin, Staff, or Customer updating self)
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'customer' && req.user.customer?.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot modify other customers',
      });
    }

    const { name, email, phone, company, address, notes, status } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (email && email.toLowerCase().trim() !== customer.email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!validateEmail(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }
      const existing = await Customer.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A customer with this email already exists',
        });
      }
      customer.email = normalizedEmail;
    }

    if (name) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone;
    if (company !== undefined) customer.company = company;
    if (address !== undefined) customer.address = address;
    if (notes !== undefined) customer.notes = notes;

    // Only Admin and Staff can alter customer status
    if (status && ['admin', 'staff'].includes(req.user.role)) {
      customer.status = status;
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Deactivate customer
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin only)
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Check if customer has active subscriptions
    const activeSubs = await Subscription.countDocuments({
      customer: id,
      status: { $in: ['active', 'confirmed'] },
    });

    if (activeSubs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with active or confirmed subscriptions. Please close their subscriptions first.',
      });
    }

    customer.status = 'inactive';
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};
