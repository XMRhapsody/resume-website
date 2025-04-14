'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/auth';

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录并是否为管理员
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // 确保发送cookie
          credentials: 'include'
        });

        if (!response.ok) {
          // 未登录或令牌无效，重定向到登录页
          router.push('/login');
          return;
        }

        const data = await response.json();
        
        if (data.user && data.user.role === 'admin') {
          setUser(data.user);
        } else {
          // 不是管理员，重定向到首页
          setError('您没有访问管理页面的权限');
          setTimeout(() => {
            router.push('/');
          }, 3000);
        }
      } catch (err) {
        console.error('认证检查失败:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'  // 确保发送cookie
      });
      
      // 重定向到登录页
      router.push('/login');
    } catch (err) {
      console.error('登出失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  if (!user) {
    return null; // 会被路由中间件重定向
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">管理控制台</h1>
        <div className="flex items-center space-x-4">
          <span>欢迎，{user.username}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            登出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">简历编辑</h2>
          <p className="text-gray-600 mb-4">修改您的简历内容</p>
          <button
            onClick={() => router.push('/edit')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            前往编辑
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">用户管理</h2>
          <p className="text-gray-600 mb-4">管理网站用户和权限</p>
          <button
            onClick={() => router.push('/admin/users')}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            管理用户
          </button>
        </div>
      </div>
    </div>
  );
} 