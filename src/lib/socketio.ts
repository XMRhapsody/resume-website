import { io, Socket } from 'socket.io-client';
import { ResumeData } from '@/types/resume';
import { EventEmitter } from 'events';

// Socket.io客户端实例
let socket: Socket | MockSocket;
const isDev = process.env.NODE_ENV === 'development';

// 创建一个模拟的Socket类，用于开发环境
class MockSocket extends EventEmitter {
  id = 'mock-socket-id';
  connected = true;

  constructor() {
    super();
    console.log('[开发环境] 使用模拟Socket实例');
  }

  connect() {
    console.log('[开发环境] 模拟Socket连接');
    this.connected = true;
    this.emit('connect');
    return this;
  }

  disconnect() {
    console.log('[开发环境] 模拟Socket断开连接');
    this.connected = false;
    this.emit('disconnect', 'io client disconnect');
    return this;
  }

  // 重写emit方法，打印出事件但不实际发送
  emit(event: string, ...args: any[]): boolean {
    console.log(`[开发环境] 模拟Socket发送事件: ${event}`, args[0] ? new Date().toLocaleTimeString() : '');
    return true;
  }

  // 其他必要的方法
  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  off(event: string): this {
    super.removeAllListeners(event);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    super.once(event, listener);
    return this;
  }
}

// 初始化Socket.io连接
export const initSocket = (): Socket | MockSocket => {
  if (!socket) {
    // 在开发环境中使用模拟Socket
    if (isDev) {
      socket = new MockSocket();
      return socket;
    }
    
    // 生产环境使用真实Socket.io连接
    socket = io({
      path: '/api/socketio',
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnection: true,
      timeout: 30000,
      transports: ['websocket', 'polling'], // 确保Safari兼容性
      forceNew: false,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('Socket.io连接成功, id:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.io连接失败:', err);
      
      // 连接失败后尝试重新连接
      setTimeout(() => {
        console.log('尝试重新连接Socket.io...');
        socket.connect();
      }, 2000);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io断开连接:', reason);
      
      // 自动尝试重新连接
      setTimeout(() => {
        console.log('尝试重新连接Socket.io...');
        socket.connect();
      }, 1000);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket.io重新连接成功, 尝试次数:', attemptNumber);
    });
    
    // 接收服务器的心跳确认
    socket.on('heartbeat_ack', (data) => {
      console.log('收到服务器心跳确认:', new Date(data.timestamp).toLocaleTimeString());
    });
    
    // 接收服务器的ping
    socket.on('ping', (data) => {
      console.log('收到服务器ping:', new Date(data.timestamp).toLocaleTimeString());
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // 定期发送心跳以保持连接活跃，特别是对Safari浏览器
    setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: Date.now() });
      } else {
        console.log('Socket未连接，尝试重新连接...');
        socket.connect();
      }
    }, 10000); // 心跳间隔时间
  }
  return socket;
};

// 获取Socket.io实例
export const getSocket = (): Socket | MockSocket => {
  if (!socket || !socket.connected) {
    return initSocket();
  }
  return socket;
};

// 监听完整简历数据更新
export const subscribeToResumeUpdates = (callback: (data: ResumeData) => void): void => {
  const socket = getSocket();
  
  // 移除现有监听器以避免重复
  socket.off('resumeUpdate');
  
  // 添加新的监听器
  socket.on('resumeUpdate', (data: ResumeData) => {
    console.log('收到完整简历数据更新:', new Date().toLocaleTimeString());
    callback(data);
  });
  
  // 在开发环境中，模拟收到数据
  if (isDev) {
    // 不执行任何操作，开发环境中不模拟数据接收
  }
};

// 部分更新的格式
export interface PartialUpdate {
  path: string;
  value: any;
  timestamp: number;
}

// 监听部分简历数据更新
export const subscribeToPartialUpdates = (
  updateCallback: (path: string, value: any) => void
): void => {
  const socket = getSocket();
  
  // 移除现有监听器以避免重复
  socket.off('partialUpdate');
  
  // 添加新的监听器
  socket.on('partialUpdate', (update: PartialUpdate) => {
    console.log(`收到部分更新: ${update.path}`, new Date(update.timestamp).toLocaleTimeString());
    updateCallback(update.path, update.value);
  });
  
  // 在开发环境中，不模拟数据接收
};

// 发送完整简历数据更新
export const emitResumeUpdate = (data: ResumeData): void => {
  const socket = getSocket();
  
  if (socket.connected) {
    if (isDev) {
      console.log('[开发环境] 模拟发送完整简历数据更新:', new Date().toLocaleTimeString());
    } else {
      console.log('发送完整简历数据更新:', new Date().toLocaleTimeString());
      socket.emit('resumeUpdate', data);
    }
  } else {
    console.warn('Socket未连接，无法发送数据更新');
  }
};

// 发送部分简历数据更新
export const emitPartialUpdate = (path: string, value: any): void => {
  const socket = getSocket();
  
  if (socket.connected) {
    const update: PartialUpdate = {
      path,
      value,
      timestamp: Date.now()
    };
    
    if (isDev) {
      console.log(`[开发环境] 模拟发送部分更新: ${path}`, new Date().toLocaleTimeString());
    } else {
      console.log(`发送部分更新: ${path}`, new Date().toLocaleTimeString());
      socket.emit('partialUpdate', update);
    }
  } else {
    console.warn('Socket未连接，无法发送部分更新');
  }
};

// 用于传递编辑状态的接口
export interface EditorState {
  userId: string;
  username: string;
  activeTab: string;
  timestamp: number;
}

// 当前活跃的编辑者列表
export const subscribeToActiveEditors = (callback: (editors: EditorState[]) => void): void => {
  const socket = getSocket();
  
  // 移除现有监听器以避免重复
  socket.off('activeEditors');
  
  // 添加新的监听器
  socket.on('activeEditors', (editors: EditorState[]) => {
    console.log('收到活跃编辑者列表更新:', editors.length);
    callback(editors);
  });
  
  // 在开发环境中，模拟一个空的编辑者列表
  if (isDev) {
    setTimeout(() => {
      callback([]);
    }, 500);
  }
};

// 发送当前编辑状态
export const emitEditorState = (state: EditorState): void => {
  const socket = getSocket();
  
  if (socket.connected) {
    if (isDev) {
      console.log('[开发环境] 模拟发送编辑状态:', state.activeTab);
    } else {
      socket.emit('editorState', state);
    }
  } else {
    console.warn('Socket未连接，无法发送编辑状态');
  }
};

// 清理连接
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
  }
}; 