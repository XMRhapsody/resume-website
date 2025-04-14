'use client';

import LoginForm from '@/components/LoginForm';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (role: string) => {
    console.log('登录页面接收到登录成功回调，用户角色:', role);
    
    // 使用多种方式确保跳转成功
    try {
      // 根据用户角色决定跳转目标
      const targetPath = role === 'admin' ? '/admin' : '/edit';
      
      // 尝试使用router
      router.push(targetPath);
      router.refresh();
      
      // 延迟后再用window.location作为备份
      setTimeout(() => {
        console.log('备份跳转触发');
        window.location.href = targetPath;
      }, 500);
    } catch (err) {
      console.error('路由跳转失败，使用window.location:', err);
      const targetPath = role === 'admin' ? '/admin' : '/edit';
      window.location.href = targetPath;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
} 