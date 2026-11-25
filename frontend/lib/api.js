const BASE = (process.env.NEXT_PUBLIC_API_URL || "https://gestioncertification-backend.onrender.com").replace(/\/$/, "");

export function obtenirApi() {
  return `${BASE}/api`;
}

export function obtenirApiAdmin() {
  // OBLIGATOIRE : /api/admin, pas /api/utilisateurs, pas /api/utilisateur
  return `${BASE}/api/admin`;
}

export function obtenirApiFormateur() {
  return `${BASE}/api/formateur`;
}

export function obtenirApiApprenant() {
  return `${BASE}/api/apprenant`;
}

export default obtenirApi;