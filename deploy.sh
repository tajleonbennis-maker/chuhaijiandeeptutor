#!/bin/bash
# DeepTutor 快速部署脚本

set -e

echo "======================================"
echo "  DeepTutor 快速部署"
echo "======================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker 已安装: $(docker --version)"
echo ""

# 方案选择
echo "请选择部署方式:"
echo "1) 使用预构建镜像（推荐，快速）"
echo "2) 从源码构建（需要时间）"
echo "3) Docker Compose 完整部署（含 PocketBase）"
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📦 使用预构建镜像部署..."
        echo ""
        
        # 检查端口是否占用
        if lsof -Pi :3782 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  警告: 端口 3782 已被占用"
            read -p "是否继续？(y/n): " continue
            if [ "$continue" != "y" ]; then
                exit 1
            fi
        fi
        
        echo "正在拉取最新镜像..."
        docker pull ghcr.io/hkuds/deeptutor:latest
        
        echo ""
        echo "启动容器..."
        docker run -d \
            --name deeptutor \
            --restart unless-stopped \
            -p 127.0.0.1:3782:3782 \
            -p 127.0.0.1:8001:8001 \
            -v deeptutor-data:/app/data \
            ghcr.io/hkuds/deeptutor:latest
        
        echo ""
        echo "✅ 部署成功！"
        echo ""
        echo "📌 访问地址: http://127.0.0.1:3782"
        echo "📊 查看日志: docker logs -f deeptutor"
        echo "🛑 停止服务: docker stop deeptutor"
        echo "♻️  重启服务: docker restart deeptutor"
        echo ""
        ;;
        
    2)
        echo ""
        echo "🔨 从源码构建..."
        echo "⚠️  注意: 这将需要较长时间（10-30 分钟）"
        echo ""
        read -p "确认继续？(y/n): " confirm
        if [ "$confirm" != "y" ]; then
            exit 0
        fi
        
        echo "开始构建镜像..."
        docker build -t deeptutor:local .
        
        echo ""
        echo "启动容器..."
        docker run -d \
            --name deeptutor \
            --restart unless-stopped \
            -p 127.0.0.1:3782:3782 \
            -p 127.0.0.1:8001:8001 \
            -v deeptutor-data:/app/data \
            deeptutor:local
        
        echo ""
        echo "✅ 部署成功！"
        echo ""
        echo "📌 访问地址: http://127.0.0.1:3782"
        ;;
        
    3)
        echo ""
        echo "🚀 使用 Docker Compose 部署..."
        echo ""
        
        if [ ! -f ".env" ]; then
            echo "创建 .env 文件..."
            cp .env.example .env
        fi
        
        echo "启动服务..."
        docker compose up -d
        
        echo ""
        echo "✅ 部署成功！"
        echo ""
        echo "📌 访问地址: http://127.0.0.1:3782"
        echo "📊 查看日志: docker compose logs -f"
        echo "🛑 停止服务: docker compose down"
        echo "♻️  重启服务: docker compose restart"
        echo ""
        ;;
        
    *)
        echo "无效的选项"
        exit 1
        ;;
esac

echo "================================"
echo "  初始配置说明"
echo "================================"
echo ""
echo "1. 首次访问会提示配置 LLM 提供商"
echo "2. 进入 Settings → Models 添加 API 密钥"
echo "3. 支持的提供商:"
echo "   - OpenAI"
echo "   - Anthropic (Claude)"
echo "   - Google Gemini"
echo "   - 本地模型 (Ollama, LM Studio)"
echo ""
echo "📚 完整文档: https://deeptutor.info"
echo "🐛 问题反馈: https://github.com/HKUDS/DeepTutor/issues"
echo ""
