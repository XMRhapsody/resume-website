'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResumeData, GalleryImage } from '@/types/resume';
import { defaultResumeData } from '@/data/defaultResumeData';
import Link from 'next/link';
import { 
  initSocket, 
  subscribeToResumeUpdates, 
  subscribeToPartialUpdates,
  emitResumeUpdate,
  emitPartialUpdate,
  subscribeToActiveEditors,
  emitEditorState,
  EditorState,
  disconnectSocket
} from '@/lib/socketio';
import FileUploader from '@/components/FileUploader';

export default function EditResume() {
  const router = useRouter();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [activeTab, setActiveTab] = useState('personalInfo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [activeEditors, setActiveEditors] = useState<EditorState[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  
  // 定义标签页
  const tabs = [
    { id: 'personalInfo', name: '基本信息' },
    { id: 'workExperience', name: '工作经历' },
    { id: 'education', name: '教育经历' },
    { id: 'relationships', name: '感情经历' },
    { id: 'personalExperience', name: '个人经历' },
    { id: 'gallery', name: '照片墙' }
  ];
  
  // 在组件挂载时检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include' // 确保发送cookie
        });
        
        if (!response.ok) {
          // 未登录或令牌无效，重定向到登录页
          console.log('认证失败，重定向到登录页...');
          setTimeout(() => {
            router.push('/login');
          }, 1000);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
          console.log('用户已认证: ', data.user.username);
          setUsername(data.user.username);
          setUserId(data.user.id);
          setAuthorized(true);
        } else {
          console.log('用户认证数据无效');
          router.push('/login');
        }
      } catch (err) {
        console.error('认证检查失败:', err);
        router.push('/login');
      } finally {
        setAuthChecking(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  // 用于防抖的定时器引用
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理数据修改，增加Socket.io广播和自动保存功能
  const handleDataChange = useCallback((newData: ResumeData) => {
    // 检查是否由远程更新触发
    const isRemoteUpdate = newData === resumeData;
    if (!isRemoteUpdate) {
      setResumeData(newData);
      
      // 广播更新
      emitResumeUpdate(newData);
      
      // 防抖处理，2秒后自动保存
      setSaveStatus('saving');
      
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      saveTimerRef.current = setTimeout(() => {
        saveToServer(newData);
      }, 2000);
    }
  }, [resumeData]);

  // 用于处理远程数据更新
  const handleRemoteUpdate = useCallback((data: ResumeData) => {
    console.log('收到远程更新的简历数据，正在更新界面');
    setResumeData(data);
    setLastUpdateTime(new Date());
    // 显示远程更新提示
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);
  }, []);

  // 初始化Socket.io连接
  useEffect(() => {
    if (!authorized) return; // 如果未通过认证，不初始化socket
    
    if (!userId) {
      // 生成用户ID
      const newUserId = Math.random().toString(36).substring(2, 10);
      setUserId(newUserId);
    } else if (username) {
      // 初始化Socket.io
      const socket = initSocket();
      
      // 订阅简历数据更新
      subscribeToResumeUpdates(handleRemoteUpdate);
      
      // 订阅活跃编辑者更新
      subscribeToActiveEditors((editors) => {
        // 过滤掉自己
        const otherEditors = editors.filter(editor => editor.userId !== userId);
        setActiveEditors(otherEditors);
      });
      
      // 发送当前编辑状态
      const updateEditorState = () => {
        if (userId && username) {
          emitEditorState({
            userId,
            username,
            activeTab,
            timestamp: Date.now()
          });
        }
      };
      
      // 立即发送一次
      updateEditorState();
      
      // 定期更新编辑状态，更频繁地更新以保持连接活跃
      const interval = setInterval(updateEditorState, 15000);
      
      // Socket.io ping响应
      socket.on('ping', (data) => {
        console.log('收到服务器ping:', new Date(data.timestamp).toLocaleTimeString());
        // 回复pong以确认连接
        socket.emit('pong', { timestamp: Date.now() });
      });
      
      // 接收更新确认
      socket.on('resumeUpdateAck', (data) => {
        if (data.success) {
          console.log('服务器确认收到数据更新');
        } else {
          console.error('服务器拒绝数据更新:', data.error);
          setSaveStatus('error');
        }
      });
      
      return () => {
        clearInterval(interval);
        disconnectSocket();
      };
    }
  }, [userId, username, activeTab, handleRemoteUpdate, authorized]);

  // 保存到服务器
  const saveToServer = async (data: ResumeData) => {
    if (!authorized) {
      console.error('未授权，无法保存数据');
      setSaveStatus('error');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch('/api/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include' // 确保包含认证cookie
      });
      
      if (!response.ok) {
        throw new Error('保存失败');
      }
      
      setSaveStatus('saved');
      setLastUpdateTime(new Date());
      
      // 3秒后将状态重置为idle
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('保存数据失败:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // 组件卸载时保存最新数据
  useEffect(() => {
    return () => {
      // 如果有未保存的更改，立即保存
      if (saveTimerRef.current && resumeData && authorized) {
        clearTimeout(saveTimerRef.current);
        saveToServer(resumeData);
      }
    };
  }, [resumeData, authorized]);

  // 设置用户名 - 不再需要手动设置，从登录信息获取
  const handleSetUsername = (name: string) => {
    if (name.trim()) {
      setUsername(name.trim());
      setShowNameModal(false);
    }
  };

  useEffect(() => {
    // 从服务器加载数据
    const fetchResumeData = async () => {
      if (!authorized) return; // 如果未通过认证，不加载数据
      
      try {
        setLoading(true);
        const response = await fetch('/api/resume', {
          credentials: 'include' // 确保包含认证cookie
        });
        
        if (!response.ok) {
          throw new Error('获取简历数据失败');
        }
        
        const data = await response.json();
        setResumeData(data);
        setLastUpdateTime(new Date());
        setError(null);
      } catch (err) {
        console.error('获取简历数据出错:', err);
        setError('无法加载简历数据，使用默认数据');
        setResumeData(defaultResumeData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResumeData();
  }, [authorized]);

  // 更新个人信息函数
  const updatePersonalInfo = (field: string, value: string) => {
    if (!resumeData) return;
    
    // 构建路径
    const path = `personalInfo.${field}`;
    
    // 更新本地状态
    const newData = {
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        [field]: value
      }
    };
    setResumeData(newData);
    
    // 发送部分更新
    emitPartialUpdate(path, value);
    
    // 防抖处理，2秒后自动保存
    setSaveStatus('saving');
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(() => {
      // 只保存这个字段的更新
      savePartialUpdate(path, value);
    }, 2000);
  };

  // 更新嵌套数组的值
  const updateArrayField = (arrayName: string, index: number, field: string, value: string) => {
    if (!resumeData) return;
    
    // 构建路径
    const path = `${arrayName}[${index}].${field}`;
    
    // 更新本地状态
    const newData = JSON.parse(JSON.stringify(resumeData));
    if (!newData[arrayName][index]) {
      return;
    }
    
    newData[arrayName][index][field] = value;
    setResumeData(newData);
    
    // 发送部分更新
    emitPartialUpdate(path, value);
    
    // 防抖处理，2秒后自动保存
    setSaveStatus('saving');
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(() => {
      // 只保存这个字段的更新
      savePartialUpdate(path, value);
    }, 2000);
  };

  // 保存部分更新到服务器
  const savePartialUpdate = async (path: string, value: any) => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/resume', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, value }),
      });
      
      if (!response.ok) {
        throw new Error('保存失败');
      }
      
      setSaveStatus('saved');
      setLastUpdateTime(new Date());
      
      // 3秒后将状态重置为idle
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('保存数据失败:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // 添加相册图片
  const addGalleryImage = (fileUrl: string, fileName: string) => {
    if (!resumeData) return;
    
    const newImage = {
      id: Date.now().toString(),
      url: fileUrl,
      title: fileName,
      description: ''
    };
    
    const updatedResumeData = {
      ...resumeData,
      galleryImages: [...(resumeData.galleryImages || []), newImage]
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 处理上传错误
  const handleUploadError = (error: string) => {
    setError(`上传失败: ${error}`);
    setTimeout(() => {
      setError(null);
    }, 3000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePersonalInfo('avatar', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 删除数组项
  const deleteArrayItem = async (arrayName: keyof ResumeData, index: number) => {
    if (!resumeData) return;
    
    const array = resumeData[arrayName] as any[];
    if (!array) return;
    
    const updatedArray = [...array];
    updatedArray.splice(index, 1);
    
    const updatedResumeData = {
      ...resumeData,
      [arrayName]: updatedArray
    };
    
    // 如果删除的是图库图片，需要删除服务器上的文件
    if (arrayName === 'galleryImages') {
      const deletedImage = array[index] as GalleryImage;
      const fileName = deletedImage.url.split('/').pop();
      
      if (fileName) {
        try {
          // 添加时间戳防止缓存
          const response = await fetch(`/api/images?fileName=${fileName}&t=${Date.now()}`, {
            method: 'DELETE',
            cache: 'no-cache',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          
          if (!response.ok && response.status !== 404) {
            const data = await response.json();
            console.error('删除图片文件失败:', data.error);
          }
        } catch (error) {
          console.error('删除图片过程中出错:', error);
        }
      }
    }
    
    try {
      // 无论是本地还是服务器环境，都保存数据
      console.log('正在保存删除后的数据...');
      await handleDataChange(updatedResumeData);
    } catch (error) {
      console.error('保存数据过程中出错:', error);
      setError('删除项目失败');
    }
  };

  // 输入用户名的模态框组件
  const UsernameModal = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">请输入您的名字</h2>
        <p className="text-gray-600 mb-4">您的名字将显示给其他正在编辑简历的用户。</p>
        
        <input
          type="text"
          placeholder="您的名字"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onKeyDown={(e) => e.key === 'Enter' && handleSetUsername((e.target as HTMLInputElement).value)}
        />
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={(e) => {
              const input = (e.target as HTMLElement).parentElement?.previousElementSibling as HTMLInputElement;
              handleSetUsername(input?.value || '用户' + userId.substring(0, 4));
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );

  // 处理退出登录
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // 确保包含认证cookie
      });
      
      if (response.ok) {
        console.log('登出成功，重定向到登录页...');
        router.push('/login');
      } else {
        console.error('登出请求失败');
      }
    } catch (err) {
      console.error('登出过程中出现错误:', err);
    }
  };

  if (showNameModal) {
    return <UsernameModal />;
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">正在验证身份...</h2>
        <p className="mt-2 text-gray-500">请稍候，正在检查您的登录状态</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-10v4m0 0v4m0-4h4m-4 0H9" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">需要登录</h2>
          <p className="text-gray-600 mb-6">您需要登录才能访问编辑页面。</p>
          <div className="flex space-x-4 justify-center">
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              前往登录
            </button>
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => setError(null)} 
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          继续编辑
        </button>
      </div>
    );
  }

  if (!resumeData) return <div className="p-6 text-center">未找到简历数据</div>;

  // 处理基本信息变更
  const handleBasicChange = (field: string, value: string) => {
    if (!resumeData) return;
    
    const updatedResumeData = {
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        [field]: value
      }
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 添加工作经历
  const addExperience = () => {
    if (!resumeData) return;
    
    const newExperience = {
      company: '',
      title: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    
    const updatedResumeData = {
      ...resumeData,
      workExperience: [...(resumeData.workExperience || []), newExperience]
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 删除工作经历
  const removeExperience = (index: number) => {
    if (!resumeData || !resumeData.workExperience) return;
    
    const updatedExperience = [...resumeData.workExperience];
    updatedExperience.splice(index, 1);
    
    const updatedResumeData = {
      ...resumeData,
      workExperience: updatedExperience
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 更新工作经历
  const handleExperienceChange = (index: number, field: string, value: string) => {
    if (!resumeData || !resumeData.workExperience) return;
    
    const updatedExperience = [...resumeData.workExperience];
    updatedExperience[index] = {
      ...updatedExperience[index],
      [field]: value
    };
    
    const updatedResumeData = {
      ...resumeData,
      workExperience: updatedExperience
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 添加教育经历
  const addEducation = () => {
    if (!resumeData) return;
    
    const newEducation = {
      institution: '',
      degree: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    
    const updatedResumeData = {
      ...resumeData,
      education: [...(resumeData.education || []), newEducation]
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 删除教育经历
  const removeEducation = (index: number) => {
    if (!resumeData || !resumeData.education) return;
    
    const updatedEducation = [...resumeData.education];
    updatedEducation.splice(index, 1);
    
    const updatedResumeData = {
      ...resumeData,
      education: updatedEducation
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 更新教育经历
  const handleEducationChange = (index: number, field: string, value: string) => {
    if (!resumeData || !resumeData.education) return;
    
    const updatedEducation = [...resumeData.education];
    updatedEducation[index] = {
      ...updatedEducation[index],
      [field]: value
    };
    
    const updatedResumeData = {
      ...resumeData,
      education: updatedEducation
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 添加技能
  const addSkill = () => {
    if (!resumeData) return;
    
    const newSkill = {
      name: '',
      level: 1
    };
    
    const updatedResumeData = {
      ...resumeData,
      skills: [...(resumeData.skills || []), newSkill]
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 删除技能
  const removeSkill = (index: number) => {
    if (!resumeData || !resumeData.skills) return;
    
    const updatedSkills = [...resumeData.skills];
    updatedSkills.splice(index, 1);
    
    const updatedResumeData = {
      ...resumeData,
      skills: updatedSkills
    };
    
    handleDataChange(updatedResumeData);
  };
  
  // 更新技能
  const handleSkillChange = (index: number, field: string, value: string | number) => {
    if (!resumeData || !resumeData.skills) return;
    
    const updatedSkills = [...resumeData.skills];
    updatedSkills[index] = {
      ...updatedSkills[index],
      [field]: value
    };
    
    const updatedResumeData = {
      ...resumeData,
      skills: updatedSkills
    };
    
    handleDataChange(updatedResumeData);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 顶部导航条 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">编辑简历</h1>
            <div className="text-sm text-gray-500 ml-2">
              {lastUpdateTime && `上次更新: ${lastUpdateTime.toLocaleTimeString()}`}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {username && (
              <div className="text-sm text-gray-600 flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span className="font-medium">{username}</span>
              </div>
            )}
            <div>
              {saveStatus === 'saving' && <span className="text-yellow-500 text-sm">保存中...</span>}
              {saveStatus === 'saved' && <span className="text-green-500 text-sm">已保存</span>}
              {saveStatus === 'error' && <span className="text-red-500 text-sm">保存失败</span>}
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition duration-150"
            >
              返回
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition duration-150"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>

      {/* 正文内容 */}
      <div className="container mx-auto mt-6 px-4 pb-12">
        <div className="flex">
          {/* 左侧标签页导航 */}
          <div className="w-64 pr-6">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center ${
                    tab.id === activeTab
                      ? 'bg-blue-100 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {activeTab === 'personalInfo' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">个人信息</h3>
                  
                  {/* 头像上传部分 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      头像
                    </label>
                    <div className="flex items-start">
                      <div className="relative w-24 h-24 bg-gray-100 rounded-full overflow-hidden mr-4">
                        {resumeData.personalInfo?.avatar ? (
                          <img 
                            src={resumeData.personalInfo.avatar} 
                            alt="头像" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <FileUploader
                          onUploadSuccess={(fileUrl) => {
                            handleBasicChange('avatar', fileUrl);
                          }}
                          onUploadError={handleUploadError}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          建议上传正方形图片，将自动裁剪为圆形
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        姓名
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={resumeData.personalInfo?.name || ''}
                          onChange={(e) => handleBasicChange('name', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        职位
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="title"
                          id="title"
                          value={resumeData.personalInfo?.title || ''}
                          onChange={(e) => handleBasicChange('title', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                        性别
                      </label>
                      <div className="mt-1">
                        <select
                          id="gender"
                          name="gender"
                          value={resumeData.personalInfo?.gender || ''}
                          onChange={(e) => handleBasicChange('gender', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                          <option value="">选择性别</option>
                          <option value="男">男</option>
                          <option value="女">女</option>
                          <option value="其他">其他</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        邮箱
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={resumeData.personalInfo?.email || ''}
                          onChange={(e) => handleBasicChange('email', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        电话
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={resumeData.personalInfo?.phone || ''}
                          onChange={(e) => handleBasicChange('phone', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                        位置
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="location"
                          id="location"
                          value={resumeData.personalInfo?.location || ''}
                          onChange={(e) => handleBasicChange('location', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                        关于我
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="about"
                          name="about"
                          rows={5}
                          value={resumeData.personalInfo?.about || ''}
                          onChange={(e) => handleBasicChange('about', e.target.value)}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 工作经历标签页 */}
              {activeTab === 'workExperience' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">工作经历</h3>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      添加经历
                    </button>
                  </div>

                  {resumeData.workExperience && resumeData.workExperience.map((exp, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 relative mb-4">
                      <button
                        onClick={() => removeExperience(index)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`company-${index}`} className="block text-sm font-medium text-gray-700">
                            公司名称
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`company-${index}`}
                              id={`company-${index}`}
                              value={exp.company || ''}
                              onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`position-${index}`} className="block text-sm font-medium text-gray-700">
                            职位
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`position-${index}`}
                              id={`position-${index}`}
                              value={exp.title || ''}
                              onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`startDate-${index}`} className="block text-sm font-medium text-gray-700">
                            开始日期
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`startDate-${index}`}
                              id={`startDate-${index}`}
                              placeholder="YYYY-MM"
                              value={exp.startDate || ''}
                              onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`endDate-${index}`} className="block text-sm font-medium text-gray-700">
                            结束日期 (留空表示至今)
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`endDate-${index}`}
                              id={`endDate-${index}`}
                              placeholder="YYYY-MM 或 至今"
                              value={exp.endDate || ''}
                              onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor={`description-${index}`} className="block text-sm font-medium text-gray-700">
                            工作描述
                          </label>
                          <div className="mt-1">
                            <textarea
                              id={`description-${index}`}
                              name={`description-${index}`}
                              rows={4}
                              value={exp.description || ''}
                              onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!resumeData.workExperience || resumeData.workExperience.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      尚未添加工作经历，点击上方按钮添加
                    </div>
                  )}
                </div>
              )}

              {/* 教育经历标签页 */}
              {activeTab === 'education' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">教育经历</h3>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      添加教育
                    </button>
                  </div>

                  {resumeData.education && resumeData.education.map((edu, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 relative mb-4">
                      <button
                        onClick={() => removeEducation(index)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`institution-${index}`} className="block text-sm font-medium text-gray-700">
                            学校名称
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`institution-${index}`}
                              id={`institution-${index}`}
                              value={edu.institution || ''}
                              onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`degree-${index}`} className="block text-sm font-medium text-gray-700">
                            学位/专业
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`degree-${index}`}
                              id={`degree-${index}`}
                              value={edu.degree || ''}
                              onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`startDate-${index}`} className="block text-sm font-medium text-gray-700">
                            开始日期
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`edu-startDate-${index}`}
                              id={`edu-startDate-${index}`}
                              placeholder="YYYY-MM"
                              value={edu.startDate || ''}
                              onChange={(e) => handleEducationChange(index, 'startDate', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`endDate-${index}`} className="block text-sm font-medium text-gray-700">
                            结束日期
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`edu-endDate-${index}`}
                              id={`edu-endDate-${index}`}
                              placeholder="YYYY-MM 或 至今"
                              value={edu.endDate || ''}
                              onChange={(e) => handleEducationChange(index, 'endDate', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor={`edu-description-${index}`} className="block text-sm font-medium text-gray-700">
                            描述
                          </label>
                          <div className="mt-1">
                            <textarea
                              id={`edu-description-${index}`}
                              name={`edu-description-${index}`}
                              rows={4}
                              value={edu.description || ''}
                              onChange={(e) => handleEducationChange(index, 'description', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!resumeData.education || resumeData.education.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      尚未添加教育经历，点击上方按钮添加
                    </div>
                  )}
                </div>
              )}

              {/* 感情经历标签页 */}
              {activeTab === 'relationships' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">感情经历</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newRelationship = {
                          person: '',
                          type: '',
                          startDate: '',
                          endDate: '',
                          story: ''
                        };
                        handleDataChange({
                          ...resumeData,
                          relationships: [...(resumeData.relationships || []), newRelationship]
                        });
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      添加感情经历
                    </button>
                  </div>

                  {resumeData.relationships && resumeData.relationships.map((relation, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 relative mb-4">
                      <button
                        onClick={() => deleteArrayItem('relationships', index)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`person-${index}`} className="block text-sm font-medium text-gray-700">
                            关系对象
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`person-${index}`}
                              id={`person-${index}`}
                              value={relation.person || ''}
                              onChange={(e) => updateArrayField('relationships', index, 'person', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`type-${index}`} className="block text-sm font-medium text-gray-700">
                            关系类型
                          </label>
                          <div className="mt-1">
                            <select
                              id={`type-${index}`}
                              name={`type-${index}`}
                              value={relation.type || ''}
                              onChange={(e) => updateArrayField('relationships', index, 'type', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">选择类型...</option>
                              <option value="恋爱关系">恋爱关系</option>
                              <option value="暧昧关系">暧昧关系</option>
                              <option value="追求关系">追求关系</option>
                              <option value="喜欢关系">喜欢关系</option>
                              <option value="暗恋关系">暗恋关系</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`relation-startDate-${index}`} className="block text-sm font-medium text-gray-700">
                            开始日期
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`relation-startDate-${index}`}
                              id={`relation-startDate-${index}`}
                              placeholder="YYYY-MM"
                              value={relation.startDate || ''}
                              onChange={(e) => updateArrayField('relationships', index, 'startDate', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`relation-endDate-${index}`} className="block text-sm font-medium text-gray-700">
                            结束日期 (留空表示至今)
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`relation-endDate-${index}`}
                              id={`relation-endDate-${index}`}
                              placeholder="YYYY-MM 或 至今"
                              value={relation.endDate || ''}
                              onChange={(e) => updateArrayField('relationships', index, 'endDate', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor={`story-${index}`} className="block text-sm font-medium text-gray-700">
                            故事描述
                          </label>
                          <div className="mt-1">
                            <textarea
                              id={`story-${index}`}
                              name={`story-${index}`}
                              rows={4}
                              value={relation.story || ''}
                              onChange={(e) => updateArrayField('relationships', index, 'story', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!resumeData.relationships || resumeData.relationships.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      尚未添加感情经历，点击上方按钮添加
                    </div>
                  )}
                </div>
              )}

              {/* 个人经历标签页 */}
              {activeTab === 'personalExperience' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">个人经历</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newPersonalExperience = {
                          title: '',
                          date: '',
                          description: ''
                        };
                        handleDataChange({
                          ...resumeData,
                          personalExperience: [...(resumeData.personalExperience || []), newPersonalExperience]
                        });
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      添加个人经历
                    </button>
                  </div>

                  {resumeData.personalExperience && resumeData.personalExperience.map((exp, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 relative mb-4">
                      <button
                        onClick={() => deleteArrayItem('personalExperience', index)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`exp-title-${index}`} className="block text-sm font-medium text-gray-700">
                            经历标题
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`exp-title-${index}`}
                              id={`exp-title-${index}`}
                              value={exp.title || ''}
                              onChange={(e) => updateArrayField('personalExperience', index, 'title', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`exp-date-${index}`} className="block text-sm font-medium text-gray-700">
                            日期
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name={`exp-date-${index}`}
                              id={`exp-date-${index}`}
                              value={exp.date || ''}
                              placeholder="例如: 2020-05"
                              onChange={(e) => updateArrayField('personalExperience', index, 'date', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor={`exp-description-${index}`} className="block text-sm font-medium text-gray-700">
                            经历描述
                          </label>
                          <div className="mt-1">
                            <textarea
                              id={`exp-description-${index}`}
                              name={`exp-description-${index}`}
                              rows={4}
                              value={exp.description || ''}
                              onChange={(e) => updateArrayField('personalExperience', index, 'description', e.target.value)}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!resumeData.personalExperience || resumeData.personalExperience.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      尚未添加个人经历，点击上方按钮添加
                    </div>
                  )}
                </div>
              )}

              {/* 个人图库标签页 */}
              {activeTab === 'gallery' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">个人图库</h3>
                    <FileUploader 
                      onUploadSuccess={addGalleryImage} 
                      onUploadError={handleUploadError}
                    />
                  </div>

                  {resumeData.galleryImages && resumeData.galleryImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      {resumeData.galleryImages.map((image, index) => (
                        <div key={index} className="relative border border-gray-200 rounded-md overflow-hidden">
                          <div className="w-full h-48 bg-gray-200 relative">
                            <img 
                              src={image.url} 
                              alt={image.title || '简历照片'} 
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => deleteArrayItem('galleryImages', index)}
                              className="absolute top-2 right-2 bg-red-500 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-100 transition-opacity"
                              title="删除图片"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          <div className="p-3">
                            <input
                              type="text"
                              value={image.title || ''}
                              onChange={(e) => updateArrayField('galleryImages', index, 'title', e.target.value)}
                              placeholder="图片标题"
                              className="w-full mb-2 text-sm border-gray-300 rounded-md"
                            />
                            <textarea
                              value={image.description || ''}
                              onChange={(e) => updateArrayField('galleryImages', index, 'description', e.target.value)}
                              placeholder="图片描述"
                              rows={2}
                              className="w-full text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      尚未添加照片，点击上方按钮上传
                    </div>
                  )}
                </div>
              )}

              {/* 预览按钮 */}
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="flex justify-end">
                  <Link
                    href={resumeData.id ? `/view/${resumeData.id}` : '/view'}
                    target="_blank"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    预览简历
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 