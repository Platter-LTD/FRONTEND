export const PASSWORD_SPECIALS = "@$!%*?&"
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,128}$/

export type PasswordRuleCheck = {
  hasLowercase: boolean
  hasUppercase: boolean
  hasNumber: boolean
  hasRequiredSpecial: boolean
  lengthValid: boolean
  isValid: boolean
}

export function validateRegistrationPassword(password: string): PasswordRuleCheck {
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasRequiredSpecial = /[@$!%*?&]/.test(password)
  const lengthValid = password.length >= 8 && password.length <= 128
  const isValid = PASSWORD_REGEX.test(password)
  return { hasLowercase, hasUppercase, hasNumber, hasRequiredSpecial, lengthValid, isValid }
}

export function registrationPasswordError(password: string): string | null {
  const check = validateRegistrationPassword(password)
  if (check.isValid) return null
  return "Password must be 8-128 chars and include uppercase, lowercase, number, and one of @$!%*?&."
}
