
const PDFDocument = require("pdfkit");
const crypto = require("crypto");

const {
  db,
  obtenirIdUtilisateur,
  obtenirRole,
  reponseErreur
} = require("./utilsController");

const {
  Certificat,
  Formation,
  Module,
  Quiz,
  TentativeQuiz,
  Evaluation,
  Utilisateur
} = db;

const STATUTS_CERTIFICAT = [
  "en_attente",
  "validee",
  "annulee"
];

const STATUTS_SURVEILLANCE_AUTORISES = [
  "normal",
  "validee"
];

function obtenirNomComplet(utilisateur, valeurParDefaut) {
  if (!utilisateur) return valeurParDefaut;

  return [
    utilisateur.prenom,
    utilisateur.nom
  ].filter(Boolean).join(" ") || valeurParDefaut;
}

function genererNumeroCertificat() {
  return (
    "LP-" +
    Date.now() +
    "-" +
    crypto.randomBytes(3).toString("hex").toUpperCase()
  );
}

async function verifierQuizReussi(
  idApprenant,
  quiz
) {
  const evaluations = await Evaluation.findAll({
    where: {
      resultat: "reussi"
    },
    include: [
      {
        model: TentativeQuiz,
        as: "tentative",
        required: true,
        where: {
          idApprenant,
          codeQuiz: quiz.codeQuiz
        }
      }
    ],
    order: [
      ["dateEvaluation", "DESC"]
    ]
  });

  return evaluations.some(evaluation => {
    const tentative = evaluation.tentative;

    return (
      tentative &&
      tentative.statut === "terminee" &&
      STATUTS_SURVEILLANCE_AUTORISES.includes(
        tentative.statutSurveillance || "normal"
      )
    );
  });
}

async function obtenirFormationAvecQuiz(numFormation) {
  return Formation.findByPk(numFormation, {
    include: [
      {
        model: Module,
        as: "modules",
        include: [
          {
            model: Quiz,
            as: "quizzes"
          }
        ]
      }
    ]
  });
}

// =====================================================
// OBTENIR TOUS LES CERTIFICATS
// GET /certificats
// =====================================================

exports.obtenirCertificats = async (req, res) => {
  try {
    const role = obtenirRole(req);
    const idUtilisateur = obtenirIdUtilisateur(req);

    if (!idUtilisateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    let where = {};

    if (role === "apprenant") {
      where.idApprenant = idUtilisateur;
    } else if (role === "formateur") {
      where.idFormateur = idUtilisateur;
    } else if (role !== "administrateur") {
      return res.status(403).json({
        message: "Accès interdit."
      });
    }

    const certificats = await Certificat.findAll({
      where,
      include: [
        {
          model: Formation,
          as: "formation",
          attributes: [
            "numFormation",
            "titre"
          ]
        },
        {
          model: Utilisateur,
          as: "apprenant",
          attributes: [
            "idUtilisateur",
            "nom",
            "prenom",
            "email"
          ]
        },
        {
          model: Utilisateur,
          as: "formateur",
          attributes: [
            "idUtilisateur",
            "nom",
            "prenom"
          ]
        }
      ],
      order: [
        ["dateObtention", "DESC"]
      ]
    });

    return res.status(200).json(certificats);

  } catch (error) {
    console.error("Erreur obtenirCertificats :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de récupérer les certificats."
    );
  }
};

// =====================================================
// OBTENIR UN CERTIFICAT
// GET /certificats/:id
// =====================================================

exports.obtenirCertificat = async (req, res) => {
  try {
    const role = obtenirRole(req);
    const idUtilisateur = obtenirIdUtilisateur(req);
    const idCertificat = Number(req.params.id);

    if (!idUtilisateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    if (
      !Number.isInteger(idCertificat) ||
      idCertificat <= 0
    ) {
      return res.status(400).json({
        message: "Identifiant de certificat invalide."
      });
    }

    const certificat = await Certificat.findByPk(
      idCertificat,
      {
        include: [
          {
            model: Formation,
            as: "formation"
          },
          {
            model: Utilisateur,
            as: "apprenant"
          },
          {
            model: Utilisateur,
            as: "formateur"
          }
        ]
      }
    );

    if (!certificat) {
      return res.status(404).json({
        message: "Certificat introuvable."
      });
    }

    if (
      role === "apprenant" &&
      Number(certificat.idApprenant) !== Number(idUtilisateur)
    ) {
      return res.status(403).json({
        message: "Accès interdit."
      });
    }

    if (
      role === "formateur" &&
      Number(certificat.idFormateur) !== Number(idUtilisateur)
    ) {
      return res.status(403).json({
        message: "Accès interdit."
      });
    }

    if (
      !["apprenant", "formateur", "administrateur"].includes(role)
    ) {
      return res.status(403).json({
        message: "Accès interdit."
      });
    }

    return res.status(200).json(certificat);

  } catch (error) {
    console.error("Erreur obtenirCertificat :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de récupérer le certificat."
    );
  }
};

// =====================================================
// DEMANDER UN CERTIFICAT
// POST /certificats
// =====================================================

exports.genererCertificat = async (req, res) => {
  try {
    const role = obtenirRole(req);
    const idApprenant = obtenirIdUtilisateur(req);

    const numFormation = Number(req.body?.numFormation);

    if (role !== "apprenant") {
      return res.status(403).json({
        message: "Seul un apprenant peut demander un certificat."
      });
    }

    if (!idApprenant) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    if (
      !Number.isInteger(numFormation) ||
      numFormation <= 0
    ) {
      return res.status(400).json({
        message: "Identifiant de formation invalide."
      });
    }

    const formation = await obtenirFormationAvecQuiz(
      numFormation
    );

    if (!formation) {
      return res.status(404).json({
        message: "Formation introuvable."
      });
    }

    const modules = formation.modules || [];

    const quizzes = modules.flatMap(module =>
      module.quizzes || []
    );

    if (quizzes.length === 0) {
      return res.status(400).json({
        message: "Cette formation ne contient aucun quiz."
      });
    }

    const dejaCree = await Certificat.findOne({
      where: {
        idApprenant,
        numFormation
      }
    });

    if (dejaCree) {
      return res.status(409).json({
        message:
          dejaCree.statutCertificat === "validee"
            ? "Votre certificat a déjà été validé."
            : dejaCree.statutCertificat === "annulee"
              ? "Votre précédente demande a été annulée."
              : "Une demande de certificat existe déjà pour cette formation.",
        certificat: dejaCree
      });
    }

    // Vérification de tous les quiz de la formation.
    for (const quiz of quizzes) {
      const reussi = await verifierQuizReussi(
        idApprenant,
        quiz
      );

      if (!reussi) {
        return res.status(400).json({
          message:
            `Vous devez réussir et faire valider le quiz "${quiz.nomQuiz}" avant de demander votre certificat.`
        });
      }
    }

    // Recherche du formateur associé aux quiz.
    const formateurs = [
      ...new Set(
        quizzes
          .map(quiz => Number(quiz.idFormateur))
          .filter(id => Number.isInteger(id) && id > 0)
      )
    ];

    if (formateurs.length === 0) {
      return res.status(400).json({
        message:
          "Aucun formateur n'est associé aux quiz de cette formation."
      });
    }

    const formateur = await Utilisateur.findOne({
      where: {
        idUtilisateur: formateurs[0],
        role: "formateur"
      }
    });

    if (!formateur) {
      return res.status(400).json({
        message: "Le formateur associé est introuvable."
      });
    }

    const numeroCertificat = genererNumeroCertificat();

    const certificat = await Certificat.create({
      numeroCertificat,
      dateObtention: new Date(),
      statutCertificat: "en_attente",
      idApprenant,
      numFormation,
      idFormateur: formateur.idUtilisateur
    });

    return res.status(201).json({
      message:
        "Votre demande de certificat a été envoyée au formateur.",
      certificat
    });

  } catch (error) {
    console.error("Erreur genererCertificat :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de créer la demande de certificat."
    );
  }
};

// =====================================================
// MODIFIER LE STATUT DU CERTIFICAT
// PATCH /certificats/:id/statut
// =====================================================

exports.modifierStatutCertificat = async (req, res) => {
  try {
    const role = obtenirRole(req);
    const idUtilisateur = obtenirIdUtilisateur(req);

    const idCertificat = Number(req.params.id);
    const statutCertificat = String(
      req.body?.statutCertificat || ""
    );

    if (role !== "formateur") {
      return res.status(403).json({
        message: "Seul un formateur peut traiter les demandes."
      });
    }

    if (!idUtilisateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    if (
      !Number.isInteger(idCertificat) ||
      idCertificat <= 0
    ) {
      return res.status(400).json({
        message: "Identifiant de certificat invalide."
      });
    }

    if (!["validee", "annulee"].includes(statutCertificat)) {
      return res.status(400).json({
        message: "Le statut doit être validee ou annulee."
      });
    }

    const certificat = await Certificat.findOne({
      where: {
        idCertificat,
        idFormateur: idUtilisateur
      }
    });

    if (!certificat) {
      return res.status(404).json({
        message: "Demande introuvable ou accès interdit."
      });
    }

    if (certificat.statutCertificat !== "en_attente") {
      return res.status(409).json({
        message: "Cette demande a déjà été traitée."
      });
    }

    certificat.statutCertificat = statutCertificat;

    await certificat.save();

    return res.status(200).json({
      message:
        statutCertificat === "validee"
          ? "Certificat validé avec succès."
          : "Demande de certificat annulée.",
      certificat
    });

  } catch (error) {
    console.error("Erreur modifierStatutCertificat :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de modifier le statut du certificat."
    );
  }
};

// =====================================================
// TÉLÉCHARGER LE CERTIFICAT PDF
// GET /certificats/:id/pdf
// =====================================================

exports.telechargerCertificatPDF = async (req, res) => {
  try {
    const role = obtenirRole(req);
    const idUtilisateur = obtenirIdUtilisateur(req);
    const idCertificat = Number(req.params.id);

    if (role !== "apprenant") {
      return res.status(403).json({
        message: "Accès réservé aux apprenants."
      });
    }

    if (!idUtilisateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    if (
      !Number.isInteger(idCertificat) ||
      idCertificat <= 0
    ) {
      return res.status(400).json({
        message: "Identifiant de certificat invalide."
      });
    }

    const certificat = await Certificat.findOne({
      where: {
        idCertificat,
        idApprenant: idUtilisateur
      },
      include: [
        {
          model: Formation,
          as: "formation"
        },
        {
          model: Utilisateur,
          as: "apprenant"
        },
        {
          model: Utilisateur,
          as: "formateur"
        }
      ]
    });

    if (!certificat) {
      return res.status(404).json({
        message: "Certificat introuvable."
      });
    }

    // Un certificat en attente ou annulé ne peut pas être téléchargé.
    if (certificat.statutCertificat !== "validee") {
      return res.status(403).json({
        message:
          certificat.statutCertificat === "annulee"
            ? "Cette demande de certificat a été annulée."
            : "Votre certificat doit d'abord être validé par le formateur."
      });
    }

    const nomApprenant = obtenirNomComplet(
      certificat.apprenant,
      "Apprenant"
    );

    const nomFormateur = obtenirNomComplet(
      certificat.formateur,
      "Formateur"
    );

    const titreFormation =
      certificat.formation?.titre || "Formation LearningPro";

    const dateObtention = certificat.dateObtention
      ? new Date(certificat.dateObtention).toLocaleDateString(
          "fr-FR",
          {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }
        )
      : "Non disponible";

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: {
        top: 45,
        bottom: 45,
        left: 55,
        right: 55
      },
      info: {
        Title: "Certificat LearningPro",
        Author: "LearningPro"
      }
    });

    const nomFichier =
      `Certificat-LearningPro-${certificat.idCertificat}.pdf`;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nomFichier}"`
    );

    doc.pipe(res);

    const largeur = doc.page.width;
    const hauteur = doc.page.height;

    // Cadre extérieur.
    doc.rect(20, 20, largeur - 40, hauteur - 40)
      .lineWidth(4)
      .strokeColor("#1b7546")
      .stroke();

    // Cadre intérieur.
    doc.rect(29, 29, largeur - 58, hauteur - 58)
      .lineWidth(1)
      .strokeColor("#c4a45b")
      .stroke();

    // En-tête.
    doc.fillColor("#1b7546")
      .font("Helvetica-Bold")
      .fontSize(17)
      .text("LEARNING PRO", 0, 65, {
        align: "center"
      });

    doc.fillColor("#a17c35")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("CERTIFICAT DE RÉUSSITE", 0, 115, {
        align: "center",
        characterSpacing: 3
      });

    doc.fillColor("#243f30")
      .font("Times-Bold")
      .fontSize(34)
      .text("Certificat", 0, 150, {
        align: "center"
      });

    // Nom de l'apprenant.
    doc.fillColor("#68766c")
      .font("Helvetica")
      .fontSize(13)
      .text("Ce certificat est décerné à", 0, 205, {
        align: "center"
      });

    doc.fillColor("#1b7546")
      .font("Times-Bold")
      .fontSize(27)
      .text(nomApprenant, 65, 238, {
        width: largeur - 130,
        align: "center"
      });

    doc.moveTo(180, 280)
      .lineTo(largeur - 180, 280)
      .lineWidth(1)
      .strokeColor("#c4a45b")
      .stroke();

    // Formation.
    doc.fillColor("#68766c")
      .font("Helvetica")
      .fontSize(13)
      .text(
        "Pour avoir réussi avec succès la formation",
        0,
        300,
        {
          align: "center"
        }
      );

    doc.fillColor("#243f30")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(titreFormation, 75, 330, {
        width: largeur - 150,
        align: "center"
      });

    // Informations complémentaires.
    doc.fillColor("#68766c")
      .font("Helvetica")
      .fontSize(11)
      .text(`Formateur : ${nomFormateur}`, 0, 385, {
        align: "center"
      });

    doc.text(
      `Date d'obtention : ${dateObtention}`,
      0,
      405,
      {
        align: "center"
      }
    );

    // Numéro du certificat.
    doc.fillColor("#1b7546")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("CERTIFICAT N°", 80, 460);

    doc.fillColor("#344d3c")
      .font("Helvetica")
      .fontSize(10)
      .text(certificat.numeroCertificat, 80, 477);

    // Signature.
    doc.moveTo(largeur - 230, 455)
      .lineTo(largeur - 80, 455)
      .lineWidth(1)
      .strokeColor("#829087")
      .stroke();

    doc.fillColor("#344d3c")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("LE FORMATEUR", largeur - 230, 465, {
        width: 150,
        align: "center"
      });

    // Pied de page.
    doc.fillColor("#1b7546")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        "LEARNING PRO • APPRENDRE ET RÉUSSIR",
        0,
        hauteur - 65,
        {
          align: "center"
        }
      );

    doc.end();

  } catch (error) {
    console.error(
      "Erreur génération certificat PDF :",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Impossible de générer le certificat PDF."
      });
    }

    res.end();
  }
};
