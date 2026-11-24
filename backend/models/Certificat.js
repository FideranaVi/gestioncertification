
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Certificat = sequelize.define(
  "Certificat",
  {
    idCertificat: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numeroCertificat: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    dateObtention: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    statutCertificat: {
      type: DataTypes.ENUM(
        "validee",
        "en_attente",
        "annulee"
      ),
      allowNull: false,
      defaultValue: "en_attente"
    },
    idApprenant: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    numFormation: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    idFormateur: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "certificat",
    timestamps: false,
    freezeTableName: true
  }
);

module.exports = Certificat;
