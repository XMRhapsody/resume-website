import { NextRequest, NextResponse } from 'next/server';
import { createUser, verifyToken } from '@/lib/auth';
import { hashPassword } from '@/data/defaultUsers';
import { UserRole } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    // 检查认证
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }
    
    // 验证token
    const verification = verifyToken(authToken);
    if (!verification.success) {
      return NextResponse.json(
        { error: '会话已过期，请重新登录' },
        { status: 401 }
      );
    }
    
    // 检查是否为管理员
    const user = verification.user as any;
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: '只有管理员可以创建新用户' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { username, password, email, role } = body;
    
    // 验证必填字段
    if (!username || !password || !email || !role) {
      return NextResponse.json(
        { error: '所有字段都是必填的' },
        { status: 400 }
      );
    }
    
    // 验证角色是否有效
    if (![UserRole.ADMIN, UserRole.USER].includes(role)) {
      return NextResponse.json(
        { error: '无效的用户角色' },
        { status: 400 }
      );
    }
    
    // 密码加密
    const hashedPassword = await hashPassword(password);
    
    // 创建用户
    const result = await createUser({
      username,
      password: hashedPassword,
      email,
      role
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('用户注册失败:', error);
    return NextResponse.json(
      { error: '创建用户过程中出现错误' },
      { status: 500 }
    );
  }
} 