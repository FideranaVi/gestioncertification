const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false,
    // Clever Cloud met du temps à répondre, on lui laisse le temps
    dialectOptions: {
      connectTimeout: 30000,
      // Clever Cloud exige SSL. Sans ça, il refuse.
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000, // attend 30s avant de dire "échec"
      idle: 10000,
      evict: 10000,
    },
    retry: { max: 5 },
  }
);

module.exports = sequelize;