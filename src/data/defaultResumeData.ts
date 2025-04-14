import { ResumeData } from '@/types/resume';

export const defaultResumeData: ResumeData = {
  personalInfo: {
    name: '张三',
    title: '前端开发工程师',
    email: 'zhangsan@example.com',
    phone: '13800138000',
    location: '北京',
    about: '我是一名经验丰富的前端开发工程师，有5年的React和Vue开发经验。我喜欢创建用户友好的界面，并且对Web性能优化有浓厚的兴趣。',
    avatar: ''
  },
  workExperience: [
    {
      company: 'ABC科技有限公司',
      title: '高级前端开发工程师',
      startDate: '2020-01',
      endDate: '至今',
      description: '负责公司核心产品的前端开发，使用React和TypeScript构建高性能Web应用。带领5人团队完成了多个重要项目。'
    },
    {
      company: 'XYZ互联网公司',
      title: '前端开发工程师',
      startDate: '2017-06',
      endDate: '2019-12',
      description: '使用Vue.js开发了企业管理系统，优化了10多个关键页面的加载速度，提升用户体验。'
    }
  ],
  education: [
    {
      institution: '北京大学',
      degree: '计算机科学 硕士',
      startDate: '2014-09',
      endDate: '2017-06',
      description: '主修Web开发和人工智能算法，GPA 3.8/4.0。'
    },
    {
      institution: '清华大学',
      degree: '计算机科学 学士',
      startDate: '2010-09',
      endDate: '2014-06',
      description: '计算机协会成员，多次获得奖学金。'
    }
  ],
  relationships: [
    {
      person: '李四',
      type: '恋爱关系',
      startDate: '2018-03',
      endDate: '2021-05',
      story: '在一次技术沙龙中认识，共同的兴趣让我们走到了一起。我们一起去过很多地方旅行，学习了很多新技术。'
    },
    {
      person: '王五',
      type: '恋爱关系',
      startDate: '2015-09',
      endDate: '2017-12',
      story: '大学同学，我们因为共同的课程项目而开始交往，一起度过了美好的大学时光。'
    }
  ],
  personalExperience: [
    {
      title: '环球旅行',
      date: '2019-07',
      description: '用了三个月的时间，走访了10个国家，体验了不同的文化和生活方式，这段经历让我受益匪浅。'
    },
    {
      title: '马拉松比赛',
      date: '2018-10',
      description: '参加了人生第一次马拉松比赛，完成了全程42.195公里的挑战，这让我明白了坚持的重要性。'
    }
  ],
  galleryImages: [],
  skills: [
    {
      name: 'React',
      level: 5
    },
    {
      name: 'TypeScript',
      level: 4
    },
    {
      name: 'Vue.js',
      level: 4
    },
    {
      name: 'Node.js',
      level: 3
    }
  ]
}; 