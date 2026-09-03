import type { ApiResponse } from "./api"

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  country?: string
  user_type?: string
  status?: string
  role_id?: string | null
}

/** Effective RBAC session from login /auth/me / verify-token. */
export interface RbacSession {
  isOwner: boolean
  roleId: string | null
  roleName: string | null
  permissions: string[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface LoginRequestDto {
  email: string
  password: string
}

export interface LoginResponseDto extends ApiResponse<{
  user: AuthUser
  tokens?: AuthTokens
  accessToken?: string
  refreshToken?: string
  isOwner?: boolean
  roleId?: string | null
  roleName?: string | null
  permissions?: string[]
}> {
  isOwner?: boolean
  roleId?: string | null
  roleName?: string | null
  permissions?: string[]
  user?: AuthUser
  accessToken?: string
  refreshToken?: string
}

export interface AuthMeResponseDto extends ApiResponse<{
  user: AuthUser
  isOwner: boolean
  roleId?: string | null
  roleName?: string | null
  permissions: string[]
}> {}

export interface MerchantRegistrationRequestDto {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  password: string
  user_merchant_id: string
}

export interface RegistrationResponseDto extends ApiResponse<{
  user: AuthUser
}> {}

export interface ForgotPasswordRequestDto {
  email: string
}

export interface ResetPasswordRequestDto {
  token: string
  password: string
}

export interface VerifyAccountRequestDto {
  token: string
}

export interface VerifyEmailOtpRequestDto {
  email: string
  otp: string
}

export interface ResendEmailOtpRequestDto {
  email: string
}

export interface SessionDto {
  id: string
  deviceInfo?: string
  ipAddress?: string
  lastActiveAt?: string
  isCurrent?: boolean
}

export interface SessionsResponseDto extends ApiResponse<{
  sessions: SessionDto[]
}> {}

