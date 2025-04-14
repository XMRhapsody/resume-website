import { User, UserRole } from '../types/auth';
import bcrypt from 'bcryptjs';

// 注意：这是示例数据，真实环境中应使用加密的密码
// 实际数据库中的密码应该是哈希后的结果
export const defaultUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    // bcryptjs哈希的"admin123"
    password: '$2a$10$2b9nGJCpuXNDnpKF.XZwKe5MR8PhBtg4nWeTjTLuVAz1qWGV4pfK2', 
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  }
];

// 用于生成哈希密码的辅助函数
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// 验证密码的辅助函数
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 测试密码是否有效的辅助函数 (仅用于开发环境)
export async function testPasswordHash() {
  const password = 'admin123';
  const hash = '$2a$10$2b9nGJCpuXNDnpKF.XZwKe5MR8PhBtg4nWeTjTLuVAz1qWGV4pfK2';
  const isValid = await bcrypt.compare(password, hash);
  console.log(`测试密码哈希是否有效: ${isValid ? '有效' : '无效'}`);
  return isValid;
} 