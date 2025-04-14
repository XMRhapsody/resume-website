import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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
    
    // 返回用户信息（不包含敏感数据）
    return NextResponse.json({
      success: true,
      user: verification.user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息时出现错误' },
      { status: 500 }
    );
  }
} 