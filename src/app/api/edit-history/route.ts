import { NextRequest, NextResponse } from 'next/server';
import { getAllEditHistory, getUserEditHistory, verifyToken } from '@/lib/auth';
import { UserRole } from '@/types/auth';

export async function GET(request: NextRequest) {
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
    
    const user = verification.user as any;
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // 如果是管理员可以查看所有历史
    // 如果是普通用户只能查看自己的历史
    let history;
    
    if (user.role === UserRole.ADMIN) {
      if (userId) {
        // 管理员查看特定用户的历史
        history = getUserEditHistory(userId);
      } else {
        // 管理员查看所有历史
        history = getAllEditHistory();
      }
    } else {
      // 普通用户只能查看自己的历史
      history = getUserEditHistory(user.id);
    }
    
    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('获取编辑历史失败:', error);
    return NextResponse.json(
      { error: '获取编辑历史过程中出现错误' },
      { status: 500 }
    );
  }
} 