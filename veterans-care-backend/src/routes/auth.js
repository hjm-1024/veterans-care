const express = require('express');
const jwt = require('jsonwebtoken');
const { User, VeteranType } = require('../models');
const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, veteranTypeId } = req.body;

    // 이메일 중복 체크
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // 사용자 생성
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      veteranTypeId
    });

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 사용자 찾기
    const user = await User.findOne({ 
      where: { email, isActive: true },
      include: [{ model: VeteranType, as: 'VeteranType' }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 비밀번호 확인
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 마지막 로그인 시간 업데이트
    await user.update({ lastLoginAt: new Date() });

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// 프로필 조회 (인증 필요)
router.get('/profile', async (req, res) => {
  try {
    // 간단한 토큰 검증 (실제로는 middleware 사용)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: VeteranType, as: 'VeteranType' }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

module.exports = router;
