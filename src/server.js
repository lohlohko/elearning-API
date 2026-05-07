require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const corsOptions = require('./config/cors');
const { connectDB } = require('./config/database');
const routes = require('./routes');
const os = require('os');

//function get IP
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        !iface.address.startsWith('172')
      ) {
        return iface.address;
      }
    }
  }

  return 'localhost';
};


const app = express();
const PORT = process.env.PORT || 3005;
// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to API IT Helpdesk!!!',
    status: 'Running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

const UPLOAD_TIMEOUT_MS = Number.parseInt(process.env.UPLOAD_TIMEOUT_MS, 10) || 30 * 60 * 1000;

const server = app.listen(PORT, '0.0.0.0', async () => {
  await connectDB();

  const localIP = getLocalIP();

  console.log('='.repeat(50));
  console.log(`Server Local    : http://localhost:${PORT}`);
  console.log(`Network URL     : http://${localIP}:${PORT}`);
  console.log(`Database        :`, process.env.DB_NAME);
  console.log(`Upload Timeout  : ${UPLOAD_TIMEOUT_MS / 1000}s (${UPLOAD_TIMEOUT_MS / 60000} menit)`);
  console.log('='.repeat(50));
});

// Set timeout di level HTTP server (bukan per-route) agar berlaku untuk semua koneksi.
// Ini yang akan prevent "socket hang up" saat upload file besar.
server.timeout = UPLOAD_TIMEOUT_MS;
server.keepAliveTimeout = UPLOAD_TIMEOUT_MS;