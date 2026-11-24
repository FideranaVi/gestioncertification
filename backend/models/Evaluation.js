
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Evaluation = sequelize.define("Evaluation", {
  codeEvaluation: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false
  },
  dateEvaluation: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  resultat: {
    type: DataTypes.ENUM("reussi", "echoue"),
    allowNull: false
  },
  idTentative: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  }
}, {
  tableName: "evaluation",
  timestamps: false,
  freezeTableName: true
});

module.exports = Evaluation;
