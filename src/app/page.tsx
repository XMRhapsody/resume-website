'use client';

import Link from 'next/link'
import { Inter } from 'next/font/google'
import ResumeView from '@/components/ResumeView'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ResumeData } from '@/types/resume'
import { defaultResumeData } from '@/data/defaultResumeData'
import { 
  initSocket, 
  subscribeToResumeUpdates,
  subscribeToPartialUpdates,
  disconnectSocket 
} from '@/lib/socketio';

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isNewUpdate, setIsNewUpdate] = useState(false) // 用于显示更新提示
  // 引用最后一次变更位置，用于高亮显示
  const lastUpdatedPath = useRef<string | null>(null);

  // 处理远程完整更新
  const handleRemoteUpdate = useCallback((data: ResumeData) => {
    console.log('主页收到完整简历数据更新');
    setResumeData(data);
    setLastUpdateTime(new Date());
    // 显示更新提示
    setIsNewUpdate(true);
    // 清空最后更新路径
    lastUpdatedPath.current = null;
    setTimeout(() => {
      setIsNewUpdate(false);
    }, 3000);
  }, []);

  // 处理部分更新
  const handlePartialUpdate = useCallback((path: string, value: any) => {
    console.log(`主页收到部分更新: ${path}`);
    setResumeData((prevData) => {
      if (!prevData) return prevData;
      
      // 创建深拷贝以避免直接修改状态
      const newData = JSON.parse(JSON.stringify(prevData));
      
      // 使用路径更新嵌套属性
      const pathParts = path.split('.');
      let target: any = newData;
      
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
      
      // 记录最后更新的路径
      lastUpdatedPath.current = path;
      
      return newData;
    });
    
    setLastUpdateTime(new Date());
    
    // 显示更新提示
    setIsNewUpdate(true);
    setTimeout(() => {
      setIsNewUpdate(false);
    }, 3000);
  }, []);

  // 从服务器获取完整数据
  const fetchResumeData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/resume');
      
      if (!response.ok) {
        throw new Error('获取简历数据失败');
      }
      
      const data = await response.json();
      setResumeData(data);
      setLastUpdateTime(new Date());
      setError(null);
    } catch (err) {
      console.error('获取简历数据出错:', err);
      setError('无法加载简历数据，请稍后再试');
      // 加载失败时使用默认数据
      setResumeData(defaultResumeData);
    } finally {
      setLoading(false);
    }
  }, []);

  // 页面初始加载数据
  useEffect(() => {
    fetchResumeData();
  }, [fetchResumeData]);

  // 初始化Socket.io连接
  useEffect(() => {
    if (resumeData) {
      // 初始化Socket.io
      const socket = initSocket();
      
      // 订阅完整简历数据更新
      subscribeToResumeUpdates(handleRemoteUpdate);
      
      // 订阅部分简历数据更新
      subscribeToPartialUpdates(handlePartialUpdate);
      
      // 接收ping消息以保持连接
      socket.on('ping', (data) => {
        console.log('收到服务器ping:', new Date(data.timestamp).toLocaleTimeString());
        // 回复pong以确认连接
        socket.emit('pong', { timestamp: Date.now() });
      });
      
      return () => {
        disconnectSocket();
      };
    }
  }, [resumeData, handleRemoteUpdate, handlePartialUpdate]);

  if (loading) return <div className="p-6 text-center">加载中...</div>
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
        <p>已加载默认数据</p>
      </div>
    )
  }

  if (!resumeData) return <div className="p-6 text-center">未找到简历数据</div>

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{resumeData.personalInfo.name}的个人简历</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {lastUpdateTime && (
                  <p className="text-sm text-gray-500">
                    上次更新: {lastUpdateTime.toLocaleTimeString()}
                  </p>
                )}
                {isNewUpdate && (
                  <span className="animate-pulse text-sm text-green-600 font-medium">
                    ● 内容已更新
                  </span>
                )}
              </div>
            </div>
            <Link 
              href="/edit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              编辑简历
            </Link>
          </div>
          <ResumeView data={resumeData} lastUpdatedPath={lastUpdatedPath.current} />
        </div>
      </div>
    </main>
  )
}
