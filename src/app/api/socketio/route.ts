import { Server as NetServer } from 'http';
import { NextRequest } from 'next/server';
import { Server as ServerIO } from 'socket.io';
import { ResumeData } from '@/types/resume';

// 维护活跃编辑者列表
interface EditorState {
  userId: string;
  username: string;
  activeTab: string;
  timestamp: number;
}

// 部分更新的格式
interface PartialUpdate {
  path: string;
  value: any;
  timestamp: number;
}

let activeEditors: EditorState[] = [];

// 全局Socket.io实例
let io: ServerIO;

export async function GET(req: NextRequest) {
  try {
    if (io) {
      // 如果已经有Socket.io实例，直接返回
      console.log('Socket.io服务器已存在');
      return new Response('Socket已连接', { status: 200 });
    }

    // 获取响应对象
    const res = new Response();
    
    // 获取原始Node HTTP服务器
    // @ts-ignore - Next.js内部API，没有正确的类型声明
    const httpServer: NetServer = res.socket?.server;

    if (!httpServer) {
      console.error('无法获取HTTP服务器实例');
      return new Response('无法启动Socket.io服务器', { status: 500 });
    }

    // 创建Socket.io服务器
    io = new ServerIO(httpServer, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    console.log('Socket.io服务器初始化成功');

    // 处理客户端连接
    io.on('connection', (socket) => {
      console.log('客户端连接成功:', socket.id);
      
      // 向新连接的客户端发送当前活跃编辑者列表
      socket.emit('activeEditors', activeEditors);

      // 处理完整简历数据更新
      socket.on('resumeUpdate', (data: ResumeData) => {
        console.log('收到完整简历更新, 广播给其他客户端, 来自:', socket.id);
        
        try {
          // 广播给所有其他客户端，但不包括发送者
          socket.broadcast.emit('resumeUpdate', data);
          
          // 确认接收到数据
          socket.emit('resumeUpdateAck', { success: true, timestamp: Date.now() });
        } catch (error) {
          console.error('广播数据时出错:', error);
          socket.emit('resumeUpdateAck', { success: false, error: '广播失败' });
        }
      });
      
      // 处理部分简历数据更新
      socket.on('partialUpdate', (update: PartialUpdate) => {
        console.log(`收到部分更新: ${update.path}, 广播给其他客户端, 来自:`, socket.id);
        
        try {
          // 广播给所有其他客户端，但不包括发送者
          socket.broadcast.emit('partialUpdate', update);
          
          // 确认接收到数据
          socket.emit('partialUpdateAck', { 
            success: true, 
            timestamp: Date.now(),
            path: update.path
          });
        } catch (error) {
          console.error('广播部分更新时出错:', error);
          socket.emit('partialUpdateAck', { 
            success: false, 
            error: '广播失败',
            path: update.path
          });
        }
      });
      
      // 处理请求完整数据的请求
      socket.on('requestFullData', () => {
        console.log('收到请求完整数据的请求, 来自:', socket.id);
        // 通知所有客户端有人请求完整数据
        io.emit('fullDataRequested', { 
          requesterId: socket.id,
          timestamp: Date.now()
        });
      });

      // 处理编辑状态更新
      socket.on('editorState', (editorState: EditorState) => {
        try {
          // 更新或添加编辑者状态
          const existingIndex = activeEditors.findIndex(
            (editor) => editor.userId === editorState.userId
          );
          
          if (existingIndex >= 0) {
            activeEditors[existingIndex] = editorState;
            console.log('更新编辑者状态:', editorState.username);
          } else {
            activeEditors.push(editorState);
            console.log('添加新编辑者:', editorState.username);
          }
          
          // 清理超过5分钟的不活跃编辑者
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          const beforeLength = activeEditors.length;
          activeEditors = activeEditors.filter(
            (editor) => editor.timestamp > fiveMinutesAgo
          );
          
          if (beforeLength !== activeEditors.length) {
            console.log('清理不活跃编辑者, 从', beforeLength, '到', activeEditors.length);
          }
          
          // 广播更新后的编辑者列表
          io.emit('activeEditors', activeEditors);
        } catch (error) {
          console.error('处理编辑状态时出错:', error);
        }
      });

      // 响应ping消息
      socket.on('pong', (data) => {
        console.log(`收到客户端${socket.id}的pong响应:`, new Date(data.timestamp).toLocaleTimeString());
      });

      // 处理客户端心跳
      socket.on('heartbeat', (data) => {
        console.log(`收到客户端${socket.id}的心跳:`, new Date(data.timestamp).toLocaleTimeString());
        socket.emit('heartbeat_ack', { timestamp: Date.now() });
      });

      // 定期ping客户端以保持连接
      const pingInterval = setInterval(() => {
        socket.emit('ping', { timestamp: Date.now() });
      }, 30000);

      // 处理客户端断开连接
      socket.on('disconnect', (reason) => {
        console.log('客户端断开连接:', socket.id, '原因:', reason);
        clearInterval(pingInterval);
        
        // 移除断开连接的编辑者
        const userId = activeEditors.find(editor => 
          editor.userId.includes(socket.id.substring(0, 4)))?.userId;
          
        if (userId) {
          activeEditors = activeEditors.filter(editor => editor.userId !== userId);
          console.log('移除断开连接的编辑者:', userId);
          // 广播更新后的编辑者列表
          io.emit('activeEditors', activeEditors);
        }
      });
    });

    return new Response('Socket.io服务器初始化成功', { status: 200 });
  } catch (error) {
    console.error('Socket.io初始化失败:', error);
    return new Response('Socket.io服务器初始化失败: ' + (error instanceof Error ? error.message : String(error)), { status: 500 });
  }
} 