
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Quiz = sequelize.define(
  "Quiz",
  {
    codeQuiz: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nomQuiz: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    descriptionQuiz: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seuilReussite: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    typeQuiz: {
      type: DataTypes.ENUM("module", "final"),
      allowNull: false,
      defaultValue: "module"
    },
    codeModule: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "module",
        key: "codeModule"
      }
    },
    numFormation: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "formation",
        key: "numFormation"
      }
    },
    idFormateur: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "utilisateur",
        key: "idUtilisateur"
      }
    }
  },
  {
    tableName: "quiz",
    timestamps: false,
    freezeTableName: true
  }
);

module.exports = Quiz;
