'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // User has many CrawlJobs
      User.hasMany(models.CrawlJob, { foreignKey: 'user_id', as: 'crawlJobs' });
    }

    /**
     * Validate password against stored hash
     * @param {string} password - Plain text password to validate
     * @returns {Promise<boolean>} True if password matches
     */
    async validatePassword(password) {
      return bcrypt.compare(password, this.password_hash);
    }

    /**
     * Get user's full name
     * @returns {string} Full name or email if name not set
     */
    getFullName() {
      if (this.first_name && this.last_name) {
        return `${this.first_name} ${this.last_name}`;
      }
      if (this.first_name) {
        return this.first_name;
      }
      return this.email;
    }

    /**
     * Check if user is admin
     * @returns {boolean} True if user has admin role
     */
    isAdmin() {
      return this.role === 'admin';
    }

    /**
     * Serialize user for JSON output (excluding sensitive data)
     * @returns {object} Safe user object for API responses
     */
    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      return values;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: 'Must be a valid email address',
          },
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'user',
        validate: {
          isIn: {
            args: [['user', 'admin']],
            msg: 'Role must be either user or admin',
          },
        },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      hooks: {
        beforeCreate: async user => {
          if (user.password_hash && !user.password_hash.startsWith('$2a$')) {
            // Hash password if it's not already hashed (plain text)
            user.password_hash = await bcrypt.hash(user.password_hash, 10);
          }
        },
        beforeUpdate: async user => {
          if (user.changed('password_hash') && !user.password_hash.startsWith('$2a$')) {
            // Hash password if it changed and is not already hashed
            user.password_hash = await bcrypt.hash(user.password_hash, 10);
          }
        },
      },
    }
  );

  return User;
};
