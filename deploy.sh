#!/bin/bash

# 设置变量
SERVER_IP="43.154.86.159"
SERVER_USER="root"
REMOTE_DIR="/var/www/resume-website"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${YELLOW}===== 开始部署到服务器 $SERVER_IP =====${NC}"

# 1. 构建项目
echo -e "${YELLOW}正在构建项目...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败，部署终止。${NC}"
    exit 1
fi

# 2. 将构建的文件和静态资源复制到服务器
echo -e "${YELLOW}正在将文件传输到服务器...${NC}"

# 确保远程目录存在
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"

# 复制.next文件夹（构建输出）
echo -e "${YELLOW}正在复制构建文件...${NC}"
rsync -avz --delete .next $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

# 复制public目录（静态资源）
echo -e "${YELLOW}正在复制静态资源...${NC}"
rsync -avz --delete public $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

# 复制package.json和package-lock.json（依赖管理）
echo -e "${YELLOW}正在复制依赖配置...${NC}"
rsync -avz package.json package-lock.json $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

# 确保正确的目录权限
echo -e "${YELLOW}设置目录权限...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR/public/gallery && \
  chmod -R 755 $REMOTE_DIR && \
  chmod -R 777 $REMOTE_DIR/public/gallery && \
  chmod -R 777 $REMOTE_DIR/data && \
  chmod -R 777 $REMOTE_DIR/logs && \
  chown -R root:root $REMOTE_DIR"

# 3. 重启服务器上的应用（完全停止后重新启动）
echo -e "${YELLOW}正在重启服务...${NC}"
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && \
  npm install --omit=dev && \
  mkdir -p $REMOTE_DIR/logs && \
  if pm2 list | grep resume-website; then \
    echo '停止并删除现有PM2进程...' && \
    pm2 stop resume-website && \
    pm2 delete resume-website; \
  fi && \
  echo '创建PM2配置文件...' && \
  echo 'module.exports = { apps: [{ name: \"resume-website\", script: \"node_modules/.bin/next\", args: \"start\", cwd: \"$REMOTE_DIR\", instances: 1, autorestart: true, watch: false, max_memory_restart: \"500M\", env: { NODE_ENV: \"production\", PORT: 3000 }, error_file: \"$REMOTE_DIR/logs/error.log\", out_file: \"$REMOTE_DIR/logs/output.log\", merge_logs: true, log_date_format: \"YYYY-MM-DD HH:mm:ss\" }] };' > $REMOTE_DIR/pm2.config.js && \
  echo '正在启动新的应用实例...' && \
  pm2 start $REMOTE_DIR/pm2.config.js && \
  pm2 save && \
  sleep 2 && \
  if pm2 list | grep resume-website | grep 'online'; then \
    echo '应用已成功启动'; \
  else \
    echo '应用启动可能失败，尝试再次启动...' && \
    pm2 start $REMOTE_DIR/pm2.config.js; \
  fi && \
  pm2 list"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 部署完成！应用已成功更新。${NC}"
else
    echo -e "${RED}❌ 服务重启失败，可能需要手动检查。${NC}"
    echo -e "${YELLOW}请手动执行以下命令：${NC}"
    echo -e "ssh $SERVER_USER@$SERVER_IP"
    echo -e "cd $REMOTE_DIR"
    echo -e "pm2 stop resume-website"
    echo -e "pm2 delete resume-website"
    echo -e "pm2 start $REMOTE_DIR/pm2.config.js"
    exit 1
fi

# 4. 验证服务是否正常运行
echo -e "${YELLOW}正在验证服务是否正常运行...${NC}"
sleep 5 # 等待服务完全启动

SSH_CHECK_CMD="curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
STATUS_CODE=$(ssh $SERVER_USER@$SERVER_IP "$SSH_CHECK_CMD")

if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 服务已成功启动，HTTP状态码: $STATUS_CODE${NC}"
else
    echo -e "${RED}❌ 服务可能未正常运行，HTTP状态码: $STATUS_CODE${NC}"
    echo -e "${YELLOW}请手动检查服务状态${NC}"
fi

# 5. 打印访问信息
echo -e "${GREEN}您的网站已部署完成，可以通过以下地址访问：${NC}"
echo -e "${GREEN}http://$SERVER_IP${NC}"

exit 0 