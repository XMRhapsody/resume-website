'use client';

import Image from 'next/image'
import React, { useState } from 'react'
import { ResumeData } from '@/types/resume'

interface ResumeViewProps {
  data: ResumeData;
  lastUpdatedPath?: string | null;
}

export default function ResumeView({ data, lastUpdatedPath }: ResumeViewProps) {
  const [avatarError, setAvatarError] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 判断路径是否应该被高亮
  const shouldHighlight = (path: string): boolean => {
    if (!lastUpdatedPath) return false;
    return lastUpdatedPath === path || lastUpdatedPath.startsWith(path + '.');
  };

  // 高亮样式类
  const highlightClass = "bg-yellow-100 transition-all duration-500";

  return (
    <div className="divide-y divide-gray-200">
      {/* 个人信息部分 */}
      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <div className="relative h-40 w-40 rounded-full overflow-hidden">
              {data.personalInfo.avatar && !avatarError ? (
                <img 
                  src={data.personalInfo.avatar} 
                  alt={data.personalInfo.name}
                  className={`h-full w-full object-cover rounded-full ${
                    shouldHighlight('personalInfo.avatar') ? highlightClass : ''
                  }`}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="bg-gray-200 h-full w-full flex items-center justify-center text-gray-500">
                  {data.personalInfo.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <div className="text-center md:text-left">
            <h3 className={`text-3xl font-bold text-gray-900 ${
              shouldHighlight('personalInfo.name') ? highlightClass : ''
            }`}>
              {data.personalInfo.name}
            </h3>
            <p className={`mt-1 text-xl text-gray-600 ${
              shouldHighlight('personalInfo.title') ? highlightClass : ''
            }`}>
              {data.personalInfo.title}
            </p>
            <div className="mt-2 text-gray-600">
              <p className={shouldHighlight('personalInfo.email') ? highlightClass : ''}>
                {data.personalInfo.email}
              </p>
              <p className={shouldHighlight('personalInfo.phone') ? highlightClass : ''}>
                {data.personalInfo.phone}
              </p>
              <p className={shouldHighlight('personalInfo.location') ? highlightClass : ''}>
                {data.personalInfo.location}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 关于我部分 */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl font-bold text-gray-900">关于我</h3>
        <p className={`mt-2 text-gray-600 whitespace-pre-line ${
          shouldHighlight('personalInfo.about') ? highlightClass : ''
        }`}>
          {data.personalInfo.about}
        </p>
      </div>

      {/* 工作经历部分 */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl font-bold text-gray-900">工作经历</h3>
        <div className="mt-4 space-y-8">
          {data.workExperience.map((work, index) => (
            <div 
              key={index} 
              className={`relative border-l-4 border-indigo-200 pl-4 pb-2 ${
                shouldHighlight(`workExperience[${index}]`) ? highlightClass : ''
              }`}
            >
              <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[6.5px] top-1.5"></div>
              <h4 className={`text-lg font-semibold text-gray-900 ${
                shouldHighlight(`workExperience[${index}].company`) ? highlightClass : ''
              }`}>
                {work.company}
              </h4>
              <p className="text-gray-500">
                <span className={shouldHighlight(`workExperience[${index}].title`) ? highlightClass : ''}>
                  {work.title}
                </span> | 
                <span className={shouldHighlight(`workExperience[${index}].startDate`) ? highlightClass : ''}>
                  {work.startDate}
                </span> - 
                <span className={shouldHighlight(`workExperience[${index}].endDate`) ? highlightClass : ''}>
                  {work.endDate || '至今'}
                </span>
              </p>
              <p className={`mt-2 text-gray-600 whitespace-pre-line ${
                shouldHighlight(`workExperience[${index}].description`) ? highlightClass : ''
              }`}>
                {work.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 教育经历部分 */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl font-bold text-gray-900">教育经历</h3>
        <div className="mt-4 space-y-8">
          {data.education.map((edu, index) => (
            <div 
              key={index} 
              className={`relative border-l-4 border-indigo-200 pl-4 pb-2 ${
                shouldHighlight(`education[${index}]`) ? highlightClass : ''
              }`}
            >
              <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[6.5px] top-1.5"></div>
              <h4 className={`text-lg font-semibold text-gray-900 ${
                shouldHighlight(`education[${index}].institution`) ? highlightClass : ''
              }`}>
                {edu.institution}
              </h4>
              <p className="text-gray-500">
                <span className={shouldHighlight(`education[${index}].degree`) ? highlightClass : ''}>
                  {edu.degree}
                </span> | 
                <span className={shouldHighlight(`education[${index}].startDate`) ? highlightClass : ''}>
                  {edu.startDate}
                </span> - 
                <span className={shouldHighlight(`education[${index}].endDate`) ? highlightClass : ''}>
                  {edu.endDate || '至今'}
                </span>
              </p>
              <p className={`mt-2 text-gray-600 whitespace-pre-line ${
                shouldHighlight(`education[${index}].description`) ? highlightClass : ''
              }`}>
                {edu.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 感情经历部分 */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl font-bold text-gray-900">感情经历</h3>
        <div className="mt-4 space-y-8">
          {data.relationships.map((relationship, index) => (
            <div 
              key={index} 
              className={`relative border-l-4 border-pink-200 pl-4 pb-2 ${
                shouldHighlight(`relationships[${index}]`) ? highlightClass : ''
              }`}
            >
              <div className="absolute w-3 h-3 bg-pink-500 rounded-full -left-[6.5px] top-1.5"></div>
              <h4 className={`text-lg font-semibold text-gray-900 ${
                shouldHighlight(`relationships[${index}].person`) ? highlightClass : ''
              }`}>
                {relationship.person}
              </h4>
              <p className="text-gray-500">
                <span className={shouldHighlight(`relationships[${index}].type`) ? highlightClass : ''}>
                  {relationship.type}
                </span> | 
                <span className={shouldHighlight(`relationships[${index}].startDate`) ? highlightClass : ''}>
                  {relationship.startDate}
                </span> - 
                <span className={shouldHighlight(`relationships[${index}].endDate`) ? highlightClass : ''}>
                  {relationship.endDate || '至今'}
                </span>
              </p>
              <p className={`mt-2 text-gray-600 whitespace-pre-line ${
                shouldHighlight(`relationships[${index}].story`) ? highlightClass : ''
              }`}>
                {relationship.story}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 个人经历部分 */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl font-bold text-gray-900">个人经历</h3>
        <div className="mt-4 space-y-8">
          {data.personalExperience.map((exp, index) => (
            <div 
              key={index} 
              className={`relative border-l-4 border-green-200 pl-4 pb-2 ${
                shouldHighlight(`personalExperience[${index}]`) ? highlightClass : ''
              }`}
            >
              <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[6.5px] top-1.5"></div>
              <h4 className={`text-lg font-semibold text-gray-900 ${
                shouldHighlight(`personalExperience[${index}].title`) ? highlightClass : ''
              }`}>
                {exp.title}
              </h4>
              <p className={`text-gray-500 ${
                shouldHighlight(`personalExperience[${index}].date`) ? highlightClass : ''
              }`}>
                {exp.date}
              </p>
              <p className={`mt-2 text-gray-600 whitespace-pre-line ${
                shouldHighlight(`personalExperience[${index}].description`) ? highlightClass : ''
              }`}>
                {exp.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 个人图库部分 */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl font-bold text-gray-900">个人图库</h3>
        <div className="mt-4">
          {data.galleryImages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无图片</p>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.galleryImages.map((image, index) => (
                  <div 
                    key={image.id} 
                    className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${
                      shouldHighlight(`galleryImages[${index}]`) ? highlightClass : ''
                    }`}
                    onClick={() => setSelectedImage(image.url)}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={image.url} 
                        alt={image.title} 
                        className={`w-full h-full object-cover ${
                          shouldHighlight(`galleryImages[${index}].url`) ? highlightClass : ''
                        }`}
                      />
                    </div>
                    <div className="p-3">
                      <h4 className={`font-medium text-gray-900 ${
                        shouldHighlight(`galleryImages[${index}].title`) ? highlightClass : ''
                      }`}>
                        {image.title}
                      </h4>
                      {image.description && (
                        <p className={`mt-1 text-sm text-gray-500 ${
                          shouldHighlight(`galleryImages[${index}].description`) ? highlightClass : ''
                        }`}>
                          {image.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 大图预览 */}
              {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setSelectedImage(null)}>
                  <div className="max-w-4xl max-h-[90vh]">
                    <img 
                      src={selectedImage} 
                      alt="图片预览" 
                      className="max-h-[90vh] max-w-full object-contain"
                    />
                    <button 
                      className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 