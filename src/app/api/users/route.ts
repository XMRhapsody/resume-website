import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAllUsers } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 从Cookie获取认证令牌
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }
    
    // 验证令牌
    const verification = verifyToken(authToken);
    
    if (!verification.success) {
      return NextResponse.json(
        { error: '会话已过期，请重新登录' },
        { status: 401 }
      );
    }
    
    // 检查是否为管理员
    const user = verification.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '只有管理员可以查看用户列表' },
        { status: 403 }
      );
    }
    
    // 获取所有用户
    const users = getAllUsers().map(user => {
      // 不返回密码
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return NextResponse.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表时出现错误' },
      { status: 500 }
    );
  }
} 