/**
 * Spanish (Argentina) user-facing copy for the user-auth screens, kept in one
 * module so wording stays consistent and testable. Code and identifiers remain
 * English (see design D4); only these string values are localized.
 */
import type { AuthErrorCode } from "../model/auth-user";

export const AUTH_COPY = {
  registerTitle: "Crear cuenta",
  registerSubtitle: "Registrate para administrar tu escuela.",
  loginTitle: "Iniciar sesión",
  loginSubtitle: "Ingresá con tu cuenta de instructor.",
  emailLabel: "Correo electrónico",
  emailPlaceholder: "profe@escuela.com.ar",
  passwordLabel: "Contraseña",
  passwordPlaceholder: "Tu contraseña",
  submitRegister: "Registrarme",
  submitLogin: "Ingresar",
  continueWithGoogle: "Continuar con Google",
  orSeparator: "o",
  goToLogin: "¿Ya tenés cuenta? Iniciá sesión",
  goToRegister: "¿No tenés cuenta? Registrate",
  signOut: "Cerrar sesión",
  validation: {
    email: "Ingresá un correo válido.",
    passwordMin: "La contraseña debe tener al menos 8 caracteres.",
    passwordRequired: "Ingresá tu contraseña.",
  },
  errors: {
    "email-already-in-use": "Ese correo ya está registrado.",
    "invalid-credentials": "Correo o contraseña incorrectos.",
    "weak-password": "La contraseña es demasiado débil.",
    "invalid-email": "Ingresá un correo válido.",
    "too-many-requests": "Demasiados intentos. Probá de nuevo en unos minutos.",
    "network-error": "Sin conexión. Revisá tu internet e intentá otra vez.",
    cancelled: "Cancelaste el inicio de sesión.",
    "account-exists-with-other-provider":
      "Ese correo ya tiene una cuenta creada con otro método. Ingresá con el método que usaste la primera vez.",
    unknown: "No pudimos completar la operación. Intentá otra vez.",
  } satisfies Record<AuthErrorCode, string>,
} as const;

/**
 * Copy for the auth gate (task 3.7). "Sin asignar" and "no pudimos leer tus
 * permisos" are deliberately different messages: the first is resolved by an
 * administrator, the second by retrying.
 */
export const SESSION_COPY = {
  loading: "Cargando…",
  unassignedTitle: "Todavía no tenés una escuela asignada",
  unassignedBody:
    "Pedile a un administrador de tu asociación que te asigne a una escuela para empezar a usar la app.",
  unavailableTitle: "No pudimos verificar tus permisos",
  unavailableBody:
    "Puede ser un problema de conexión. Intentá de nuevo en unos segundos.",
  retry: "Reintentar",
} as const;

/** Spanish message for a failure code, falling back to the generic one. */
export function authErrorMessage(code: AuthErrorCode): string {
  return AUTH_COPY.errors[code] ?? AUTH_COPY.errors.unknown;
}
