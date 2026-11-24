
const db = require("../models");

const obtenirUtilisateurConnecte = (req) => {
  return req.utilisateur || req.user || {};
};

const obtenirIdUtilisateur = (req) => {
  const utilisateur = obtenirUtilisateurConnecte(req);

  return utilisateur.idUtilisateur || utilisateur.id || null;
};

const obtenirRole = (req) => {
  return obtenirUtilisateurConnecte(req).role || null;
};

const estProprietaireQuiz = async (codeQuiz, idFormateur) => {
  const quiz = await db.Quiz.findOne({
    where: {
      codeQuiz,
      idFormateur
    }
  });

  return Boolean(quiz);
};

const reponseErreur = (res, error, message = "Une erreur est survenue.") => {
  console.error(error);

  return res.status(500).json({
    message,
    erreur: error.message
  });
};

module.exports = {
  db,
  obtenirUtilisateurConnecte,
  obtenirIdUtilisateur,
  obtenirRole,
  estProprietaireQuiz,
  reponseErreur
};
