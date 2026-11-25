export type UserRole = 'user' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  avatarInitials: string
}

export interface StoredUser extends AuthUser {
  passwordHash: string
  createdAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  phone: string
  password: string
}

export interface AuthResponse {
  user: AuthUser | null
}
