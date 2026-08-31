export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  created_at: string
  is_staff: boolean
}

export type AdminUser = User & {
  is_active: boolean
}

export type RegisterRequest = {
  email: string
  password: string
  first_name: string
  last_name: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type UpdateMeRequest = Partial<Pick<RegisterRequest, "email" | "password" | "first_name" | "last_name">>

export type UpdateAdminUserRequest = Partial<{
  email: string
  password: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_active: boolean
}>
