
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Formation = sequelize.define("Formation", {
  numFormation: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titre: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  dateDebut: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  dateFin: {
    type: DataTypes.DATEONLY,
    allowNull: true
    
  },
  idFormateur: {
  type: DataTypes.INTEGER,
  allowNull: true
}
}, {
  tableName: "formation",
  timestamps: false,
  freezeTableName: true
});

module.exports = Formation;
