import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // 创建成功响应
    const response = NextResponse.json({
      success: true,
      message: '已成功登出'
    });
    
    // 清除认证cookie
    response.cookies.set({
      name: 'auth_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 立即使Cookie过期
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { error: '登出过程中出现错误' },
      { status: 500 }
    );
  }
} 