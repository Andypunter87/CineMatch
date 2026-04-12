/**
 * Firebase client stub — Firebase has been replaced with PostgreSQL/Google SSO.
 * This file is retained only for interface compatibility with legacy code.
 */

export const app = null as any;
export const auth = null as any;
export const db = null as any;
export const googleProvider = null as any;

export function signInWithGoogle() {
  window.location.href = '/api/auth/google';
}
