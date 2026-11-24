const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normaliserRole = (role) => {
  const roles = {
    admin: "admin",
    administrateur: "admin",
    formateur: "formateur",
    apprenant: "apprenant"
  };

  return roles[String(role || "").trim().toLowerCase()] || null;
};

const inscription = async (req, res) => {
  try {
    const { nom, prenom, email, pwd } = req.body;

    if (!nom || !prenom || !email || !pwd) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires."
      });
    }

    const nomNormalise = String(nom).trim();
    const prenomNormalise = String(prenom).trim();
    const emailNormalise = String(email).trim().toLowerCase();
    const motDePasse = String(pwd);

    if (!nomNormalise || !prenomNormalise || !emailNormalise) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires."
      });
    }

    if (
      nomNormalise.length > 50 ||
      prenomNormalise.length > 50 ||
      emailNormalise.length > 100
    ) {
      return res.status(400).json({
        message: "La longueur d'un champ dépasse la limite autorisée."
      });
    }

    if (motDePasse.length < 8) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 8 caractères."
      });
    }

    const utilisateurExistant = await Utilisateur.findOne({
      where: { email: emailNormalise }
    });

    if (utilisateurExistant) {
      return res.status(409).json({
        message: "Cette adresse email est déjà utilisée."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET non configuré.");
    }

    const pwdHash = await bcrypt.hash(motDePasse, 10);

    const utilisateur = await Utilisateur.create({
      nom: nomNormalise,
      prenom: prenomNormalise,
      email: emailNormalise,
      pwd: pwdHash,
      role: "apprenant"
    });

    const token = jwt.sign(
      {
        idUtilisateur: utilisateur.idUtilisateur,
        role: "apprenant"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.status(201).json({
      message: "Inscription réussie.",
      token,
      utilisateur: {
        idUtilisateur: utilisateur.idUtilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role
      },
      redirectTo: "/dashboard/apprenant"
    });
  } catch (error) {
    console.error("Erreur inscription :", error);

    return res.status(500).json({
      message: "Erreur lors de l'inscription."
    });
  }
};

const connexion = async (req, res) => {
  try {
    const { email, pwd } = req.body;

    if (!email || !pwd) {
      return res.status(400).json({
        message: "Email et mot de passe obligatoires."
      });
    }

    const emailNormalise = String(email).trim().toLowerCase();

    const utilisateur = await Utilisateur.findOne({
      where: { email: emailNormalise }
    });

    if (!utilisateur) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect."
      });
    }

    const motDePasseStocke = String(utilisateur.pwd || "");

    let motDePasseValide = false;

    const estHashBcrypt = /^\$2[aby]\$\d{2}\$/.test(
      motDePasseStocke
    );

    if (estHashBcrypt) {
      motDePasseValide = await bcrypt.compare(
        String(pwd),
        motDePasseStocke
      );
    } else {
      motDePasseValide = String(pwd) === motDePasseStocke;

      if (motDePasseValide) {
        const nouveauHash = await bcrypt.hash(String(pwd), 10);

        await utilisateur.update({
          pwd: nouveauHash
        });
      }
    }

    if (!motDePasseValide) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect."
      });
    }

    const role = normaliserRole(utilisateur.role);

    if (!role) {
      return res.status(403).json({
        message: "Rôle utilisateur non reconnu."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET non configuré.");
    }

    const token = jwt.sign(
      {
        idUtilisateur: utilisateur.idUtilisateur,
        role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.status(200).json({
      message: "Connexion réussie.",
      token,
      utilisateur: {
        idUtilisateur: utilisateur.idUtilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role
      },
      redirectTo: `/dashboard/${role}`
    });
  } catch (error) {
    console.error("Erreur connexion :", error);

    return res.status(500).json({
      message: "Erreur lors de la connexion."
    });
  }
};

// AJOUT SEULEMENT : Connexion avec Google
const connexionGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Token Google manquant."
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error("GOOGLE_CLIENT_ID non configuré.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET non configuré.");
    }

    // Vérifie que le token vient vraiment de Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const emailNormalise = String(payload.email || "").trim().toLowerCase();

    if (!emailNormalise) {
      return res.status(400).json({
        message: "Email Google introuvable."
      });
    }

    // Nom / prénom depuis Google
    const nomNormalise = String(payload.family_name || payload.name || "Utilisateur").trim().slice(0, 50);
    const prenomNormalise = String(payload.given_name || payload.name || "Google").trim().slice(0, 50);

    // Cherche si l'utilisateur existe déjà avec SON propre mail
    let utilisateur = await Utilisateur.findOne({
      where: { email: emailNormalise }
    });

    if (!utilisateur) {
      // Nouveau compte -> Apprenant automatiquement (style SoloLearn)
      // Mot de passe aléatoire car il se connecte avec Google
      const pwdHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);

      utilisateur = await Utilisateur.create({
        nom: nomNormalise,
        prenom: prenomNormalise,
        email: emailNormalise,
        pwd: pwdHash,
        role: "apprenant"
      });

      console.log("Nouvel apprenant créé via Google :", emailNormalise);
    } else {
      console.log("Connexion Google existant :", emailNormalise, "Role :", utilisateur.role);
    }

    const role = normaliserRole(utilisateur.role);

    if (!role) {
      return res.status(403).json({
        message: "Rôle utilisateur non reconnu."
      });
    }

    const token = jwt.sign(
      {
        idUtilisateur: utilisateur.idUtilisateur,
        role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.status(200).json({
      message: "Connexion Google réussie.",
      token,
      utilisateur: {
        idUtilisateur: utilisateur.idUtilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role
      },
      redirectTo: `/dashboard/${role}`
    });
  } catch (error) {
    console.error("Erreur connexion Google :", error);

    return res.status(401).json({
      message: "Connexion Google échouée."
    });
  }
};

module.exports = {
  inscription,
  connexion,
  connexionGoogle // AJOUT SEULEMENT
};