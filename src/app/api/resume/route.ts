import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { defaultResumeData } from '@/data/defaultResumeData';
import { ResumeData } from '@/types/resume';
import { verifyToken } from '@/lib/auth';

const dataFilePath = path.join(process.cwd(), 'data', 'resume-data.json');

// 确保数据目录存在
const ensureDirectoryExists = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// 验证用户认证
const verifyAuthentication = (request: NextRequest) => {
  // 从Cookie获取认证令牌
  const authToken = request.cookies.get('auth_token')?.value;
  
  if (!authToken) {
    return { success: false, message: '未授权，请先登录' };
  }
  
  // 验证令牌
  const verification = verifyToken(authToken);
  
  if (!verification.success) {
    return { success: false, message: '会话已过期，请重新登录' };
  }
  
  return { success: true, user: verification.user };
};

// 获取当前简历数据
const getCurrentResumeData = (): ResumeData => {
  ensureDirectoryExists();
  
  if (!fs.existsSync(dataFilePath)) {
    // 如果文件不存在，创建默认数据文件
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultResumeData, null, 2), 'utf8');
    return defaultResumeData;
  }
  
  const data = fs.readFileSync(dataFilePath, 'utf8');
  return JSON.parse(data) as ResumeData;
};

// 保存简历数据
const saveResumeData = (data: ResumeData): void => {
  ensureDirectoryExists();
  
  try {
    // 如果文件已存在，先创建备份
    if (fs.existsSync(dataFilePath)) {
      const backupPath = `${dataFilePath}.bak`;
      fs.copyFileSync(dataFilePath, backupPath);
    }
    
    // 先写入临时文件
    const tempFilePath = `${dataFilePath}.tmp`;
    fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2), 'utf8');
    
    // 确认临时文件写入成功后，重命名为正式文件
    fs.renameSync(tempFilePath, dataFilePath);
    
    console.log('简历数据保存成功');
  } catch (error) {
    console.error('保存简历数据时出错:', error);
    
    // 如果存在备份，尝试恢复
    const backupPath = `${dataFilePath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, dataFilePath);
        console.log('从备份恢复了数据文件');
      } catch (restoreError) {
        console.error('恢复备份失败:', restoreError);
      }
    }
    
    throw error;
  }
};

// 获取简历数据 - 允许未登录用户访问，但功能可以在前端限制
export async function GET(request: NextRequest) {
  try {
    const resumeData = getCurrentResumeData();
    return NextResponse.json(resumeData);
  } catch (error) {
    console.error('Error reading resume data:', error);
    return NextResponse.json(
      { error: '获取简历数据失败' },
      { status: 500 }
    );
  }
}

// 保存完整简历数据 - 需要登录
export async function POST(request: NextRequest) {
  // 验证用户认证
  const auth = verifyAuthentication(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.message },
      { status: 401 }
    );
  }
  
  try {
    const resumeData = await request.json();
    saveResumeData(resumeData);
    
    // 添加用户信息到响应中
    return NextResponse.json({ 
      success: true,
      message: '简历数据已保存',
      username: (auth.user as any).username
    });
  } catch (error) {
    console.error('Error saving resume data:', error);
    return NextResponse.json(
      { error: '保存简历数据失败' },
      { status: 500 }
    );
  }
}

// 部分更新简历数据 - 需要登录
export async function PATCH(request: NextRequest) {
  // 验证用户认证
  const auth = verifyAuthentication(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.message },
      { status: 401 }
    );
  }
  
  try {
    const update = await request.json();
    const { path, value } = update;
    
    if (!path || value === undefined) {
      return NextResponse.json(
        { error: '缺少path或value参数' },
        { status: 400 }
      );
    }
    
    // 获取当前数据
    const currentData = getCurrentResumeData();
    
    // 使用路径更新嵌套属性
    const pathParts = Array.isArray(path) ? path : path.split('.');
    // 使用any类型以处理动态属性访问
    let target: any = currentData;
    
    // 遍历路径，除了最后一个部分
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      
      // 处理数组索引
      if (part.includes('[') && part.includes(']')) {
        const arrayName = part.split('[')[0];
        const index = parseInt(part.split('[')[1].split(']')[0]);
        
        if (!target[arrayName]) {
          target[arrayName] = [];
        }
        
        if (!target[arrayName][index]) {
          target[arrayName][index] = {};
        }
        
        target = target[arrayName][index];
      } else {
        if (!target[part]) {
          target[part] = {};
        }
        target = target[part];
      }
    }
    
    // 设置最后一部分的值
    const lastPart = pathParts[pathParts.length - 1];
    
    // 处理数组索引
    if (lastPart.includes('[') && lastPart.includes(']')) {
      const arrayName = lastPart.split('[')[0];
      const index = parseInt(lastPart.split('[')[1].split(']')[0]);
      
      if (!target[arrayName]) {
        target[arrayName] = [];
      }
      
      target[arrayName][index] = value;
    } else {
      target[lastPart] = value;
    }
    
    // 保存更新后的数据
    saveResumeData(currentData as ResumeData);
    
    // 记录更新内容
    console.log(`Updated ${path} to:`, value);
    
    return NextResponse.json({ 
      success: true,
      updatedPath: path,
      updatedValue: value,
      username: (auth.user as any).username
    });
  } catch (error) {
    console.error('Error updating resume data:', error);
    return NextResponse.json(
      { error: '更新简历数据失败' },
      { status: 500 }
    );
  }
} 