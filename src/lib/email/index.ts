/**
 * Módulo de Email - Exports
 *
 * Centraliza todas as exportações do módulo de email para facilitar imports.
 */

export { emailConfig, isEmailConfigured, warnIfEmailNotConfigured } from "./config";
export { PasswordResetEmailTemplate, PasswordChangedEmailTemplate } from "./templates";
export {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  verifyEmailConfiguration,
} from "./service";
export { betterAuthEmailAdapter } from "./adapter";
