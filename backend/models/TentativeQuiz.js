
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TentativeQuiz = sequelize.define("TentativeQuiz", {
  idTentative: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idApprenant: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  codeQuiz: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  dateTentative: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  statut: {
    type: DataTypes.ENUM("en_cours", "terminee"),
    allowNull: false,
    defaultValue: "en_cours"
  },
  statutSurveillance: {
    type: DataTypes.ENUM(
      "normal",
      "a_verifier",
      "validee",
      "invalidee"
    ),
    allowNull: false,
    defaultValue: "normal"
  },
  derniereActivite: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estEnLigne: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  nbSortiesEcran: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  derniereSortie: {
    type: DataTypes.DATE,
    allowNull: true
  },
  questionActuelle: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  nbReponsesDonnees: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: "tentativequiz",
  timestamps: false,
  freezeTableName: true
});

module.exports = TentativeQuiz;
