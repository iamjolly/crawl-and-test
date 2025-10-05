require('dotenv').config();

const useCloudSQL = !!process.env.CATS_CLOUD_SQL_CONNECTION_NAME;

const baseConfig = {
  username: process.env.CATS_DB_USER || 'cats_user',
  password: process.env.CATS_DB_PASSWORD || 'cats_password',
  database: process.env.CATS_DB_NAME || 'cats_dev',
  host: process.env.CATS_DB_HOST || 'localhost',
  port: parseInt(process.env.CATS_DB_PORT || '5432', 10),
  dialect: 'postgres',
  // eslint-disable-next-line no-console
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: parseInt(process.env.CATS_DB_POOL_MAX || '5', 10),
    min: parseInt(process.env.CATS_DB_POOL_MIN || '0', 10),
    acquire: parseInt(process.env.CATS_DB_POOL_ACQUIRE || '30000', 10),
    idle: parseInt(process.env.CATS_DB_POOL_IDLE || '10000', 10),
  },
};

// Cloud SQL configuration for production
if (useCloudSQL) {
  baseConfig.dialectOptions = {
    socketPath: `/cloudsql/${process.env.CATS_CLOUD_SQL_CONNECTION_NAME}`,
  };
  // Remove host when using Cloud SQL socket
  delete baseConfig.host;
} else if (process.env.CATS_DB_SSL === 'true') {
  // SSL configuration for non-Cloud SQL production databases
  baseConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
}

module.exports = {
  development: {
    ...baseConfig,
    database: process.env.CATS_DB_NAME || 'cats_dev',
  },
  test: {
    ...baseConfig,
    database: process.env.CATS_DB_NAME_TEST || 'cats_test',
    logging: false,
  },
  production: {
    ...baseConfig,
    database: process.env.CATS_DB_NAME || 'cats_production',
    logging: false,
  },
};
