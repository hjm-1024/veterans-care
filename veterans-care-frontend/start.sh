#!/bin/bash

echo "🚀 보훈케어 내비게이터 프론트엔드 실행 스크립트"
echo "================================================"

# 현재 디렉토리 확인
if [ ! -f "index.html" ]; then
    echo "❌ 오류: index.html 파일을 찾을 수 없습니다."
    echo "프론트엔드 폴더에서 실행해주세요."
    exit 1
fi

# 백엔드 서버 연결 확인
echo "🔍 백엔드 서버 연결 확인 중..."
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ 백엔드 서버 연결 확인됨 (localhost:5001)"
else
    echo "⚠️  백엔드 서버에 연결할 수 없습니다."
    echo "백엔드 서버를 먼저 실행해주세요:"
    echo "cd ../veterans-care-backend && npm run dev"
    echo ""
    echo "그래도 프론트엔드를 실행하시겠습니까? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 포트 3000이 사용 중인지 확인
if lsof -i :3000 > /dev/null; then
    echo "⚠️  포트 3000이 이미 사용 중입니다."
    echo "다른 포트(3001)를 사용하겠습니다."
    PORT=3001
else
    PORT=3000
fi

# Python 버전 확인 및 서버 실행
echo "🌐 웹 서버 시작 중..."
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 감지됨. 서버를 시작합니다..."
    echo "📡 서버 주소: http://localhost:$PORT"
    echo "🛑 서버를 중지하려면 Ctrl+C를 누르세요."
    echo ""
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "✅ Python 2 감지됨. 서버를 시작합니다..."
    echo "📡 서버 주소: http://localhost:$PORT"
    echo "🛑 서버를 중지하려면 Ctrl+C를 누르세요."
    echo ""
    python -m SimpleHTTPServer $PORT
else
    echo "❌ Python이 설치되어 있지 않습니다."
    echo "다음 중 하나를 설치해주세요:"
    echo "- Python 3: https://python.org"
    echo "- Node.js: npm start 명령어 사용"
    echo ""
    echo "또는 브라우저에서 직접 index.html 파일을 열어주세요."
    exit 1
fi