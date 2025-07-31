#!/bin/bash
# liquidator/interactive-deploy.sh

set -e

echo "🔐 Liquidator 安全部署向导"
echo "================================"

# 检查是否已存在 .env
if [ -f ".env" ]; then
    echo "⚠️  发现现有的 .env 文件"
    read -p "是否要覆盖现有配置? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "❌ 部署取消"
        exit 1
    fi
fi

# 安全输入私钥
echo ""
echo "请输入您的私钥 (64位十六进制字符串，不包含0x):"
read -s SECRET_KEY  # -s 参数隐藏输入
echo ""

# 验证私钥格式
if [[ ! $SECRET_KEY =~ ^[0-9a-fA-F]{64}$ ]]; then
    echo "❌ 私钥格式无效! 必须是64位十六进制字符串"
    exit 1
fi

# 创建 .env 文件
echo "📝 创建 .env 文件..."
cat > .env << EOF
REDIS_HOST=redis
SECRET_KEY=$SECRET_KEY
EOF

# 设置权限
chmod 600 .env

# 清除变量
unset SECRET_KEY

echo "✅ .env 文件创建成功"

# 询问是否立即部署
read -p "是否立即启动服务? (Y/n): " start_now
if [[ ! $start_now =~ ^[Nn]$ ]]; then
    echo "🚀 启动服务..."
    docker-compose down 2>/dev/null || true
    docker-compose up -d
    
    echo "⏳ 等待服务启动..."
    sleep 10
    
    echo "📊 服务状态:"
    docker-compose ps
    
    echo ""
    echo "✅ 部署完成!"
    echo "查看日志: docker-compose logs -f"
fi