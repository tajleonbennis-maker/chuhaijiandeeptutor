#!/bin/bash
# ============================================================
# DeepTutor 本地一键启动/停止脚本（不使用 Docker）
# 功能:
#   ./run-local.sh       启动后端(8001) + 前端(3782)
#   ./run-local.sh stop  停止所有 DeepTutor 服务
#   ./run-local.sh status 查看当前运行状态
#   ./run-local.sh restart 重启
# ============================================================
set -e
cd "$(dirname "$0")"

PY=.venv/bin/python
SERVE=.venv/bin/deeptutor
WEB_DIR=web
BACKEND_PORT=8001
FRONTEND_PORT=3782
BACKEND_LOG=/tmp/deeptutor_backend.log
FRONTEND_LOG=/tmp/deeptutor_frontend.log

# 检查虚拟环境
if [ ! -x "$PY" ]; then
  echo "❌ 未找到虚拟环境 .venv，请先创建:"
  echo "   python3.11 -m venv .venv && .venv/bin/pip install -e ."
  exit 1
fi

stop_all() {
  echo "🛑 停止 DeepTutor 服务..."
  pkill -f "deeptutor serve" 2>/dev/null && echo "  后端已停止" || echo "  后端未运行"
  pkill -f "next-server" 2>/dev/null && echo "  前端已停止" || echo "  前端未运行"
  # 兜底：若端口仍被占用则强制终止
  if lsof -iTCP:$BACKEND_PORT -sTCP:LISTEN -P >/dev/null 2>&1; then pkill -9 -f "deeptutor serve" 2>/dev/null; fi
  if lsof -iTCP:$FRONTEND_PORT -sTCP:LISTEN -P >/dev/null 2>&1; then pkill -9 -f "next-server" 2>/dev/null; fi
  sleep 1
  echo "✅ 已全部停止"
}

status() {
  echo "📊 DeepTutor 状态:"
  BP=$(lsof -iTCP:$BACKEND_PORT -sTCP:LISTEN -P 2>/dev/null | tail -1 | awk '{print $1, $2}')
  FP=$(lsof -iTCP:$FRONTEND_PORT -sTCP:LISTEN -P 2>/dev/null | tail -1 | awk '{print $1, $2}')
  [ -n "$BP" ] && echo "  后端 $BACKEND_PORT: ✅ ($BP)" || echo "  后端 $BACKEND_PORT: ❌ 未运行"
  [ -n "$FP" ] && echo "  前端 $FRONTEND_PORT: ✅ ($FP)" || echo "  前端 $FRONTEND_PORT: ❌ 未运行"
}

start_all() {
  # ---------- 后端 ----------
  if lsof -iTCP:$BACKEND_PORT -sTCP:LISTEN -P >/dev/null 2>&1; then
    echo "✅ 后端已在运行 (端口 $BACKEND_PORT)"
  else
    echo "🚀 启动后端 (端口 $BACKEND_PORT)..."
    nohup $SERVE serve --host 127.0.0.1 --port $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
    sleep 5
    curl -sf http://127.0.0.1:$BACKEND_PORT/ >/dev/null 2>&1 \
      && echo "  后端 ✅ 就绪" \
      || { echo "  后端 ❌ 启动失败，查看日志: $BACKEND_LOG"; tail -20 "$BACKEND_LOG"; exit 1; }
  fi

  # ---------- 前端 (standalone) ----------
  if lsof -iTCP:$FRONTEND_PORT -sTCP:LISTEN -P >/dev/null 2>&1; then
    echo "✅ 前端已在运行 (端口 $FRONTEND_PORT)"
  else
    echo "🚀 准备前端 (standalone)..."

    # 检查前端生产构建产物
    STANDALONE="$WEB_DIR/.next/standalone"
    if [ ! -f "$STANDALONE/server.js" ]; then
      echo "  前端未构建，开始构建 (可能需 1-2 分钟)..."
      (cd "$WEB_DIR" && npm run build)
      mkdir -p "$STANDALONE/.next"
      cp -r "$WEB_DIR/.next/static" "$STANDALONE/.next/"
      [ -d "$WEB_DIR/public" ] && cp -r "$WEB_DIR/public" "$STANDALONE/"
    fi

    echo "🚀 启动前端 (端口 $FRONTEND_PORT)..."
    (cd "$STANDALONE" && \
      PORT=$FRONTEND_PORT \
      HOSTNAME=127.0.0.1 \
      DEEPTUTOR_API_BASE_URL=http://127.0.0.1:$BACKEND_PORT \
      nohup node server.js > "$FRONTEND_LOG" 2>&1 &)
    sleep 6
    curl -sf http://127.0.0.1:$FRONTEND_PORT/ >/dev/null 2>&1 \
      && echo "  前端 ✅ 就绪" \
      || { echo "  前端 ❌ 启动失败，查看日志: $FRONTEND_LOG"; tail -20 "$FRONTEND_LOG"; exit 1; }
  fi

  echo ""
  echo "=============================================="
  echo "  DeepTutor 已就绪（非 Docker 本地运行）"
  echo "  🌐 访问地址:  http://127.0.0.1:$FRONTEND_PORT"
  echo "  ⚙️  后端 API:  http://127.0.0.1:$BACKEND_PORT"
  echo "=============================================="
  echo "  重启:  $0 restart     停止: $0 stop"
}

case "${1:-start}" in
  start)   start_all ;;
  stop)    stop_all ;;
  restart) stop_all; sleep 2; start_all ;;
  status)  status ;;
  *) echo "用法: $0 [start|stop|restart|status]"; exit 1 ;;
esac
