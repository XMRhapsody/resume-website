import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, saveUsers } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 这是一个临时API，用于重置管理员密码
// 实际生产环境应该移除此API或增加安全限制
export async function GET(request: NextRequest) {
  try {
    // 获取所有用户
    const users = getAllUsers();
    
    // 寻找admin用户
    const adminIndex = users.findIndex(user => user.username === 'admin');
    
    if (adminIndex === -1) {
      return NextResponse.json(
        { error: '找不到管理员用户' },
        { status: 404 }
      );
    }
    
    // 生成新的密码哈希
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash('admin123', saltRounds);
    
    // 更新管理员密码
    users[adminIndex].password = newPasswordHash;
    
    // 保存更新后的用户数据
    saveUsers(users);
    
    return NextResponse.json({
      success: true,
      message: '管理员密码已重置为"admin123"'
    });
  } catch (error) {
    console.error('重置管理员密码失败:', error);
    return NextResponse.json(
      { error: '重置管理员密码时出现错误' },
      { status: 500 }
    );
  }
} 