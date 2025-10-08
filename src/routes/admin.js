/**
 * Admin Routes
 * Administrative endpoints for user management
 */

const express = require('express');
const { User } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * List all users with optional filtering and search
 */
router.get('/users', async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;

    // Build where clause for filtering
    const where = {};

    if (search) {
      // Search in email, first_name, last_name
      const { Op } = require('sequelize');
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    } else if (status === 'pending') {
      where.is_active = false;
      where.email_verified = false;
    }

    // Calculate pagination
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Fetch users
    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash'] },
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/pending
 * Get list of users pending approval (inactive + not email verified)
 */
router.get('/users/pending', async (req, res) => {
  try {
    const pendingUsers = await User.findAll({
      where: {
        is_active: false,
      },
      order: [['created_at', 'ASC']],
      attributes: { exclude: ['password_hash'] },
    });

    res.json({
      users: pendingUsers,
      count: pendingUsers.length,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed information about a specific user
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          association: 'crawlJobs',
          limit: 10,
          order: [['created_at', 'DESC']],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PATCH /api/admin/users/:id/approve
 * Approve a pending user (set is_active to true)
 */
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_active) {
      return res.status(400).json({ error: 'User is already active' });
    }

    user.is_active = true;
    await user.save();

    res.json({
      message: 'User approved successfully',
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

/**
 * PATCH /api/admin/users/:id/reject
 * Reject a pending user (delete them)
 */
router.patch('/users/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_active) {
      return res.status(400).json({ error: 'Cannot reject an active user. Deactivate first.' });
    }

    await user.destroy();

    res.json({
      message: 'User rejected and deleted successfully',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

/**
 * PATCH /api/admin/users/:id/toggle-active
 * Toggle user active status (activate or deactivate)
 */
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    user.is_active = !user.is_active;
    await user.save();

    res.json({
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user details (name, email, role)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate email if changing
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    // Update fields
    if (firstName !== undefined) user.first_name = firstName;
    if (lastName !== undefined) user.last_name = lastName;
    if (role !== undefined) {
      // Prevent admin from demoting themselves
      if (user.id === req.user.id && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change your own admin role' });
      }
      user.role = role;
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user permanently
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await user.destroy();

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
