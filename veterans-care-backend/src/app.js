const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// CORS 설정 - 개발 환경에서 모든 origin 허용
app.use(cors({
  origin: true, // 개발 환경에서 모든 origin 허용
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100개 요청
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Veterans Care Backend',
    port: process.env.PORT || 5001
  });
});

// 기본 API 정보
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Veterans Care Navigator API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'GET /api - This endpoint'
    ]
  });
});

// 라우터 로드
const loadRoutes = () => {
  try {
    // 모델 먼저 초기화
    console.log('🔧 Initializing models...');
    require('./models');
    console.log('✅ Models initialized');

    console.log('🔧 Loading routes...');
    
    // 라우터 로드
    const authRouter = require('./routes/auth');
    const usersRouter = require('./routes/users');
    const bookingsRouter = require('./routes/bookings');
    const healthRecordsRouter = require('./routes/healthRecords');
    const utilsRouter = require('./routes/utils');
    const hospitalsRouter = require('./routes/hospitals');
    const departmentsRouter = require('./routes/departments');
    const equipmentRouter = require('./routes/equipment');

    app.use('/api/auth', authRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/bookings', bookingsRouter);
    app.use('/api/health-records', healthRecordsRouter);
    app.use('/api/utils', utilsRouter);
    app.use('/api/hospitals', hospitalsRouter);
    app.use('/api/departments', departmentsRouter);
    app.use('/api/equipment', equipmentRouter);

    console.log('✅ All routes loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading routes:', error.message);
    return false;
  }
};

// 라우터 로드
const routesLoaded = loadRoutes();

// 404 handler (문제가 될 수 있는 * 패턴 제거)
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Visit /api for available endpoints'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err.stack);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message
  });
});

const PORT = process.env.PORT || 5001;

// 서버 시작을 try-catch로 감싸기
try {
  const server = app.listen(PORT, () => {
    console.log('🍎 Veterans Care Navigator Backend');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API info: http://localhost:${PORT}/api`);
    
    if (!routesLoaded) {
      console.log('⚠️  Some routes failed to load - check logs above');
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

module.exports = app;
