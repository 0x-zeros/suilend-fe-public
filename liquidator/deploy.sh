#!/bin/bash
# liquidator/deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Liquidator..."

# 检查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在!"
    echo "请先创建 .env 文件："
    echo ""
    echo "nano .env"
    echo ""
    echo "然后添加以下内容："
    echo "REDIS_HOST=redis"
    echo "SECRET_KEY=your_actual_private_key"
    echo ""
    exit 1
fi

# 检查 SECRET_KEY 是否为示例值
if grep -q "your_private_key_here" .env; then
    echo "❌ 请将 .env 文件中的示例密钥替换为真实密钥!"
    exit 1
fi

# 设置文件权限
echo "🔐 设置 .env 文件权限..."
chmod 600 .env

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down

# 启动服务
echo "▶️ 启动服务..."
docker-compose up -d  # -d 后台运行

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 显示日志
echo "📋 显示最近日志..."
docker-compose logs --tail=20

echo "✅ 部署完成!"
echo ""
echo "使用以下命令查看实时日志:"
echo "docker-compose logs -f"
echo ""
echo "使用以下命令停止服务:"
echo "docker-compose down"