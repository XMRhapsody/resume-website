export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  username: string;
  password: string; // 密码应该是哈希值
  email: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export interface EditHistory {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  action: string; // 'create' | 'update' | 'delete'
  section: string; // 'personalInfo', 'workExperience', 等
  details: string; // JSON字符串，包含更改的字段
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  } | null;
  token: string | null;
} 