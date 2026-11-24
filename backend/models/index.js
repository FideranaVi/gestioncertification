
const sequelize = require("../config/database");

const Utilisateur = require("./Utilisateur");
const Formation = require("./Formation");
const Module = require("./Module");
const Quiz = require("./Quiz");
const Question = require("./Question");
const Reponse = require("./Reponse");
const ReponseApprenant = require("./ReponseApprenant");
const TentativeQuiz = require("./TentativeQuiz");
const Evaluation = require("./Evaluation");
const Certificat = require("./Certificat");
const SuiviFormation = require("./SuiviFormation");
const SuiviModule = require("./SuiviModule");

// UTILISATEUR - FORMATION
Utilisateur.hasMany(Formation, {
  foreignKey: "idFormateur",
  as: "formationsFormateur"
});

Formation.belongsTo(Utilisateur, {
  foreignKey: "idFormateur",
  as: "formateur"
});

// FORMATION - MODULE
Formation.hasMany(Module, {
  foreignKey: "numFormation",
  as: "modules",
  onDelete: "CASCADE"
});

Module.belongsTo(Formation, {
  foreignKey: "numFormation",
  as: "formation"
});

// MODULE - QUIZ DE MODULE
Module.hasMany(Quiz, {
  foreignKey: "codeModule",
  as: "quizzes",
  onDelete: "SET NULL"
});

Quiz.belongsTo(Module, {
  foreignKey: "codeModule",
  as: "module",
  onDelete: "SET NULL"
});

// FORMATION - QUIZ FINAL
Formation.hasMany(Quiz, {
  foreignKey: "numFormation",
  as: "quizzesFinaux",
  onDelete: "SET NULL"
});

Quiz.belongsTo(Formation, {
  foreignKey: "numFormation",
  as: "formation",
  onDelete: "SET NULL"
});

// FORMATEUR - QUIZ
Utilisateur.hasMany(Quiz, {
  foreignKey: "idFormateur",
  as: "quizzesFormateur"
});

Quiz.belongsTo(Utilisateur, {
  foreignKey: "idFormateur",
  as: "formateur"
});

// QUIZ - QUESTIONS
Quiz.hasMany(Question, {
  foreignKey: "codeQuiz",
  as: "questions",
  onDelete: "CASCADE"
});

Question.belongsTo(Quiz, {
  foreignKey: "codeQuiz",
  as: "quiz"
});

// QUESTIONS - REPONSES
Question.hasMany(Reponse, {
  foreignKey: "numQuestion",
  as: "reponses",
  onDelete: "CASCADE"
});

Reponse.belongsTo(Question, {
  foreignKey: "numQuestion",
  as: "question"
});

// APPRENANT - TENTATIVES
Utilisateur.hasMany(TentativeQuiz, {
  foreignKey: "idApprenant",
  as: "tentatives"
});

TentativeQuiz.belongsTo(Utilisateur, {
  foreignKey: "idApprenant",
  as: "apprenant"
});

// QUIZ - TENTATIVES
Quiz.hasMany(TentativeQuiz, {
  foreignKey: "codeQuiz",
  as: "tentatives"
});

TentativeQuiz.belongsTo(Quiz, {
  foreignKey: "codeQuiz",
  as: "quiz"
});

// TENTATIVES - REPONSES APPRENANT
TentativeQuiz.hasMany(ReponseApprenant, {
  foreignKey: "idTentative",
  as: "reponsesApprenant"
});

ReponseApprenant.belongsTo(TentativeQuiz, {
  foreignKey: "idTentative",
  as: "tentative"
});

// QUESTIONS - REPONSES APPRENANT
Question.hasMany(ReponseApprenant, {
  foreignKey: "numQuestion",
  as: "reponsesDonnees"
});

ReponseApprenant.belongsTo(Question, {
  foreignKey: "numQuestion",
  as: "question"
});

// REPONSES - REPONSES APPRENANT
Reponse.hasMany(ReponseApprenant, {
  foreignKey: "numReponse",
  as: "reponsesApprenants"
});

ReponseApprenant.belongsTo(Reponse, {
  foreignKey: "numReponse",
  as: "reponse"
});

// TENTATIVE - EVALUATION
TentativeQuiz.hasOne(Evaluation, {
  foreignKey: "idTentative",
  as: "evaluation"
});

Evaluation.belongsTo(TentativeQuiz, {
  foreignKey: "idTentative",
  as: "tentative"
});

// APPRENANT - CERTIFICATS
Utilisateur.hasMany(Certificat, {
  foreignKey: "idApprenant",
  as: "certificatsApprenant"
});

Certificat.belongsTo(Utilisateur, {
  foreignKey: "idApprenant",
  as: "apprenant"
});

// FORMATEUR - CERTIFICATS
Utilisateur.hasMany(Certificat, {
  foreignKey: "idFormateur",
  as: "certificatsFormateur"
});

Certificat.belongsTo(Utilisateur, {
  foreignKey: "idFormateur",
  as: "formateur"
});

// FORMATION - CERTIFICATS
Formation.hasMany(Certificat, {
  foreignKey: "numFormation",
  as: "certificats"
});

Certificat.belongsTo(Formation, {
  foreignKey: "numFormation",
  as: "formation"
});

// APPRENANT - SUIVI FORMATION
Utilisateur.hasMany(SuiviFormation, {
  foreignKey: "idApprenant",
  as: "suivisFormations"
});

SuiviFormation.belongsTo(Utilisateur, {
  foreignKey: "idApprenant",
  as: "apprenant"
});

// FORMATION - SUIVI FORMATION
Formation.hasMany(SuiviFormation, {
  foreignKey: "numFormation",
  as: "suivis"
});

SuiviFormation.belongsTo(Formation, {
  foreignKey: "numFormation",
  as: "formation"
});

// APPRENANT - SUIVI MODULE
Utilisateur.hasMany(SuiviModule, {
  foreignKey: "idApprenant",
  as: "suivisModules"
});

SuiviModule.belongsTo(Utilisateur, {
  foreignKey: "idApprenant",
  as: "apprenant"
});

// MODULE - SUIVI MODULE
Module.hasMany(SuiviModule, {
  foreignKey: "codeModule",
  as: "suivis"
});

SuiviModule.belongsTo(Module, {
  foreignKey: "codeModule",
  as: "module"
});

module.exports = {
  sequelize,
  Utilisateur,
  Formation,
  Module,
  Quiz,
  Question,
  Reponse,
  ReponseApprenant,
  TentativeQuiz,
  Evaluation,
  Certificat,
  SuiviFormation,
  SuiviModule
};
