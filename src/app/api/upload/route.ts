import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync, promises as fsPromises } from 'fs';

// 确保目录存在
function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    try {
      mkdirSync(dirPath, { recursive: true });
      // 设置目录权限为777(全权限)
      fsPromises.chmod(dirPath, 0o777).catch(err => {
        console.error(`无法设置目录 ${dirPath} 的权限:`, err);
      });
    } catch (error) {
      console.error(`创建目录失败 ${dirPath}:`, error);
      throw error;
    }
  }
}

// 验证文件是图片
function isImageFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext);
}

// 配置
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    console.log('开始处理图片上传请求');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('上传失败: 没有提供文件');
      return NextResponse.json(
        { error: '没有提供文件' },
        { status: 400 }
      );
    }
    
    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      console.error(`上传失败: 文件过大 (${file.size} bytes)`);
      return NextResponse.json(
        { error: `文件过大，最大允许 ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    
    // 验证文件类型
    if (!isImageFile(file.name)) {
      console.error(`上传失败: 不支持的文件类型 (${file.name})`);
      return NextResponse.json(
        { error: '只支持图片文件 (jpg, jpeg, png, gif, webp, svg, bmp)' },
        { status: 400 }
      );
    }
    
    // 读取文件内容
    console.log(`读取文件: ${file.name}, 大小: ${file.size} bytes`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 文件存储路径（在公共目录中）
    const uploadDir = path.join(process.cwd(), 'public', 'gallery');
    console.log(`上传目录: ${uploadDir}`);
    
    // 确保目录存在并有正确权限
    ensureDirectoryExists(uploadDir);
    
    // 生成唯一文件名（使用原始文件名和时间戳）
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/\s/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    
    console.log(`正在保存文件到: ${filePath}`);
    
    try {
      // 写入文件
      await writeFile(filePath, buffer);
      
      // 设置文件权限为所有人可读写
      await fsPromises.chmod(filePath, 0o666);
      
      console.log(`文件上传成功: ${fileName}`);
      
      // 返回上传成功的响应，包含文件URL
      return NextResponse.json({ 
        success: true, 
        fileName: fileName,
        url: `/gallery/${fileName}`,
        size: file.size
      });
    } catch (writeError) {
      console.error(`写入文件失败: ${filePath}:`, writeError);
      throw writeError;
    }
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: '文件上传失败', details: (error as Error).message },
      { status: 500 }
    );
  }
} 