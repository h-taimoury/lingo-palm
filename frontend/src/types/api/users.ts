export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  created_at: string
  is_staff: boolean
  is_superuser: boolean
  email_verified: boolean
  pending_email: string
}

export type AdminUser = User & {
  is_active: boolean
}

export type RegisterRequest = {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type UpdateMeRequest = Partial<Pick<RegisterRequest, "email" | "password" | "password_confirm" | "first_name" | "last_name">> & {
  current_password?: string
}

export type UpdateAdminUserRequest = Partial<{
  email: string
  password: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_active: boolean
  email_verified: true
}>
