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

const TYPES_SORTIE = ["sortie_onglet", "sortie_fenetre", "page_quittee"];
const SEUIL_VERIFICATION = 4;

function obtenirQuestionsOptions() {
  return {
    model: Question,
    as: "questions",
    attributes: ["numQuestion", "typeQuestion", "enonce", "points"],
    include: [{
      model: Reponse,
      as: "reponses",
      attributes: ["numReponse", "libelle", "estCorrecte"]
    }]
  };
}

function quizPourApprenant(quiz) {
  if (!quiz) return null;
  const donnees = quiz.toJSON ? quiz.toJSON() : JSON.parse(JSON.stringify(quiz));
  if (Array.isArray(donnees.questions)) {
    donnees.questions = donnees.questions.map((question) => {
      const copie = Object.assign({}, question);
      copie.reponses = (question.reponses || []).map((reponse) => {
        const r = Object.assign({}, reponse);
        delete r.estCorrecte;
        delete r.esCorrect;
        return r;
      });
      return copie;
    });
  }
  return donnees;
}

function obtenirDateExpiration(tentative, quiz) {
  const duree = Number(quiz && quiz.duree ? quiz.duree : 0);
  if (!duree || !tentative || !tentative.dateTentative) return null;
  return new Date(new Date(tentative.dateTentative).getTime() + duree * 60 * 1000);
}

function estExpiree(tentative, quiz) {
  const expiration = obtenirDateExpiration(tentative, quiz);
  return expiration ? Date.now() >= expiration.getTime() : false;
}

function normaliserReponses(reponses) {
  if (!Array.isArray(reponses)) return [];
  return reponses.map((item) => {
    const numQuestion = Number(item && item.numQuestion);
    let valeurs = [];
    if (Array.isArray(item && item.numReponses)) {
      valeurs = item.numReponses;
    } else if (Array.isArray(item && item.reponses)) {
      valeurs = item.reponses.map((r) => (typeof r === "object" ? r.numReponse : r));
    } else if (item && item.numReponse !== undefined && item.numReponse !== null) {
      valeurs = [item.numReponse];
    }
    const propres = [];
    const vus = new Set();
    for (const v of valeurs) {
      const n = Number(v);
      if (Number.isInteger(n) && n > 0 && !vus.has(n)) {
        vus.add(n);
        propres.push(n);
      }
    }
    return { numQuestion: numQuestion, numReponses: propres };
  });
}

async function chargerQuiz(codeQuiz, transaction) {
  return Quiz.findByPk(codeQuiz, {
    include: [
      { model: Module, as: "module", required: false, include: [{ model: Formation, as: "formation", required: false }] },
      obtenirQuestionsOptions()
    ],
    transaction: transaction || undefined
  });
}

function obtenirIdApprenant(req) {
  const id = Number(obtenirIdUtilisateur(req));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function obtenirFormationDuQuiz(quiz, transaction) {
  if (!quiz) return null;
  if (quiz.numFormation) {
    const n = Number(quiz.numFormation);
    if (Number.isInteger(n) && n > 0) return n;
  }
  if (quiz.module && quiz.module.numFormation) return Number(quiz.module.numFormation);
  if (quiz.module && quiz.module.formation && quiz.module.formation.numFormation) return Number(quiz.module.formation.numFormation);
  if (quiz.codeModule) {
    const module = await Module.findByPk(quiz.codeModule, { transaction: transaction || undefined });
    return module ? Number(module.numFormation) : null;
  }
  return null;
}

async function verifierModuleTermine(idApprenant, module, transaction) {
  if (!module) return false;
  const suivi = await SuiviModule.findOne({ where: { idApprenant: idApprenant, codeModule: module.codeModule }, transaction: transaction || undefined });
  return suivi && suivi.statut === "terminee";
}

async function verifierFormationModulesTermines(idApprenant, numFormation, transaction) {
  const modules = await Module.findAll({ where: { numFormation: Number(numFormation) }, order: [["ordre", "ASC"], ["codeModule", "ASC"]], transaction: transaction || undefined });
  if (!modules.length) return { autorise: false, totalModules: 0, modulesTermines: 0, progression: 0 };
  let termines = 0;
  for (const m of modules) {
    const ok = await verifierModuleTermine(idApprenant, m, transaction);
    if (ok) termines++;
  }
  return { autorise: termines === modules.length, totalModules: modules.length, modulesTermines: termines, progression: Math.round(termines / modules.length * 100) };
}

async function verifierAccesQuiz(quiz, idApprenant, transaction) {
  if (!quiz || !idApprenant) return { autorise: false, message: "Utilisateur ou quiz invalide." };
  const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
  if (!numFormation) return { autorise: false, message: "Ce quiz n est pas associe a une formation." };
  const inscription = await SuiviFormation.findOne({ where: { idApprenant: idApprenant, numFormation: numFormation }, transaction: transaction || undefined });
  if (!inscription) return { autorise: false, message: "Vous devez vous inscrire a cette formation avant de passer ce quiz." };
  if (quiz.typeQuiz === "final") {
    const progression = await verifierFormationModulesTermines(idApprenant, numFormation, transaction);
    if (!progression.autorise) return { autorise: false, message: "Vous devez terminer tous les modules avant le quiz final.", progression: progression };
    return { autorise: true, type: "final", numFormation: numFormation, progression: progression };
  }
  if (quiz.typeQuiz === "module" || quiz.codeModule) {
    const module = quiz.codeModule ? await Module.findByPk(quiz.codeModule, { transaction: transaction || undefined }) : null;
    if (!module || Number(module.numFormation) !== Number(numFormation)) return { autorise: false, message: "Le module associe est introuvable." };
    const ok = await verifierModuleTermine(idApprenant, module, transaction);
    if (!ok) return { autorise: false, message: "Vous devez terminer le module avant ce quiz." };
    return { autorise: true, type: "module", numFormation: numFormation, codeModule: module.codeModule };
  }
  return { autorise: false, message: "Type de quiz non reconnu." };
}

async function enregistrerUneQuestion(params) {
  const idTentative = params.idTentative;
  const numQuestion = params.numQuestion;
  const numReponses = params.numReponses;
  const quiz = params.quiz;
  const transaction = params.transaction;
  let questionTrouvee = null;
  for (const q of (quiz.questions || [])) {
    if (Number(q.numQuestion) === Number(numQuestion)) questionTrouvee = q;
  }
  if (!questionTrouvee) throw new Error("Cette question n appartient pas a ce quiz.");
  const autorisees = new Set((questionTrouvee.reponses || []).map((r) => Number(r.numReponse)));
  const selection = [];
  const vus = new Set();
  for (const id of numReponses) {
    const n = Number(id);
    if (!Number.isInteger(n) || !autorisees.has(n)) throw new Error("Une reponse ne correspond pas a cette question.");
    if (!vus.has(n)) { vus.add(n); selection.push(n); }
  }
  await ReponseApprenant.destroy({ where: { idTentative: idTentative, numQuestion: numQuestion }, transaction: transaction });
  if (selection.length) {
    await ReponseApprenant.bulkCreate(selection.map((numReponse) => ({ idTentative: idTentative, numQuestion: numQuestion, numReponse: numReponse })), { transaction: transaction });
  }
}

function estUneBonneReponse(valeur) {
  return valeur === true || valeur === 1 || valeur === "1" || String(valeur).toLowerCase() === "true";
}

async function calculerResultat(tentative, quiz, transaction) {
  const questions = quiz.questions || [];
  const enregistrees = await ReponseApprenant.findAll({ where: { idTentative: tentative.idTentative }, transaction: transaction });
  const parQuestion = new Map();
  for (const r of enregistrees) {
    const qid = Number(r.numQuestion);
    const rid = Number(r.numReponse);
    if (!parQuestion.has(qid)) parQuestion.set(qid, new Set());
    parQuestion.get(qid).add(rid);
  }
  let pointsObtenus = 0;
  let pointsTotal = 0;
  const details = [];
  for (const question of questions) {
    const pointsQ = Number(question.points !== undefined && question.points !== null ? question.points : 1);
    const points = Number.isFinite(pointsQ) && pointsQ >= 0 ? pointsQ : 1;
    pointsTotal += points;
    const bonnes = (question.reponses || []).filter((r) => estUneBonneReponse(r.estCorrecte !== undefined ? r.estCorrecte : r.esCorrect)).map((r) => Number(r.numReponse)).sort((a, b) => a - b);
    const choisies = Array.from(parQuestion.get(Number(question.numQuestion)) || []).sort((a, b) => a - b);
    const exact = bonnes.length > 0 && bonnes.length === choisies.length && bonnes.every((id, i) => id === choisies[i]);
    const gagnes = exact ? points : 0;
    pointsObtenus += gagnes;
    details.push({ numQuestion: Number(question.numQuestion), enonce: question.enonce, reponsesSelectionnees: choisies, reponsesCorrectes: bonnes, pointsObtenus: gagnes, pointsPossibles: points, correct: exact });
  }
  const score = pointsTotal > 0 ? Number((pointsObtenus / pointsTotal * 100).toFixed(2)) : 0;
  const seuil = Number(quiz.seuilReussite !== undefined && quiz.seuilReussite !== null ? quiz.seuilReussite : 0);
  return { score: score, resultat: score >= seuil ? "reussi" : "echoue", pointsObtenus: pointsObtenus, pointsTotal: pointsTotal, details: details };
}

async function creerDemandeCertificatSiAdmissible(idApprenant, numFormation, idFormateur, transaction) {
  if (!idApprenant || !numFormation || !idFormateur) return null;
  const existant = await Certificat.findOne({ where: { idApprenant: idApprenant, numFormation: numFormation }, transaction: transaction, lock: transaction.LOCK.UPDATE });
  if (existant) {
    if (existant.statutCertificat === "annulee") {
      await existant.update({ statutCertificat: "en_attente", dateObtention: new Date(), idFormateur: idFormateur }, { transaction: transaction });
    }
    return existant;
  }
  const modules = await Module.findAll({ where: { numFormation: numFormation }, attributes: ["codeModule"], transaction: transaction });
  const conditions = [{ numFormation: numFormation }];
  const codes = modules.map((m) => m.codeModule);
  if (codes.length) conditions.push({ codeModule: { [Op.in]: codes } });
  const quizzes = await Quiz.findAll({ where: { [Op.or]: conditions }, transaction: transaction });
  if (!quizzes.length) return null;
  for (const quiz of quizzes) {
    const evals = await Evaluation.findAll({ where: { resultat: "reussi" }, include: [{ model: TentativeQuiz, as: "tentative", required: true, where: { idApprenant: idApprenant, codeQuiz: quiz.codeQuiz, statut: "terminee" } }], transaction: transaction });
    const ok = evals.some((e) => ["normal", "validee"].includes((e.tentative && e.tentative.statutSurveillance) || "normal"));
    if (!ok) return null;
  }
  return Certificat.create({ numeroCertificat: "LP-" + numFormation + "-" + idApprenant + "-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase(), dateObtention: new Date(), statutCertificat: "en_attente", idApprenant: idApprenant, numFormation: numFormation, idFormateur: idFormateur }, { transaction: transaction });
}

async function creerCertificatDirectSiAbsent(idApprenant, numFormation, idFormateur, statutCertificat, transaction) {
  const existant = await Certificat.findOne({ where: { idApprenant: idApprenant, numFormation: numFormation }, transaction: transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (existant) return existant;
  return Certificat.create({ numeroCertificat: "LP-" + numFormation + "-" + idApprenant + "-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase(), dateObtention: new Date(), statutCertificat: statutCertificat, idApprenant: idApprenant, numFormation: numFormation, idFormateur: idFormateur }, { transaction: transaction });
}

async function terminerEtEnregistrer(tentative, quiz, transaction) {
  const resultat = await calculerResultat(tentative, quiz, transaction);
  const surveillance = tentative.statutSurveillance || "normal";
  await tentative.update({ score: resultat.score, statut: "terminee" }, { transaction: transaction });
  const existante = await Evaluation.findOne({ where: { idTentative: tentative.idTentative }, transaction: transaction });
  const donnees = { score: resultat.score, dateEvaluation: new Date(), resultat: resultat.resultat };
  if (existante) await existante.update(donnees, { transaction: transaction });
  else await Evaluation.create(Object.assign({}, donnees, { idTentative: tentative.idTentative }), { transaction: transaction });
  let certificat = null;
  if (quiz.typeQuiz === "final" && resultat.resultat === "reussi" && ["normal", "validee"].includes(surveillance)) {
    const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
    if (!numFormation) throw new Error("Impossible de creer la demande : formation introuvable.");
    if (!quiz.idFormateur) throw new Error("Impossible de creer la demande : formateur introuvable.");
    certificat = await creerDemandeCertificatSiAdmissible(tentative.idApprenant, numFormation, quiz.idFormateur, transaction);
  }
  return Object.assign({}, resultat, { certificat: certificat, statutSurveillance: surveillance });
}

function construireReponseResultat(params) {
  const tentative = params.tentative;
  const quiz = params.quiz;
  const resultat = params.resultat;
  const certificat = params.certificat;
  const message = params.message;
  return { message: message, tentative: tentative, nomQuiz: quiz.nomQuiz, score: resultat.score, resultat: resultat.resultat, pointsObtenus: resultat.pointsObtenus, pointsTotal: resultat.pointsTotal, seuilReussite: Number(quiz.seuilReussite !== undefined && quiz.seuilReussite !== null ? quiz.seuilReussite : 0), statutSurveillance: tentative.statutSurveillance || "normal", certificat: certificat || null, details: resultat.details };
}

async function obtenirHistoriqueTentatives(idApprenant, codeQuiz) {
  return TentativeQuiz.findAll({ where: { idApprenant: idApprenant, codeQuiz: codeQuiz }, attributes: ["idTentative", "score", "statut", "statutSurveillance"], order: [["idTentative", "ASC"]] });
}

async function verifierLimiteTentatives(idApprenant, quiz) {
  const historique = await obtenirHistoriqueTentatives(idApprenant, quiz.codeQuiz);
  return { autorise: true, dejaReussi: false, limiteAtteinte: false, tentativesEffectuees: historique.length, nombreTentativesMax: null, tentativesIllimitees: true, tentativesRestantes: null, message: "Tentatives illimitees. Le formateur decide." };
}

exports.obtenirTentatives = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant) return res.status(401).json({ message: "Utilisateur non identifie." });
    const tentatives = await TentativeQuiz.findAll({ where: { idApprenant: idApprenant }, include: [{ model: Quiz, as: "quiz" }, { model: Evaluation, as: "evaluation" }], order: [["idTentative", "DESC"]] });
    return res.json({ tentatives: tentatives });
  } catch (error) {
    console.error("Erreur obtenirTentatives :", error);
    return res.status(500).json({ message: "Impossible de recuperer vos tentatives." });
  }
};

exports.obtenirTentative = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) return res.status(400).json({ message: "Identifiant invalide." });
    const tentative = await TentativeQuiz.findOne({ where: { idTentative: idTentative, idApprenant: idApprenant }, include: [{ model: Quiz, as: "quiz", include: [obtenirQuestionsOptions()] }, { model: ReponseApprenant, as: "reponsesApprenant" }, { model: Evaluation, as: "evaluation" }] });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });
    const donnees = tentative.toJSON();
    donnees.quiz = quizPourApprenant(donnees.quiz);
    const expiration = obtenirDateExpiration(tentative, tentative.quiz);
    return res.json({ tentative: donnees, expiration: expiration, dureeRestante: expiration ? Math.max(0, Math.ceil((expiration.getTime() - Date.now()) / 1000)) : null });
  } catch (error) {
    console.error("Erreur obtenirTentative :", error);
    return res.status(500).json({ message: "Impossible de recuperer cette tentative." });
  }
};

exports.commencerTentative = async (req, res) => {
  try {
    const codeQuiz = Number(req.body.codeQuiz);
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant) return res.status(401).json({ message: "Utilisateur non identifie." });
    if (!Number.isInteger(codeQuiz) || codeQuiz < 1) return res.status(400).json({ message: "Identifiant du quiz invalide." });
    const quiz = await chargerQuiz(codeQuiz);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable." });
    if (!quiz.questions || !quiz.questions.length) return res.status(400).json({ message: "Ce quiz ne contient aucune question." });
    const acces = await verifierAccesQuiz(quiz, idApprenant);
    if (!acces.autorise) return res.status(403).json({ message: acces.message, progression: acces.progression || null });
    let tentative = await TentativeQuiz.findOne({ where: { idApprenant: idApprenant, codeQuiz: codeQuiz, statut: "en_cours" }, order: [["idTentative", "DESC"]] });
    if (tentative && estExpiree(tentative, quiz)) {
      const transaction = await sequelize.transaction();
      try {
        const verrouillee = await TentativeQuiz.findByPk(tentative.idTentative, { transaction: transaction, lock: transaction.LOCK.UPDATE });
        if (verrouillee.statut === "en_cours") {
          const resultat = await terminerEtEnregistrer(verrouillee, quiz, transaction);
          await transaction.commit();
          return res.status(409).json(Object.assign({}, construireReponseResultat({ tentative: verrouillee, quiz: quiz, resultat: resultat, certificat: resultat.certificat, message: "Le temps de cette tentative est ecoule." }), { tentativeTerminee: true }));
        }
        await transaction.commit();
        return res.status(409).json({ message: "Cette tentative est deja terminee.", tentativeTerminee: true });
      } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        throw error;
      }
    }
    const reprise = Boolean(tentative);
    if (!tentative) {
      tentative = await TentativeQuiz.create({ idApprenant: idApprenant, codeQuiz: codeQuiz, dateTentative: new Date(), score: 0, statut: "en_cours", statutSurveillance: "normal", nbSortiesEcran: 0, estEnLigne: true });
    }
    const expiration = obtenirDateExpiration(tentative, quiz);
    const sauvegardees = await ReponseApprenant.findAll({ where: { idTentative: tentative.idTentative } });
    const limite = await verifierLimiteTentatives(idApprenant, quiz);
    return res.status(reprise ? 200 : 201).json({ message: reprise ? "Votre ancienne tentative a ete recuperee." : "Tentative commencee.", reprise: reprise, tentative: tentative, quiz: quizPourApprenant(quiz), reponsesSauvegardees: sauvegardees, expiration: expiration, dureeRestante: expiration ? Math.max(0, Math.ceil((expiration.getTime() - Date.now()) / 1000)) : null, nombreTentativesMax: null, tentativesIllimitees: true, tentativesEffectuees: limite.tentativesEffectuees, tentativesRestantes: null });
  } catch (error) {
    console.error("Erreur commencerTentative :", error);
    return res.status(500).json({ message: error.message || "Impossible de commencer le quiz." });
  }
};

exports.enregistrerReponses = async (req, res) => {
  let transaction = null;
  try {
    transaction = await sequelize.transaction();
    const idTentative = Number(req.params.id);
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) throw new Error("Identifiant de tentative invalide.");
    const donneesBrutes = Array.isArray(req.body.reponses) ? req.body.reponses : [req.body];
    const reponses = normaliserReponses(donneesBrutes);
    if (!reponses.length) throw new Error("Aucune reponse a enregistrer.");
    const vues = new Set();
    for (const item of reponses) {
      if (!Number.isInteger(item.numQuestion) || item.numQuestion < 1 || vues.has(item.numQuestion)) throw new Error("Identifiant de question invalide.");
      vues.add(item.numQuestion);
    }
    const tentative = await TentativeQuiz.findOne({ where: { idTentative: idTentative, idApprenant: idApprenant }, transaction: transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) throw new Error("Tentative introuvable.");
    if (tentative.statut !== "en_cours") throw new Error("Cette tentative est deja terminee.");
    const quiz = await chargerQuiz(tentative.codeQuiz, transaction);
    if (!quiz) throw new Error("Quiz introuvable.");
    const acces = await verifierAccesQuiz(quiz, idApprenant, transaction);
    if (!acces.autorise) throw new Error(acces.message);
    if (estExpiree(tentative, quiz)) {
      const resultat = await terminerEtEnregistrer(tentative, quiz, transaction);
      await transaction.commit();
      transaction = null;
      return res.status(409).json(Object.assign({}, construireReponseResultat({ tentative: tentative, quiz: quiz, resultat: resultat, certificat: resultat.certificat, message: "Le temps du quiz est ecoule." }), { tentativeTerminee: true }));
    }
    for (const item of reponses) {
      await enregistrerUneQuestion({ idTentative: idTentative, numQuestion: item.numQuestion, numReponses: item.numReponses, quiz: quiz, transaction: transaction });
    }
    const nb = await ReponseApprenant.count({ where: { idTentative: idTentative }, transaction: transaction });
    await tentative.update({ derniereActivite: new Date(), estEnLigne: true, questionActuelle: reponses[reponses.length - 1].numQuestion, nbReponsesDonnees: nb }, { transaction: transaction });
    await transaction.commit();
    transaction = null;
    return res.json({ message: "Reponses sauvegardees avec succes.", idTentative: idTentative, reponses: reponses });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur enregistrerReponses :", error);
    const status = error.message === "Tentative introuvable." ? 404 : error.message === "Cette tentative est deja terminee." ? 409 : 400;
    return res.status(status).json({ message: error.message || "Impossible de sauvegarder les reponses." });
  }
};

exports.soumettreTentative = async (req, res) => {
  let transaction = null;
  try {
    transaction = await sequelize.transaction();
    const idTentative = Number(req.params.id);
    const idApprenant = obtenirIdApprenant(req);
    if (!idApprenant || !Number.isInteger(idTentative) || idTentative < 1) throw new Error("Identifiant de tentative invalide.");
    const tentative = await TentativeQuiz.findOne({ where: { idTentative: idTentative, idApprenant: idApprenant }, transaction: transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({ message: "Tentative introuvable." });
    }
    const quiz = await chargerQuiz(tentative.codeQuiz, transaction);
    if (!quiz) throw new Error("Quiz introuvable.");
    if (tentative.statut === "terminee") {
      const resultat = await calculerResultat(tentative, quiz, transaction);
      const evaluation = await Evaluation.findOne({ where: { idTentative: idTentative }, transaction: transaction });
      const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
      const certificat = quiz.typeQuiz === "final" && numFormation ? await Certificat.findOne({ where: { idApprenant: idApprenant, numFormation: numFormation }, transaction: transaction }) : null;
      await transaction.commit();
      transaction = null;
      const scoreFinal = evaluation ? Number(evaluation.score) : resultat.score;
      const resultatFinal = evaluation && evaluation.resultat ? evaluation.resultat : resultat.resultat;
      return res.json(construireReponseResultat({ tentative: tentative, quiz: quiz, resultat: Object.assign({}, resultat, { score: scoreFinal, resultat: resultatFinal }), certificat: certificat, message: "Quiz deja soumis." }));
    }
    const acces = await verifierAccesQuiz(quiz, idApprenant, transaction);
    if (!acces.autorise) throw new Error(acces.message);
    if (req.body.reponses !== undefined) {
      const reponses = normaliserReponses(req.body.reponses);
      const vues = new Set();
      for (const item of reponses) {
        if (!Number.isInteger(item.numQuestion) || item.numQuestion < 1 || vues.has(item.numQuestion)) throw new Error("Liste de reponses invalide.");
        vues.add(item.numQuestion);
        await enregistrerUneQuestion({ idTentative: idTentative, numQuestion: item.numQuestion, numReponses: item.numReponses, quiz: quiz, transaction: transaction });
      }
    }
    const resultat = await terminerEtEnregistrer(tentative, quiz, transaction);
    await tentative.update({ estEnLigne: false, derniereActivite: new Date() }, { transaction: transaction });
    await transaction.commit();
    transaction = null;
    return res.json(construireReponseResultat({ tentative: tentative, quiz: quiz, resultat: resultat, certificat: resultat.certificat, message: "Quiz soumis avec succes." }));
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur soumettreTentative :", error);
    return res.status(400).json({ message: error.message || "Impossible de soumettre le quiz." });
  }
};

exports.obtenirTentativesFormateur = async (req, res) => {
  try {
    const idFormateur = obtenirIdApprenant(req);
    if (!idFormateur) return res.status(401).json({ message: "Utilisateur non identifie." });
    const quizFormateur = await Quiz.findAll({ where: { idFormateur: idFormateur }, attributes: ["codeQuiz"], raw: true });
    const codesQuiz = quizFormateur.map((q) => Number(q.codeQuiz)).filter((n) => Number.isInteger(n) && n > 0);
    if (!codesQuiz.length) return res.json({ tentatives: [] });
    const brutes = await TentativeQuiz.findAll({ where: { codeQuiz: { [Op.in]: codesQuiz } }, order: [["dateTentative", "DESC"], ["idTentative", "DESC"]] });
    if (!brutes.length) return res.json({ tentatives: [] });
    const idsTentatives = brutes.map((t) => Number(t.idTentative)).filter((n) => n > 0);
    const idsApprenants = Array.from(new Set(brutes.map((t) => Number(t.idApprenant)).filter((n) => n > 0)));
    const codesTentatives = Array.from(new Set(brutes.map((t) => Number(t.codeQuiz)).filter((n) => n > 0)));
    const results = await Promise.all([
      Quiz.findAll({ where: { codeQuiz: { [Op.in]: codesTentatives } } }),
      Utilisateur.findAll({ where: { idUtilisateur: { [Op.in]: idsApprenants } }, attributes: ["idUtilisateur", "nom", "prenom", "email"] }),
      Evaluation.findAll({ where: { idTentative: { [Op.in]: idsTentatives } } }),
      ReponseApprenant.findAll({ where: { idTentative: { [Op.in]: idsTentatives } }, attributes: ["idTentative", "numQuestion"] }),
      Module.findAll()
    ]);
    const quizzes = results[0];
    const apprenants = results[1];
    const evaluations = results[2];
    const reponses = results[3];
    const modules = results[4];
    const mapQuiz = new Map(quizzes.map((q) => [Number(q.codeQuiz), q]));
    const mapApprenants = new Map(apprenants.map((a) => [Number(a.idUtilisateur), a]));
    const mapEvaluations = new Map(evaluations.map((e) => [Number(e.idTentative), e]));
    const mapModules = new Map(modules.map((m) => [Number(m.codeModule), m]));
    const numFormations = Array.from(new Set(quizzes.map((q) => {
      const mod = q.codeModule ? mapModules.get(Number(q.codeModule)) : null;
      return Number(q.numFormation || (mod && mod.numFormation));
    }).filter((n) => Number.isInteger(n) && n > 0)));
    const formations = numFormations.length ? await Formation.findAll({ where: { numFormation: { [Op.in]: numFormations } } }) : [];
    const mapFormations = new Map(formations.map((f) => [Number(f.numFormation), f]));
    const certificats = (idsApprenants.length && numFormations.length) ? await Certificat.findAll({ where: { idApprenant: { [Op.in]: idsApprenants }, numFormation: { [Op.in]: numFormations } } }) : [];
    const mapCertificats = new Map(certificats.map((c) => [Number(c.idApprenant) + "-" + Number(c.numFormation), c]));
    const repondues = new Map();
    for (const r of reponses) {
      const id = Number(r.idTentative);
      if (!repondues.has(id)) repondues.set(id, new Set());
      repondues.get(id).add(Number(r.numQuestion));
    }
    let activites = [];
    try {
      activites = await ActiviteTentative.findAll({ where: { idTentative: { [Op.in]: idsTentatives } }, order: [["dateActivite", "ASC"], ["idActivite", "ASC"]] });
    } catch (e) {
      console.error("Erreur activites :", e.message);
      activites = [];
    }
    const parTentative = new Map();
    for (const a of activites) {
      const id = Number(a.idTentative);
      if (!parTentative.has(id)) parTentative.set(id, []);
      parTentative.get(id).push(a);
    }
    const resultat = brutes.map((tentative) => {
      const donnees = tentative.toJSON();
      const quiz = mapQuiz.get(Number(tentative.codeQuiz));
      const module = quiz && quiz.codeModule ? mapModules.get(Number(quiz.codeModule)) : null;
      const numFormation = Number((quiz && quiz.numFormation) || (module && module.numFormation)) || null;
      const formation = numFormation ? mapFormations.get(numFormation) : null;
      const nbQuestions = quiz && quiz.nbQuestions ? Number(quiz.nbQuestions) : 0;
      const setRep = repondues.get(Number(tentative.idTentative)) || new Set();
      const nbReponses = setRep.size;
      const termine = tentative.statut === "terminee";
      const progression = termine ? 100 : nbQuestions ? Math.min(100, Math.round(nbReponses / nbQuestions * 100)) : 0;
      const evenements = parTentative.get(Number(tentative.idTentative)) || [];
      const sorties = evenements.filter((e) => TYPES_SORTIE.includes(e.type));
      const derniere = evenements.length ? evenements[evenements.length - 1] : null;
      let tempsHors = 0;
      for (const e of evenements) { if (e.type === "retour") tempsHors += Number(e.dureeSecondes || 0); }
      const evaluation = mapEvaluations.get(Number(tentative.idTentative));
      const certificat = numFormation ? mapCertificats.get(Number(tentative.idApprenant) + "-" + numFormation) || null : null;
      const activitesCourtes = evenements.slice(-30).reverse().map((e) => ({ idActivite: e.idActivite, type: e.type, dateActivite: e.dateActivite, dureeSecondes: e.dureeSecondes }));
      return Object.assign({}, donnees, {
        statutSurveillance: tentative.statutSurveillance || "normal",
        quiz: quiz ? { codeQuiz: quiz.codeQuiz, nomQuiz: quiz.nomQuiz, typeQuiz: quiz.typeQuiz, seuilReussite: quiz.seuilReussite, duree: quiz.duree, codeModule: quiz.codeModule, numFormation: quiz.numFormation, nombreTentativesMax: null, tentativesIllimitees: true, nbQuestions: nbQuestions } : null,
        evaluation: evaluation || null,
        apprenant: mapApprenants.get(Number(tentative.idApprenant)) || null,
        formation: formation ? { numFormation: formation.numFormation, titre: formation.titre } : null,
        moduleInfo: module ? { codeModule: module.codeModule, titreModule: module.titreModule } : null,
        certificat: certificat ? certificat.toJSON() : null,
        idCertificat: certificat ? certificat.idCertificat : null,
        statutCertificat: certificat ? certificat.statutCertificat : "en_attente",
        nbQuestions: nbQuestions, nbReponses: nbReponses, progression: progression, nbSorties: sorties.length, tempsHorsEcran: tempsHors,
        horsEcran: !termine && Boolean(derniere) && derniere.type !== "retour",
        derniereActivite: derniere ? derniere.dateActivite : tentative.derniereActivite || null,
        activites: activitesCourtes
      });
    });
    return res.json({ tentatives: resultat });
  } catch (error) {
    console.error("Erreur obtenirTentativesFormateur :", error);
    return res.status(500).json({ message: "Impossible de recuperer les resultats.", erreur: error.message });
  }
};

exports.validerCertificatTentative = async (req, res) => {
  let transaction = null;
  try {
    const idFormateur = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    const decision = String((req.body && req.body.decision) || "");
    if (!idFormateur) return res.status(401).json({ message: "Utilisateur non identifie." });
    if (!Number.isInteger(idTentative) || idTentative <= 0) return res.status(400).json({ message: "Identifiant de tentative invalide." });
    if (decision !== "valider" && decision !== "refuser") return res.status(400).json({ message: "Decision invalide. Utilisez valider ou refuser." });
    transaction = await sequelize.transaction();
    const tentative = await TentativeQuiz.findByPk(idTentative, { transaction: transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) { await transaction.rollback(); transaction = null; return res.status(404).json({ message: "Tentative introuvable." }); }
    const quiz = await Quiz.findOne({ where: { codeQuiz: tentative.codeQuiz, idFormateur: idFormateur }, transaction: transaction });
    if (!quiz) { await transaction.rollback(); transaction = null; return res.status(403).json({ message: "Vous ne pouvez pas traiter cette tentative." }); }
    if (tentative.statut !== "terminee") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "La tentative doit etre terminee avant validation." }); }
    const evaluation = await Evaluation.findOne({ where: { idTentative: idTentative }, transaction: transaction });
    if (!evaluation || evaluation.resultat !== "reussi") { await transaction.rollback(); transaction = null; return res.status(400).json({ message: "L apprenant n a pas encore reussi." }); }
    const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
    if (!numFormation) { await transaction.rollback(); transaction = null; return res.status(400).json({ message: "Formation introuvable." }); }
    const nouveauStatut = decision === "valider" ? "validee" : "annulee";
    let certificat = await Certificat.findOne({ where: { idApprenant: tentative.idApprenant, numFormation: numFormation }, transaction: transaction, lock: transaction.LOCK.UPDATE });
    if (certificat) {
      if (certificat.statutCertificat === "validee" && nouveauStatut === "validee") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "Ce certificat est deja valide." }); }
      await certificat.update({ statutCertificat: nouveauStatut, idFormateur: quiz.idFormateur }, { transaction: transaction });
    } else {
      certificat = await creerCertificatDirectSiAbsent(tentative.idApprenant, numFormation, quiz.idFormateur, nouveauStatut, transaction);
    }
    await transaction.commit();
    transaction = null;
    return res.status(200).json({ message: nouveauStatut === "validee" ? "Certificat valide. L apprenant peut le telecharger." : "Certificat refuse.", certificat: certificat });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur validerCertificatTentative :", error);
    return res.status(500).json({ message: "Impossible de traiter le certificat.", erreur: error.message });
  }
};

exports.modifierStatutSurveillance = async (req, res) => {
  let transaction = null;
  try {
    const idFormateur = obtenirIdApprenant(req);
    const idTentative = Number(req.params.id);
    const statutSurveillance = String((req.body && req.body.statutSurveillance) || "");
    if (!idFormateur) return res.status(401).json({ message: "Utilisateur non identifie." });
    if (!Number.isInteger(idTentative) || idTentative <= 0) return res.status(400).json({ message: "Identifiant de tentative invalide." });
    if (statutSurveillance !== "validee" && statutSurveillance !== "invalidee") return res.status(400).json({ message: "Le statut doit etre validee ou invalidee." });
    transaction = await sequelize.transaction();
    const tentative = await TentativeQuiz.findByPk(idTentative, { transaction: transaction, lock: transaction.LOCK.UPDATE });
    if (!tentative) { await transaction.rollback(); transaction = null; return res.status(404).json({ message: "Tentative introuvable." }); }
    const quiz = await Quiz.findOne({ where: { codeQuiz: tentative.codeQuiz, idFormateur: idFormateur }, transaction: transaction });
    if (!quiz) { await transaction.rollback(); transaction = null; return res.status(403).json({ message: "Vous ne pouvez pas traiter cette tentative." }); }
    if (tentative.statut !== "terminee") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "La tentative doit etre terminee avant validation." }); }
    const ancien = tentative.statutSurveillance || "normal";
    if (ancien !== "a_verifier" && ancien !== "normal") { await transaction.rollback(); transaction = null; return res.status(409).json({ message: "Cette tentative a deja ete traitee." }); }
    await tentative.update({ statutSurveillance: statutSurveillance }, { transaction: transaction });
    let certificat = null;
    if (statutSurveillance === "validee") {
      const evaluation = await Evaluation.findOne({ where: { idTentative: idTentative }, transaction: transaction });
      if (evaluation && evaluation.resultat === "reussi" && quiz.typeQuiz === "final") {
        const numFormation = await obtenirFormationDuQuiz(quiz, transaction);
        if (numFormation) certificat = await creerDemandeCertificatSiAdmissible(tentative.idApprenant, numFormation, quiz.idFormateur, transaction);
      }
    }
    await transaction.commit();
    transaction = null;
    return res.status(200).json({ message: statutSurveillance === "validee" ? "Tentative validee par le formateur." : "Tentative invalidee par le formateur.", tentative: tentative, statutSurveillance: statutSurveillance, certificat: certificat });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("Erreur modifierStatutSurveillance :", error);
    return res.status(500).json({ message: "Impossible de modifier le statut.", erreur: error.message });
  }
};

exports.verifierAccesQuiz = verifierAccesQuiz;