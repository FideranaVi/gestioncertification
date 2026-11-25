export function obtenirApi() {
  const base = process.env.NEXT_PUBLIC_API_URL || "https://gestioncertification-backend.onrender.com/api";
  return String(base).replace(/\/$/, "");
}

export function obtenirApiAuth() {
  return `${obtenirApi()}/auth`;
}

export function obtenirApiFormateur() {
  return `${obtenirApi()}/formateur`;
}

export function obtenirApiApprenant() {
  return `${obtenirApi()}/apprenant`;
}

export function obtenirApiAdmin() {
  return `${obtenirApi()}/admin`;
}

// Alias, pour que plus aucune page ne casse le build
export const API_URL = obtenirApi();
export const BASE_URL = obtenirApi();
export function getApiUrl() { return obtenirApi(); }
export function getApiAdmin() { return obtenirApiAdmin(); }
export function getApiAuth() { return obtenirApiAuth(); }

export default obtenirApi;