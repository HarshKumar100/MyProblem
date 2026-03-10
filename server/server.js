const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to MongoDB
connectDB();

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/problems', require('./routes/problemRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MyProblem API running', timestamp: new Date() });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = parseInt(process.env.BACKEND_PORT, 10) || 8080;
app.listen(PORT, () => {
  console.log(`\n  MyProblem Server running at http://localhost:${PORT}`);
  console.log(`  NLP Service expected at ${process.env.NLP_SERVICE_URL || 'http://localhost:5001'}\n`);
});

module.exports = app;
