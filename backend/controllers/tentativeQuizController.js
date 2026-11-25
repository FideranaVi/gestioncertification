const { Op } = require("sequelize");
const crypto = require("crypto");
const { db, obtenirIdUtilisateur } = require("./utilsController");
const sequelize = require("../config/database");
const ActiviteTentative = require("../models/ActiviteTentative");

const {
  Quiz,
  Module,
  Formation,
  Question,
  Reponse,
  TentativeQuiz,
  ReponseApprenant,
  Evaluation,
  SuiviFormation,
  SuiviModule,
  Utilisateur,
  Certificat
} = db;

const TYPES_SORTIE = [
  "sortie_onglet",
  "sortie_fenetre",
  "page_quittee"
];

const SEUIL_VERIFICATION = 4;

function obtenirQuestionsOptions() {
  return {
    model: Question,
    as: "questions",
    attributes: [
      "numQuestion",
      "typeQuestion",
      "enonce",
      "points"
    ],
    include: [{
      model: Reponse,
      as: "reponses",
      attributes: [
        "numReponse",
        "libelle",
        "estCorrecte"
      ]
    }]
  };
}

function quizPourApprenant(quiz) {
  if (!quiz) return null;
  const donnees = quiz.toJSON ? quiz.toJSON() : JSON.parse(JSON.stringify(quiz));
  if (Array.isArray(donnees.questions)) {
    donnees.questions = donnees.questions.map(question => ({
      ...question,
      reponses: (question.reponses || []).map(reponse => {
        const { estCorrecte, esCorrect, ...reponsePublique } = reponse;
        return reponsePublique;
      })
    }));
  }
  return donnees;
}

function obtenirDateExpiration(tentative, quiz) {
  const duree = Number(quiz?.duree || 0);
  if (!duree || !tentative?.dateTentative) return null;
  return new Date(new Date(tentative.dateTentative).getTime() + duree * 60 * 1000);
}

function estExpiree(tentative, quiz) {
  const expiration = obtenirDateExpiration(tentative, quiz);
  return expiration ? Date.now() >= expiration.getTime() : false;
}

function normaliserReponses(reponses) {
  if (!Array.isArray(reponses)) return [];
  return reponses.map(item => {
    const numQuestion = Number(item?.numQuestion);
    let valeurs = [];
    if (Array.isArray(item?.numReponses)) valeurs = item.numReponses;
    else if (Array.isArray(item?.reponses)) valeurs = item.reponses.map(reponse => typeof reponse === "object" ? reponse?.numReponse : reponse);
    else if (item?.numReponse !== undefined && item?.numReponse !== null) valeurs = [item.numReponse];
    return {
      numQuestion,
      numReponses: [...new Set(valeurs.map(Number).filter(id => Number.isInteger(id) && id > 0))]
    };
  });
}

async function chargerQuiz(codeQuiz, transaction = null) {
  return Quiz.findByPk(codeQuiz, {
    include: [
      {
        model: Module,
        as: "module",
        required: false,
        include: [{ model: Formation, as: "formation", required: false }]
      },
      obtenirQuestionsOptions()
    ],
    transaction
  });
}

function obtenirIdApprenant(req) {
  const id = Number(obtenirIdUtilisateur(req));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function tentativesIllimitees(quiz) {
  return true;
}

function obtenirNombreTentativesMax(quiz) {
  return 999999;
}

async function obtenirFormationDuQuiz(quiz, transaction = null) {
  if (!quiz) return null;
  if (quiz.numFormation) {
    const numFormation = Number(quiz.numFormation);
    if (Number.isInteger(numFormation) && numFormation > 0) return numFormation;
  }
  if (quiz.module?.numFormation) return Number(quiz.module.numFormation);
  if (quiz.module?.formation?.numFormation) return Number(quiz.module.formation.numFormation);
  if (quiz.codeModule) {
    const module = await Module.findByPk(quiz.codeModule, { transaction });
    return module ? Number(module.numFormation) : null;
  }
  return null;
}

async function verifierModuleTermine(idApprenant, module, transaction = null) {
  if (!module) return false;
  const suiviModule = await SuiviModule.findOne({ where: { idApprenant, codeModule: module.codeModule }, transaction });
  return suiviModule?.statut === "terminee";
}

async function verifierFormationModulesTermines(idApprenant, numFormation, transaction = null) {
  const modules = await Module.findAll({ where: { numFormation: Number(numFormation) }, order: [["ordre", "ASC"], ["codeModule", "ASC"]], transaction });
  if (!modules.length) return { autorise: false, totalModules: 0, modulesTermines: 0, progression: 0 };
  const resultats = await Promise.all(modules.map(module => verifierModuleTermine(idApprenant, module, transaction)));
  const modulesTermines = resultats.filter(Boolean).length;
  return { autorise: modulesTermines === modules.length, totalModules: modules.length, modulesTermines, progression: Math.round(modulesTermines / modules.length * 100) };
}

async function verifierAccesQuiz(quiz, idApprenant, transaction = null) {
  if (!quiz || !idApprenant) return { autorise: false, message: "Utilisateur ou quiz invalide." };
  const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
  if (!numFormation) return { autorise: false, message: "Ce quiz n'est pas associé à une formation." };
  const inscription = await SuiviFormation.findOne({ where: { idApprenant, numFormation }, transaction });
  if (!inscription) return { autorise: false, message: "Vous devez vous inscrire à cette formation avant de passer ce quiz." };
  // CORRECTION : on ne bloque plus si formation terminee.
  // Sinon apres un refus du formateur, l'apprenant ne peut plus reprendre.
  if (quiz.typeQuiz === "final") {
    const progression = await verifierFormationModulesTermines(idApprenant, numFormation, transaction);
    if (!progression.autorise) return { autorise: false, message: "Vous devez terminer tous les modules de cette formation avant de passer le quiz final.", progression };
    return { autorise: true, type: "final", numFormation, progression };
  }
  if (quiz.typeQuiz === "module" || quiz.codeModule) {
    const module = quiz.codeModule ? await Module.findByPk(quiz.codeModule, { transaction }) : null;
    if (!module || Number(module.numFormation) !== Number(numFormation)) return { autorise: false, message: "Le module associé à ce quiz est introuvable." };
    const moduleTermine = await verifierModuleTermine(idApprenant, module, transaction);
    if (!moduleTermine) return { autorise: false, message: "Vous devez terminer le module associé avant de passer ce quiz." };
    return { autorise: true, type: "module", numFormation, codeModule: module.codeModule };
  }
  return { autorise: false, message: "Type de quiz non reconnu." };
}

async function enregistrerUneQuestion({ idTentative, numQuestion, numReponses, quiz, transaction }) {
  const question = (quiz.questions || []).find(item => Number(item.numQuestion) === Number(numQuestion));
  if (!question) throw new Error("Cette question n'appartient pas à ce quiz.");
  const reponsesAutorisees = new Set((question.reponses || []).map(item => Number(item.numReponse)));
  const selection = [...new Set(numReponses.map(Number))];
  for (const id of selection) {
    if (!Number.isInteger(id) || !reponsesAutorisees.has(id)) throw new Error("Une réponse ne correspond pas à cette question.");
  }
  await ReponseApprenant.destroy({ where: { idTentative, numQuestion }, transaction });
  if (selection.length) {
    await ReponseApprenant.bulkCreate(selection.map(numReponse => ({ idTentative, numQuestion, numReponse })), { transaction });
  }
}

function estUneBonneReponse(valeur) {
  return valeur === true || valeur === 1 || valeur === "1" || String(valeur).toLowerCase() === "true";
}

async function calculerResultat(tentative, quiz, transaction) {
  const questions = quiz.questions || [];
  const reponsesEnregistrees = await ReponseApprenant.findAll({ where: { idTentative: tentative.idTentative }, transaction });
  const selectionParQuestion = new Map();
  for (const reponse of reponsesEnregistrees) {
    const idQuestion = Number(reponse.numQuestion);
    const idReponse = Number(reponse.numReponse);
    if (!selectionParQuestion.has(idQuestion)) selectionParQuestion.set(idQuestion, new Set());
    selectionParQuestion.get(idQuestion).add(idReponse);
  }
  let pointsObtenus = 0;
  let pointsTotal = 0;
  const details = [];
  for (const question of questions) {
    const pointsQuestion = Number(question.points ?? 1);
    const points = Number.isFinite(pointsQuestion) && pointsQuestion >= 0 ? pointsQuestion : 1;
    pointsTotal += points;
    const bonnesReponses = (question.reponses || []).filter(reponse => estUneBonneReponse(reponse.estCorrecte ?? reponse.esCorrect)).map(reponse => Number(reponse.numReponse)).sort((a, b) => a - b);
    const selectionnees = [...(selectionParQuestion.get(Number(question.numQuestion)) || [])].sort((a, b) => a - b);
    const exact = bonnesReponses.length > 0 && bonnesReponses.length === selectionnees.length && bonnesReponses.every((id, index) => id === selectionnees[index]);
    const pointsGagnes = exact ? points : 0;
    pointsObtenus += pointsGagnes;
    details.push({ numQuestion: Number(question.numQuestion), enonce: question.enonce, reponsesSelectionnees: selectionnees, reponsesCorrectes: bonnesReponses, pointsObtenus: pointsGagnes, pointsPossibles: points, correct: exact });
  }
  const score = pointsTotal > 0 ? Number((pointsObtenus / pointsTotal * 100).toFixed(2)) : 0;
  const seuil = Number(quiz.seuilReussite ?? 0);
  return { score, resultat: score >= seuil ? "reussi" : "echoue", pointsObtenus, pointsTotal, details };
}

// =====================================================
// CERTIFICATION ET SURVEILLANCE
// =====================================================

async function creerDemandeCertificatSiAdmissible(idApprenant, numFormation, idFormateur, transaction) {
  if (!idApprenant || !numFormation || !idFormateur) return null;
  const existant = await Certificat.findOne({ where: { idApprenant, numFormation }, transaction, lock: transaction.LOCK.UPDATE });
  if (existant) {
    // CORRECTION : si certificat refuse (annulee), nouvelle reussite -> en_attente
    const statut = String(existant.statutCertificat || "").toLowerCase();
    if (statut === "annulee" || statut === "refuse" || statut === "refusé") {
      await existant.update({ statutCertificat: "en_attente", dateObtention: new Date(), idFormateur }, { transaction });
    }
    return existant;
  }
  const modules = await Module.findAll({ where: { numFormation }, attributes: ["codeModule"], transaction });
  const conditionsQuiz = [{ numFormation }];
  const codesModules = modules.map(module => module.codeModule);
  if (codesModules.length) conditionsQuiz.push({ codeModule: { [Op.in]: codesModules } });
  const quizzes = await Quiz.findAll({ where: { [Op.or]: conditionsQuiz }, transaction });
  if (!quizzes.length) return null;
  for (const quiz of quizzes) {
    const evaluations = await Evaluation.findAll({
      where: { resultat: "reussi" },
      include: [{ model: TentativeQuiz, as: "tentative", required: true, where: { idApprenant, codeQuiz: quiz.codeQuiz, statut: "terminee" } }],
      transaction
    });
    const evaluationAdmissible = evaluations.some(evaluation => {
      const statut = evaluation.tentative?.statutSurveillance || "normal";
      return ["normal", "validee"].includes(statut);
    });
    if (!evaluationAdmissible) return null;
  }
  return Certificat.create({
    numeroCertificat: `LP-${numFormation}-${idApprenant}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    dateObtention: new Date(),
    statutCertificat: "en_attente",
    idApprenant,
    numFormation,
    idFormateur
  }, { transaction });
}

async function creerCertificatDirectSiAbsent(idApprenant, numFormation, idFormateur, statutCertificat, transaction) {
  const existant = await Certificat.findOne({ where: { idApprenant, numFormation }, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (existant) return existant;
  return Certificat.create({
    numeroCertificat: `LP-${numFormation}-${idApprenant}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    dateObtention: new Date(),
    statutCertificat,
    idApprenant,
    numFormation,
    idFormateur
  }, { transaction });
}

async function terminerEtEnregistrer(tentative, quiz, transaction) {
  const resultat = await calculerResultat(tentative, quiz, transaction);
  const statutSurveillance = tentative.statutSurveillance || "normal";
  await tentative.update({ score: resultat.score, statut: "terminee" }, { transaction });
  const evaluationExistante = await Evaluation.findOne({ where: { idTentative: tentative.idTentative }, transaction });
  const donneesEvaluation = { score: resultat.score, dateEvaluation: new Date(), resultat: resultat.resultat };
  if (evaluationExistante) await evaluationExistante.update(donneesEvaluation, { transaction });
  else await Evaluation.create({ ...donneesEvaluation, idTentative: tentative.idTentative }, { transaction });
  let certificat = null;
  if (quiz.typeQuiz === "final" && resultat.resultat === "reussi" && ["normal", "validee"].includes(statutSurveillance)) {
    const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
    if (!numFormation) throw new Error("Impossible de créer la demande : formation introuvable.");
    if (!quiz.idFormateur) throw new Error("Impossible de créer la demande : formateur introuvable.");
    certificat = await creerDemandeCertificatSiAdmissible(tentative.idApprenant, numFormation, quiz.idFormateur, transaction);
  }
  return { ...resultat, certificat, statutSurveillance };
}

function construireReponseResultat({ tentative, quiz, resultat, certificat, message }) {
  return {
    message,
    tentative,
    nomQuiz: quiz.nomQuiz,
    score: resultat.score,
    resultat: resultat.resultat,
    pointsObtenus: resultat.pointsObtenus,
    pointsTotal: resultat.pointsTotal,
    seuilReussite: Number(quiz.seuilReussite ?? 0),
    statutSurveillance: tentative.statutSurveillance || "normal",
    certificat: certificat || null,
    details: resultat.details
  };
}

async function obtenirHistoriqueTentatives(idApprenant, codeQuiz) {
  return TentativeQuiz.findAll({
    where: { idApprenant, codeQuiz },
    attributes: ["idTentative", "score", "statut", "statutSurveillance"],
    order: [["idTentative", "ASC"]]
  });
}

// CORRECTION : TENTATIVES ILLIMITEES, LE FORMATEUR DECIDE
async function verifierLimiteTentatives(idApprenant, quiz) {
  const historique = await obtenirHistoriqueTentatives(idApprenant, quiz.codeQuiz);
  return {
    autorise: true,
    dejaReussi: false,
    limiteAtteinte: false,
    tentativesEffectuees: historique.length,
    nombreTentativesMax: 999999,
    tentativesIllimitees: true,
    tentativesRestantes: null
  };
}

// =====================================================
// TENTATIVES DE L'APPRENANT
// =====================================================

exports.obtenirTentatives = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant) return res.status(401).json({ message: "Utilisateur non identifié." });
    const tentatives = await TentativeQuiz.findAll({
      where: { idApprenant },
      include: [{ model: Quiz, as: "quiz" }, { model: Evaluation, as: "evaluation" }],
      order: [["idTentative", "DESC"]]
    });
    return res.json({ tentatives });
  } catch (error) {
    console.error("Erreur obtenirTentatives :", error);
    return res.status(500).json({ message: "Impossible de récupérer vos tentatives." });
  }
};

exports.obtenirTentative = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) return res.status(400).json({ message: "Identifiant invalide." });
    const tentative = await TentativeQuiz.findOne({
      where: { idTentative, idApprenant },
      include: [
        { model: Quiz, as: "quiz", include: [obtenirQuestionsOptions()] },
        { model: ReponseApprenant, as: "reponsesApprenant" },
        { model: Evaluation, as: "evaluation" }
      ]
    });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });
    const donnees = tentative.toJSON();
    donnees.quiz = quizPourApprenant(donnees.quiz);
    const expiration = obtenirDateExpiration(tentative, tentative.quiz);
    return res.json({ tentative: donnees, expiration, dureeRestante: expiration ? Math.max(0, Math.ceil((expiration.getTime() - Date.now()) / 1000)) : null });
  } catch (error) {
    console.error("Erreur obtenirTentative :", error);
    return res.status(500).json({ message: "Impossible de récupérer cette tentative." });
  }
};

// =====================================================
// COMMENCER OU REPRENDRE UNE TENTATIVE
// =====================================================

exports.commencerTentative = async (req, res) => {
  try {
    const codeQuiz = Number(req.body.codeQuiz);
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant) return res.status(401).json({ message: "Utilisateur non identifié." });
    if (!Number.isInteger(codeQuiz) || codeQuiz < 1) return res.status(400).json({ message: "Identifiant du quiz invalide." });
    const quiz = await chargerQuiz(codeQuiz);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable." });
    if (!quiz.questions?.length) return res.status(400).json({ message: "Ce quiz ne contient aucune question." });
    const acces = await verifierAccesQuiz(quiz, idApprenant);
    if (!acces.autorise) return res.status(403).json({ message: acces.message, progression: acces.progression || null });

    let tentative = await TentativeQuiz.findOne({ where: { idApprenant, codeQuiz, statut: "en_cours" }, order: [["idTentative", "DESC"]] });

    if (tentative && estExpiree(tentative, quiz)) {
      const transaction = await sequelize.transaction();
      try {
        const tentativeVerrouillee = await TentativeQuiz.findByPk(tentative.idTentative, { transaction, lock: transaction.LOCK.UPDATE });
        if (tentativeVerrouillee.statut === "en_cours") {
          const resultat = await terminerEtEnregistrer(tentativeVerrouillee, quiz, transaction);
          await transaction.commit();
          return res.status(409).json({ ...construireReponseResultat({ tentative: tentativeVerrouillee, quiz, resultat, certificat: resultat.certificat, message: "Le temps de cette tentative est écoulé." }), tentativeTerminee: true });
        }
        await transaction.commit();
        return res.status(409).json({ message: "Cette tentative est déjà terminée.", tentativeTerminee: true });
      } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        throw error;
      }
    }

    if (!tentative) {
      const limite = await verifierLimiteTentatives(idApprenant, quiz);
      if (!limite.autorise) return res.status(403).json({ message: limite.message, dejaReussi: limite.dejaReussi, limiteAtteinte: limite.limiteAtteinte, tentativesEffectuees: limite.tentativesEffectuees, nombreTentativesMax: limite.nombreTentativesMax });
    }

    const reprise = Boolean(tentative);
    if (!tentative) {
      tentative = await TentativeQuiz.create({ idApprenant, codeQuiz, dateTentative: new Date(), score: 0, statut: "en_cours", statutSurveillance: "normal", nbSortiesEcran: 0, estEnLigne: true });
    }
    const expiration = obtenirDateExpiration(tentative, quiz);
    const reponsesSauvegardees = await ReponseApprenant.findAll({ where: { idTentative: tentative.idTentative } });
    const limite = await verifierLimiteTentatives(idApprenant, quiz);
    return res.status(reprise ? 200 : 201).json({
      message: reprise ? "Votre ancienne tentative a été récupérée." : "Tentative commencée.",
      reprise,
      tentative,
      quiz: quizPourApprenant(quiz),
      reponsesSauvegardees,
      expiration,
      dureeRestante: expiration ? Math.max(0, Math.ceil((expiration.getTime() - Date.now()) / 1000)) : null,
      nombreTentativesMax: obtenirNombreTentativesMax(quiz),
      tentativesIllimitees: tentativesIllimitees(quiz),
      tentativesEffectuees: limite.tentativesEffectuees,
      tentativesRestantes: limite.tentativesRestantes
    });
  } catch (error) {
    console.error("Erreur commencerTentative :", error);
    return res.status(500).json({ message: error.message || "Impossible de commencer le quiz." });
  }
};

// =====================================================
// SAUVEGARDER LES RÉPONSES
// =====================================================

exports.enregistrerReponses = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const idTentative = Number(req.params.id);
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) throw new Error("Identifiant de tentative invalide.");
    const donneesReponses = Array.isArray(req.body.reponses) ? req.body.reponses : [req.body];
    const reponsesNormalisees = normaliserReponses(donneesReponses);
    if (!reponsesNormalisees.length) throw new Error("Aucune réponse à enregistrer.");
    const questionsVues = new Set();
    for (const item of reponsesNormalisees) {
      if (!Number.isInteger(item.numQuestion) || item.numQuestion < 1 || questionsVues.has(item.numQuestion)) throw new Error("Identifiant de question invalide.");
      questionsVues.add(item.numQuestion);
    }
    const tentative = await TentativeQuiz.findOne({ where: { idTentative, idApprenant }, transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) throw new Error("Tentative introuvable.");
    if (tentative.statut !== "en_cours") throw new Error("Cette tentative est déjà terminée.");
    const quiz = await chargerQuiz(tentative.codeQuiz, transaction);
    if (!quiz) throw new Error("Quiz introuvable.");
    const acces = await verifierAccesQuiz(quiz, idApprenant, transaction);
    if (!acces.autorise) throw new Error(acces.message);
    if (estExpiree(tentative, quiz)) {
      const resultat = await terminerEtEnregistrer(tentative, quiz, transaction);
      await transaction.commit();
      transaction = null;
      return res.status(409).json({ ...construireReponseResultat({ tentative, quiz, resultat, certificat: resultat.certificat, message: "Le temps du quiz est écoulé." }), tentativeTerminee: true });
    }
    for (const item of reponsesNormalisees) {
      await enregistrerUneQuestion({ idTentative, numQuestion: item.numQuestion, numReponses: item.numReponses, quiz, transaction });
    }
    await tentative.update({
      derniereActivite: new Date(),
      estEnLigne: true,
      questionActuelle: reponsesNormalisees[reponsesNormalisees.length - 1].numQuestion,
      nbReponsesDonnees: await ReponseApprenant.count({ where: { idTentative }, transaction })
    }, { transaction });
    await transaction.commit();
    transaction = null;
    return res.json({ message: "Réponses sauvegardées avec succès.", idTentative, reponses: reponsesNormalisees });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur enregistrerReponses :", error);
    const status = error.message === "Tentative introuvable." ? 404 : error.message === "Cette tentative est déjà terminée." ? 409 : 400;
    return res.status(status).json({ message: error.message || "Impossible de sauvegarder les réponses." });
  }
};

// =====================================================
// SOUMETTRE UNE TENTATIVE
// =====================================================

exports.soumettreTentative = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const idTentative = Number(req.params.id);
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) throw new Error("Identifiant de tentative invalide.");
    const tentative = await TentativeQuiz.findOne({ where: { idTentative, idApprenant }, transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({ message: "Tentative introuvable." });
    }
    const quiz = await chargerQuiz(tentative.codeQuiz, transaction);
    if (!quiz) throw new Error("Quiz introuvable.");
    if (tentative.statut === "terminee") {
      const resultat = await calculerResultat(tentative, quiz, transaction);
      const evaluation = await Evaluation.findOne({ where: { idTentative }, transaction });
      const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
      const certificat = quiz.typeQuiz === "final" && numFormation ? await Certificat.findOne({ where: { idApprenant, numFormation }, transaction }) : null;
      await transaction.commit();
      transaction = null;
      return res.json(construireReponseResultat({ tentative, quiz, resultat: { ...resultat, score: evaluation ? Number(evaluation.score) : resultat.score, resultat: evaluation?.resultat || resultat.resultat }, certificat, message: "Quiz déjà soumis." }));
    }
    const acces = await verifierAccesQuiz(quiz, idApprenant, transaction);
    if (!acces.autorise) throw new Error(acces.message);
    if (req.body.reponses !== undefined) {
      const reponses = normaliserReponses(req.body.reponses);
      const questionsVues = new Set();
      for (const item of reponses) {
        if (!Number.isInteger(item.numQuestion) || item.numQuestion < 1 || questionsVues.has(item.numQuestion)) throw new Error("Liste de réponses invalide.");
        questionsVues.add(item.numQuestion);
        await enregistrerUneQuestion({ idTentative, numQuestion: item.numQuestion, numReponses: item.numReponses, quiz, transaction });
      }
    }
    const resultat = await terminerEtEnregistrer(tentative, quiz, transaction);
    await tentative.update({ estEnLigne: false, derniereActivite: new Date() }, { transaction });
    await transaction.commit();
    transaction = null;
    return res.json(construireReponseResultat({ tentative, quiz, resultat, certificat: resultat.certificat, message: "Quiz soumis avec succès." }));
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur soumettreTentative :", error);
    return res.status(400).json({ message: error.message || "Impossible de soumettre le quiz." });
  }
};

// =====================================================
// TENTATIVES DU FORMATEUR
// =====================================================

exports.obtenirTentativesFormateur = async (req, res) => {
  try {
    const idFormateur = obtenirIdApprenant(req);
    if (!idFormateur) return res.status(401).json({ message: "Utilisateur non identifié." });
    const quizFormateur = await Quiz.findAll({ where: { idFormateur }, attributes: ["codeQuiz"], raw: true });
    const codesQuiz = quizFormateur.map(q => Number(q.codeQuiz)).filter(n => Number.isInteger(n) && n > 0);
    if (!codesQuiz.length) return res.json({ tentatives: [] });
    const tentativesBrutes = await TentativeQuiz.findAll({ where: { codeQuiz: { [Op.in]: codesQuiz } }, order: [["dateTentative", "DESC"], ["idTentative", "DESC"]] });
    if (!tentativesBrutes.length) return res.json({ tentatives: [] });
    const idsTentatives = tentativesBrutes.map(t => Number(t.idTentative)).filter(n => n > 0);
    const idsApprenants = [...new Set(tentativesBrutes.map(t => Number(t.idApprenant)).filter(n => n > 0))];
    const codesQuizTentatives = [...new Set(tentativesBrutes.map(t => Number(t.codeQuiz)).filter(n => n > 0))];
    const [quizzes, apprenants, evaluations, reponses, modules] = await Promise.all([
      Quiz.findAll({ where: { codeQuiz: { [Op.in]: codesQuizTentatives } } }),
      Utilisateur.findAll({ where: { idUtilisateur: { [Op.in]: idsApprenants } }, attributes: ["idUtilisateur", "nom", "prenom", "email"] }),
      Evaluation.findAll({ where: { idTentative: { [Op.in]: idsTentatives } } }),
      ReponseApprenant.findAll({ where: { idTentative: { [Op.in]: idsTentatives } }, attributes: ["idTentative", "numQuestion"] }),
      Module.findAll()
    ]);
    const mapQuiz = new Map(quizzes.map(q => [Number(q.codeQuiz), q]));
    const mapApprenants = new Map(apprenants.map(a => [Number(a.idUtilisateur), a]));
    const mapEvaluations = new Map(evaluations.map(e => [Number(e.idTentative), e]));
    const mapModules = new Map(modules.map(m => [Number(m.codeModule), m]));
    const numFormations = [...new Set(quizzes.map(q => { const module = q.codeModule ? mapModules.get(Number(q.codeModule)) : null; return Number(q.numFormation || module?.numFormation); }).filter(n => Number.isInteger(n) && n > 0))];
    const formations = numFormations.length ? await Formation.findAll({ where: { numFormation: { [Op.in]: numFormations } } }) : [];
    const mapFormations = new Map(formations.map(f => [Number(f.numFormation), f]));
    const certificats = (idsApprenants.length && numFormations.length) ? await Certificat.findAll({ where: { idApprenant: { [Op.in]: idsApprenants }, numFormation: { [Op.in]: numFormations } } }) : [];
    const mapCertificats = new Map(certificats.map(c => [`${Number(c.idApprenant)}-${Number(c.numFormation)}`, c]));
    const repondues = new Map();
    for (const r of reponses) {
      const id = Number(r.idTentative);
      if (!repondues.has(id)) repondues.set(id, new Set());
      repondues.get(id).add(Number(r.numQuestion));
    }
    let activites = [];
    try {
      activites = await ActiviteTentative.findAll({ where: { idTentative: { [Op.in]: idsTentatives } }, order: [["dateActivite", "ASC"], ["idActivite", "ASC"]] });
    } catch (activityError) {
      console.error("Erreur de récupération des activités de tentative :", activityError.message);
      activites = [];
    }
    const activitesParTentative = new Map();
    for (const a of activites) {
      const id = Number(a.idTentative);
      if (!activitesParTentative.has(id)) activitesParTentative.set(id, []);
      activitesParTentative.get(id).push(a);
    }
    const resultat = tentativesBrutes.map(tentative => {
      const donnees = tentative.toJSON();
      const quiz = mapQuiz.get(Number(tentative.codeQuiz));
      const module = quiz?.codeModule ? mapModules.get(Number(quiz.codeModule)) : null;
      const numFormation = Number(quiz?.numFormation || module?.numFormation) || null;
      const formation = numFormation ? mapFormations.get(numFormation) : null;
      const nbQuestions = quiz?.nbQuestions ? Number(quiz.nbQuestions) : 0;
      const reponsesTentative = repondues.get(Number(tentative.idTentative)) || new Set();
      const nbReponses = reponsesTentative.size;
      const termine = tentative.statut === "terminee";
      const progression = termine ? 100 : nbQuestions ? Math.min(100, Math.round(nbReponses / nbQuestions * 100)) : 0;
      const evenements = activitesParTentative.get(Number(tentative.idTentative)) || [];
      const sorties = evenements.filter(e => TYPES_SORTIE.includes(e.type));
      const derniere = evenements[evenements.length - 1] || null;
      const tempsHorsEcran = evenements.filter(e => e.type === "retour").reduce((total, e) => total + Number(e.dureeSecondes || 0), 0);
      const evaluation = mapEvaluations.get(Number(tentative.idTentative));
      const certificat = numFormation ? mapCertificats.get(`${Number(tentative.idApprenant)}-${numFormation}`) || null : null;
      return {
        ...donnees,
        statutSurveillance: tentative.statutSurveillance || "normal",
        quiz: quiz ? { codeQuiz: quiz.codeQuiz, nomQuiz: quiz.nomQuiz, typeQuiz: quiz.typeQuiz, seuilReussite: quiz.seuilReussite, duree: quiz.duree, codeModule: quiz.codeModule, numFormation: quiz.numFormation, nombreTentativesMax: quiz.nombreTentativesMax, tentativesIllimitees: quiz.tentativesIllimitees, nbQuestions } : null,
        evaluation: evaluation || null,
        apprenant: mapApprenants.get(Number(tentative.idApprenant)) || null,
        formation: formation ? { numFormation: formation.numFormation, titre: formation.titre } : null,
        moduleInfo: module ? { codeModule: module.codeModule, titreModule: module.titreModule } : null,
        certificat: certificat ? certificat.toJSON() : null,
        idCertificat: certificat ? certificat.idCertificat : null,
        statutCertificat: certificat ? certificat.statutCertificat : "en_attente",
        nbQuestions,
        nbReponses,
        progression,
        nbSorties: sorties.length,
        tempsHorsEcran,
        horsEcran: !termine && Boolean(derniere) && derniere.type !== "retour",
        derniereActivite: derniere ? derniere.dateActivite : tentative.derniereActivite || null,
        activites: evenements.slice(-30).reverse().map(e => ({ idActivite: e.idActivite, type: e.type, dateActivite: e.dateActivite, dureeSecondes: e.dureeSecondes }))
      };
    });
    return res.json({ tentatives: resultat });
  } catch (error) {
    console.error("Erreur obtenirTentativesFormateur :", error);
    return res.status(500).json({ message: "Impossible de récupérer les résultats des apprenants.", erreur: error.message, detail: error.original?.message || null, sql: error.sql || null });
  }
};

// =====================================================
// VALIDATION CERTIFICAT DEPUIS TENTATIVE
// PATCH /formateur/tentatives/:id/certificat
// =====================================================

exports.validerCertificatTentative = async (req, res) => {
  let transaction;
  try {
    const idFormateur = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    const decision = String(req.body?.decision || "");
    if (!idFormateur) return res.status(401).json({ message: "Utilisateur non identifié." });
    if (!Number.isInteger(idTentative) || idTentative <= 0) return res.status(400).json({ message: "Identifiant de tentative invalide." });
    if (!["valider", "refuser"].includes(decision)) return res.status(400).json({ message: "Décision invalide. Utilisez 'valider' ou 'refuser'." });
    transaction = await sequelize.transaction();
    const tentative = await TentativeQuiz.findByPk(idTentative, { transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) { await transaction.rollback(); transaction = null; return res.status(404).json({ message: "Tentative introuvable." }); }
    const quiz = await Quiz.findOne({ where: { codeQuiz: tentative.codeQuiz, idFormateur }, transaction });
    if (!quiz) { await transaction.rollback(); transaction = null; return res.status(403).json({ message: "Vous ne pouvez pas traiter cette tentative." }); }
    if (tentative.statut !== "terminee") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "La tentative doit être terminée avant la validation du certificat." }); }
    const evaluation = await Evaluation.findOne({ where: { idTentative }, transaction });
    if (evaluation?.resultat !== "reussi") { await transaction.rollback(); transaction = null; return res.status(400).json({ message: "L'apprenant n'a pas encore réussi cette évaluation." }); }
    const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
    if (!numFormation) { await transaction.rollback(); transaction = null; return res.status(400).json({ message: "Formation introuvable pour cette tentative." }); }
    const nouveauStatut = decision === "valider" ? "validee" : "annulee";
    let certificat = await Certificat.findOne({ where: { idApprenant: tentative.idApprenant, numFormation }, transaction, lock: transaction.LOCK.UPDATE });
    if (certificat) {
      if (certificat.statutCertificat === "validee" && nouveauStatut === "validee") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "Ce certificat est déjà validé." }); }
      await certificat.update({ statutCertificat: nouveauStatut, idFormateur: quiz.idFormateur }, { transaction });
    } else {
      certificat = await creerCertificatDirectSiAbsent(tentative.idApprenant, numFormation, quiz.idFormateur, nouveauStatut, transaction);
    }
    await transaction.commit();
    transaction = null;
    return res.status(200).json({
      message: nouveauStatut === "validee" ? "Certificat validé avec succès. L'apprenant peut maintenant le télécharger." : "Certificat refusé.",
      certificat
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur validerCertificatTentative :", error);
    return res.status(500).json({ message: "Impossible de traiter le certificat.", erreur: error.message });
  }
};

// =====================================================
// VALIDATION / INVALIDATION DE LA SURVEILLANCE
// PATCH /tentatives/:id/surveillance
// =====================================================

exports.modifierStatutSurveillance = async (req, res) => {
  let transaction;
  try {
    const idFormateur = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    const statutSurveillance = String(req.body?.statutSurveillance || "");
    if (!idFormateur) return res.status(401).json({ message: "Utilisateur non identifié." });
    if (!Number.isInteger(idTentative) || idTentative <= 0) return res.status(400).json({ message: "Identifiant de tentative invalide." });
    if (!["validee", "invalidee"].includes(statutSurveillance)) return res.status(400).json({ message: "Le statut doit être validee ou invalidee." });
    transaction = await sequelize.transaction();
    const tentative = await TentativeQuiz.findByPk(idTentative, { transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) { await transaction.rollback(); transaction = null; return res.status(404).json({ message: "Tentative introuvable." }); }
    const quiz = await Quiz.findOne({ where: { codeQuiz: tentative.codeQuiz, idFormateur }, transaction });
    if (!quiz) { await transaction.rollback(); transaction = null; return res.status(403).json({ message: "Vous ne pouvez pas traiter cette tentative." }); }
    if (tentative.statut !== "terminee") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "La tentative doit être terminée avant sa validation." }); }
    const ancienStatut = tentative.statutSurveillance || "normal";
    if (!["a_verifier", "normal"].includes(ancienStatut)) { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "Cette tentative a déjà été traitée." }); }
    await tentative.update({ statutSurveillance }, { transaction });
    let certificat = null;
    if (statutSurveillance === "validee") {
      const evaluation = await Evaluation.findOne({ where: { idTentative }, transaction });
      if (evaluation?.resultat === "reussi" && quiz.typeQuiz === "final") {
        const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
        if (numFormation) certificat = await creerDemandeCertificatSiAdmissible(tentative.idApprenant, numFormation, quiz.idFormateur, transaction);
      }
    }
    await transaction.commit();
    transaction = null;
    return res.status(200).json({ message: statutSurveillance === "validee" ? "Tentative validée par le formateur." : "Tentative invalidée par le formateur.", tentative, statutSurveillance, certificat });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur modifierStatutSurveillance :", error);
    return res.status(500).json({ message: "Impossible de modifier le statut de surveillance.", erreur: error.message });
  }
};

// =====================================================
// ACTIVITE / SURVEILLANCE - MANQUAIT, CA FAISAIT PLANTER LE SERVEUR
// POST /tentatives/:id/activite
// =====================================================
exports.enregistrerActivite = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    const type = String(req.body?.type || "");
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    const tentative = await TentativeQuiz.findOne({ where: { idTentative, idApprenant } });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });
    const estSortie = TYPES_SORTIE.includes(type);
    try {
      await ActiviteTentative.create({
        idTentative,
        type,
        dateActivite: new Date(),
        dureeSecondes: Number(req.body?.dureeSecondes || 0)
      });
    } catch (e) {}
    await tentative.update({
      derniereActivite: new Date(),
      estEnLigne: type === "retour" ? true : tentative.estEnLigne,
      nbSortiesEcran: estSortie ? (tentative.nbSortiesEcran || 0) + 1 : tentative.nbSortiesEcran,
      derniereSortie: estSortie ? new Date() : tentative.derniereSortie,
      statutSurveillance: estSortie && (tentative.statutSurveillance === "normal") ? "a_verifier" : tentative.statutSurveillance
    });
    return res.json({ message: "Activite enregistree." });
  } catch (error) {
    console.error("Erreur enregistrerActivite :", error);
    return res.json({ message: "Activite ignoree." });
  }
};

// =====================================================
// EXPORT DE LA VÉRIFICATION D'ACCÈS
// =====================================================

exports.verifierAccesQuiz = verifierAccesQuiz;