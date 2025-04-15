# 个人简历网站
Tips:我实在不熟悉markdown，加上熬夜写了两天，实在是蚌埠住了，就让ChatGPT替我写了注释，如果阅读有语法问题，欢迎提交Issues
这是一个使用Next.js 14构建的个人简历网站，支持在线编辑和实时预览。

## 示例

http://43.154.86.159/

## 安装与运行

确保你的开发环境中安装了Node.js 18或更高版本。

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建项目
npm run build

# 生产模式运行
npm run start
```

## 登录系统

本项目包含一个完整的用户认证系统，默认管理员账户：

- 用户名: admin
- 密码: admin123

### 权限控制

系统支持两种用户角色：
- 管理员（ADMIN）：拥有所有权限，包括管理用户和编辑简历
- 普通用户（USER）：仅有有限权限

### 如何使用

1. 访问 `/login` 页面进行登录
2. 登录成功后，管理员将被重定向到管理控制台
3. 在管理控制台中，可以：
   - 编辑简历内容
   - 管理用户（添加、查看）

## 文件结构

```
resume-website/
├── src/
│   ├── app/                 # 应用页面
│   │   ├── api/             # API路由
│   │   │   ├── auth/        # 认证相关API
│   │   │   ├── users/       # 用户管理API
│   │   │   └── ...
│   │   ├── admin/           # 管理界面
│   │   ├── login/           # 登录页面
│   │   └── edit/            # 简历编辑页面
│   ├── components/          # 可复用组件
│   ├── lib/                 # 工具函数
│   ├── data/                # 数据和默认值
│   └── types/               # TypeScript类型定义
├── public/                  # 静态资源
└── data/                    # 数据存储目录（运行时创建）
```

## 数据存储

简历数据和用户信息存储在JSON文件中，位于`data/`目录下：
- `users.json` - 用户信息
- `resume-data.json` - 简历内容
- `edit-history.json` - 编辑历史记录

## 部署

本项目可以轻松部署到任何支持Node.js的服务器上，使用提供的`deploy.sh`脚本：

```bash
# 确保脚本有执行权限
chmod +x deploy.sh

# 执行部署脚本
./deploy.sh
```
