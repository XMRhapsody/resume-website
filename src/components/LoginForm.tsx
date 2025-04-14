'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/auth';

interface LoginFormProps {
  onSuccess?: (role: string) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  // 当登录成功时，根据用户角色进行跳转
  useEffect(() => {
    if (loginSuccess && userRole) {
      console.log(`登录成功，用户角色: ${userRole}，准备跳转...`);
      
      // 使用setTimeout确保React状态更新后再执行导航
      const redirectTimer = setTimeout(() => {
        if (onSuccess) {
          console.log('调用onSuccess回调，传递用户角色...');
          onSuccess(userRole);
        } else {
          console.log('根据用户角色直接跳转...');
          // 根据用户角色决定跳转目标
          if (userRole === 'admin') {
            console.log('管理员用户，跳转到/admin');
            window.location.href = '/admin';
          } else {
            console.log('普通用户，跳转到/edit');
            window.location.href = '/edit';
          }
        }
      }, 1000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [loginSuccess, userRole, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('用户名和密码都是必填项');
      return;
    }
    
    setLoading(true);
    setError('');
    setDebugInfo('开始登录请求...');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include' // 确保包含cookie
      });
      
      const data = await response.json();
      setDebugInfo(prev => `${prev}\n收到响应: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }
      
      // 记录用户角色并标记登录成功
      if (data.user && data.user.role) {
        setUserRole(data.user.role);
        setDebugInfo(prev => `${prev}\n用户角色: ${data.user.role}`);
      } else {
        console.error('响应中缺少用户角色信息');
        setDebugInfo(prev => `${prev}\n警告: 响应中缺少用户角色信息`);
      }
      
      // 标记登录成功，触发useEffect中的重定向
      setDebugInfo(prev => `${prev}\n登录成功，设置登录成功状态`);
      setLoginSuccess(true);
    } catch (err: any) {
      setError(err.message || '登录过程中出现错误');
      setDebugInfo(prev => `${prev}\n错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">管理员登录</h2>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}
      
      {loginSuccess && (
        <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
          登录成功！正在跳转...
          {userRole === 'admin' ? '（管理员控制台）' : '（编辑页面）'}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">
            用户名
          </label>
          <input
            type="text"
            id="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
            密码
          </label>
          <input
            type="password"
            id="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          disabled={loading || loginSuccess}
        >
          {loading ? '登录中...' : loginSuccess ? '登录成功！' : '登录'}
        </button>
      </form>
      
      {debugInfo && (
        <div className="mt-6 p-3 bg-gray-100 rounded-lg text-xs font-mono whitespace-pre-line">
          <p className="font-bold mb-2">调试信息:</p>
          {debugInfo}
        </div>
      )}
    </div>
  );
} 