const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 정적 파일 제공
app.use(express.static('.'));

// 모든 경로를 index.html로 리다이렉트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, 'localhost', () => {
  console.log(`🚀 보훈케어 내비게이터 프론트엔드가 http://localhost:${PORT}에서 실행 중입니다!`);
});
