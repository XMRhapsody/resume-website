import { useState, useRef } from 'react';

interface FileUploaderProps {
  onUploadSuccess?: (fileUrl: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  multiple?: boolean;
}

export default function FileUploader({ 
  onUploadSuccess, 
  onUploadError, 
  accept = "image/*", 
  multiple = false 
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 遍历并上传每个文件
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }

    // 清除选择，以便能够选择相同的文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);

      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 5;
          return next > 90 ? 90 : next;
        });
      }, 100);

      // 发送请求
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const data = await response.json();
      setProgress(100);
      
      // 调用成功回调
      if (onUploadSuccess) {
        onUploadSuccess(data.url, data.fileName);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传过程中发生错误';
      setError(errorMessage);
      
      // 调用错误回调
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      // 短暂延迟后重置状态
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1000);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // 如果不允许多文件，只取第一个
    if (!multiple && files.length > 1) {
      await uploadFile(files[0]);
    } else {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isUploading ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50 border-gray-300 hover:border-indigo-500'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">上传中... {progress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M24 8c4.4183 0 8 3.5817 8 8 0 4.4183-3.5817 8-8 8-4.4183 0-8-3.5817-8-8 0-4.4183 3.5817-8 8-8zm-3 24h6m-3-3v-9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M28 30h7.2c1.0081 0 1.8 1.0039 1.8 2 0 .9941-.7959 2-1.8 2H12.8c-1.0081 0-1.8-1.0059-1.8-2 0-.9961.7959-2 1.8-2H20"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-1 text-sm text-gray-500">
              点击或拖放文件到此处上传
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {multiple ? '可选择多个文件' : '单个文件'} ({accept.replace(/\*$/, '').replace(/\*/g, '任意') || '任意格式'})
            </p>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
} 