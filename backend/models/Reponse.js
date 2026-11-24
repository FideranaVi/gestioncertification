
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Reponse = sequelize.define("Reponse", {
  numReponse: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  libelle: {
    type: DataTypes.STRING(300),
    allowNull: false
  },
  estCorrecte: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  numQuestion: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "reponse",
  timestamps: false,
  freezeTableName: true
});

module.exports = Reponse;
