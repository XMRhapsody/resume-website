import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readdirSync, unlinkSync, statSync } from 'fs';

// 获取gallery目录中的所有图片
export async function GET() {
  try {
    const galleryDir = path.join(process.cwd(), 'public', 'gallery');
    
    // 检查目录是否存在，如果不存在则创建
    if (!fs.existsSync(galleryDir)) {
      fs.mkdirSync(galleryDir, { recursive: true });
      return NextResponse.json({ images: [] });
    }
    
    // 读取目录中的所有文件
    const files = readdirSync(galleryDir);
    
    // 过滤出图片文件并转换为URL
    const imageFiles = files
      .filter(file => {
        // 检查文件扩展名是否为图片格式
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext);
      })
      .map(fileName => {
        const filePath = path.join(galleryDir, fileName);
        const stats = statSync(filePath);
        
        return {
          fileName,
          url: `/gallery/${fileName}`,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString()
        };
      })
      // 按上传时间降序排序，最新的在前面
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    return NextResponse.json({ images: imageFiles });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    return NextResponse.json(
      { error: '获取图片列表失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 删除指定图片
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { error: '未指定要删除的文件名' },
        { status: 400 }
      );
    }
    
    // 确保文件名安全，防止目录遍历攻击
    const safeName = path.basename(fileName);
    const filePath = path.join(process.cwd(), 'public', 'gallery', safeName);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      // 文件不存在也返回成功，因为目标是删除文件，而文件已经不存在了
      console.log(`文件不存在，但仍然返回成功: ${safeName}`);
      return NextResponse.json({ 
        success: true, 
        message: '文件已不存在',
        notFound: true
      });
    }
    
    // 删除文件
    unlinkSync(filePath);
    
    return NextResponse.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    console.error('删除图片失败:', error);
    return NextResponse.json(
      { error: '删除图片失败', details: (error as Error).message },
      { status: 500 }
    );
  }
} 