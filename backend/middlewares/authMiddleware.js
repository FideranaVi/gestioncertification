
const jwt = require("jsonwebtoken");

const normaliserRole = (role) => {
  const roles = {
    admin: "admin",
    administrateur: "admin",
    formateur: "formateur",
    apprenant: "apprenant"
  };

  return roles[String(role || "").trim().toLowerCase()] || null;
};

const authMiddleware = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentification requise."
      });
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Token manquant."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET non configuré.");

      return res.status(500).json({
        message: "Configuration du serveur incorrecte."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.idUtilisateur || !decoded.role) {
      return res.status(401).json({
        message: "Token invalide."
      });
    }

    const role = normaliserRole(decoded.role);

    if (!role) {
      return res.status(403).json({
        message: "Rôle utilisateur non reconnu."
      });
    }

    req.utilisateur = {
      idUtilisateur: decoded.idUtilisateur,
      role
    };

    next();

  } catch (error) {
    console.error("Erreur authentification :", error.message);

    return res.status(401).json({
      message: "Token invalide ou expiré."
    });
  }
};

const verifierRole = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return res.status(401).json({
        message: "Authentification requise."
      });
    }

    const roleUtilisateur = normaliserRole(req.utilisateur.role);

    const roles = rolesAutorises.map(normaliserRole);

    if (!roleUtilisateur || roles.includes(null)) {
      return res.status(403).json({
        message: "Rôle non autorisé."
      });
    }

    if (!roles.includes(roleUtilisateur)) {
      return res.status(403).json({
        message: "Accès interdit. Vous n'avez pas les autorisations nécessaires."
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  verifierRole,
  normaliserRole
};
