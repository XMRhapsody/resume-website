import jwt from 'jsonwebtoken';
import { User, UserRole, EditHistory } from '../types/auth';
import { defaultUsers, verifyPassword } from '../data/defaultUsers';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// JWT密钥，生产环境应该通过环境变量设置
const JWT_SECRET = process.env.JWT_SECRET || 'resume-website-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7天有效期

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');
const HISTORY_FILE_PATH = path.join(process.cwd(), 'data', 'edit-history.json');

// 确保数据目录存在
function ensureDataDirectoryExists() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    console.log('创建数据目录:', dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 确保目录有正确的权限
  try {
    fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    console.error('数据目录权限错误:', err);
    // 尝试修复权限
    try {
      fs.chmodSync(dataDir, 0o755);
    } catch (chmodErr) {
      console.error('无法修改数据目录权限:', chmodErr);
    }
  }
}

// 获取所有用户
export function getAllUsers(): User[] {
  ensureDataDirectoryExists();
  
  if (!fs.existsSync(USERS_FILE_PATH)) {
    // 如果文件不存在，使用默认用户并保存到文件
    console.log('创建默认用户文件...');
    try {
      // 确保defaultUsers中的密码是bcryptjs兼容的
      const initUsers = JSON.parse(JSON.stringify(defaultUsers));
      
      // 保存用户数据
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(initUsers, null, 2));
      console.log('默认用户创建成功');
      return initUsers;
    } catch (error) {
      console.error('创建默认用户失败:', error);
      return defaultUsers;
    }
  }
  
  try {
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    return JSON.parse(data) as User[];
  } catch (error) {
    console.error('读取用户数据失败:', error);
    return defaultUsers;
  }
}

// 保存用户
export function saveUsers(users: User[]) {
  ensureDataDirectoryExists();
  fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
}

// 根据用户名查找用户
export function findUserByUsername(username: string): User | undefined {
  const users = getAllUsers();
  return users.find(user => user.username === username);
}

// 登录并生成token
export async function login(username: string, password: string) {
  const user = findUserByUsername(username);
  
  if (!user) {
    return { success: false, message: '用户名或密码不正确' };
  }
  
  const passwordValid = await verifyPassword(password, user.password);
  
  if (!passwordValid) {
    return { success: false, message: '用户名或密码不正确' };
  }
  
  // 更新最后登录时间
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    saveUsers(users);
  }
  
  // 生成JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role 
    }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  return {
    success: true,
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
}

// 创建用户
export async function createUser(userData: Omit<User, 'id' | 'createdAt'>) {
  const users = getAllUsers();
  
  // 检查用户名是否已存在
  if (users.some(user => user.username === userData.username)) {
    return { success: false, message: '用户名已存在' };
  }
  
  // 检查邮箱是否已存在
  if (users.some(user => user.email === userData.email)) {
    return { success: false, message: '邮箱已被使用' };
  }
  
  const newUser: User = {
    ...userData,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return { 
    success: true, 
    message: '用户创建成功',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  };
}

// 验证token
export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: '无效的token' };
  }
}

// 添加编辑历史记录
export function addEditHistory(
  userId: string, 
  username: string, 
  action: string, 
  section: string, 
  details: any
) {
  ensureDataDirectoryExists();
  
  let history = [];
  
  // 读取现有历史记录
  if (fs.existsSync(HISTORY_FILE_PATH)) {
    try {
      const data = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
      history = JSON.parse(data);
    } catch (error) {
      console.error('读取历史记录失败:', error);
    }
  }
  
  // 添加新记录
  const newRecord = {
    id: uuidv4(),
    userId,
    username,
    timestamp: new Date().toISOString(),
    action,
    section,
    details: JSON.stringify(details)
  };
  
  history.push(newRecord);
  
  // 保存历史记录
  fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));
  
  return newRecord;
}

// 获取所有编辑历史
export function getAllEditHistory() {
  ensureDataDirectoryExists();
  
  if (!fs.existsSync(HISTORY_FILE_PATH)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
}

// 获取特定用户的编辑历史
export function getUserEditHistory(userId: string): EditHistory[] {
  const history = getAllEditHistory();
  return history.filter((record: EditHistory) => record.userId === userId);
}

// 验证用户凭证
export function verifyCredentials(username: string, password: string): User | null {
  const users = getAllUsers();
  console.log(`尝试验证用户: ${username}`);
  
  const user = users.find(user => user.username === username);
  
  if (!user) {
    console.log(`找不到用户: ${username}`);
    return null;
  }
  
  // 使用bcryptjs的同步验证
  try {
    console.log(`开始验证密码...`);
    const isValid = bcrypt.compareSync(password, user.password);
    console.log(`密码验证结果: ${isValid ? '有效' : '无效'}`);
    
    if (!isValid) {
      return null;
    }
    
    // 更新最后登录时间
    updateLastLoginTime(user.id);
    
    return user;
  } catch (error) {
    console.error('验证密码失败:', error);
    return null;
  }
}

// 辅助函数：更新用户的最后登录时间
function updateLastLoginTime(userId: string): void {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    saveUsers(users);
  }
}

// 生成JWT令牌
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role 
    }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
} 