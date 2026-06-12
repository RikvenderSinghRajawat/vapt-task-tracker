require('dotenv').config();
const express = require('express');
const http = require('http');
const { createSocketServer, getIO } = require('./config/socket');
const socketService = require('./services/socketService');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimiter');
const { getStoragePaths, getUploadServePath } = require('./config/storage');

const storagePaths = getStoragePaths();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const findingRoutes = require('./routes/findings');
const reportRoutes = require('./routes/reports');
const milestoneRoutes = require('./routes/milestones');
const misRoutes = require('./routes/mis');
const noteRoutes = require('./routes/notes');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const reportConversionRoutes = require('./routes/reportConversion');
const systemRoutes = require('./routes/system');
const auditLogRoutes = require('./routes/auditLogs');
const requestRoutes = require('./routes/requests');
const quarterlyAuditRoutes = require('./routes/quarterlyAudits');
const vaptCalendarRoutes = require('./routes/vaptCalendar');
const taskRoutes = require('./routes/tasks');
const securityReportRoutes = require('./routes/securityReports');
const supportRoutes = require('./routes/support');
const firewallLogRoutes = require('./routes/firewallLogs');
const { protect } = require('./middleware/auth');
const { getAllFindings, bulkUploadFindings, exportAllFindingsCSV, exportAllFindingsExcel, bulkUpdateFindings } = require('./controllers/findingController');
const { requirePermission } = require('./middleware/auth');
const { PERMISSIONS } = require('./config/permissions');
const { createMemoryUploader } = require('./config/upload');
const findingsUpload = createMemoryUploader();

const { swaggerUi, specs } = require('./config/swagger');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', process.env.TRUST_PROXY || 1);

const io = createSocketServer(server);
socketService.init(io);
app.set('io', getIO());

app.use((req, res, next) => {
  res.locals = res.locals || {};
  res.locals.requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  req.id = res.locals.requestId;
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const os = require('os');

// Dynamically collect all local network IPs so LAN devices always work
const localIPs = new Set();
try {
  const ifaces = os.networkInterfaces();
  Object.values(ifaces || {}).forEach(entries => {
    (entries || []).forEach(iface => {
      if (iface && iface.family === 'IPv4' && !iface.internal) {
        localIPs.add(iface.address);
      }
    });
  });
} catch (_) {}

function isValidPrivateOrigin(origin) {
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return host === 'localhost' ||
           host === '127.0.0.1' ||
           host.startsWith('192.168.') ||
           host.startsWith('10.') ||
           /^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
  } catch { return false; }
}

const NETWORK_INTERFACES = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
];

// Add dynamically detected LAN IPs
localIPs.forEach(ip => {
  NETWORK_INTERFACES.push(`http://${ip}:3000`);
  NETWORK_INTERFACES.push(`http://${ip}:5000`);
});

if (process.env.FRONTEND_URL) {
  NETWORK_INTERFACES.push(process.env.FRONTEND_URL);
}
if (process.env.FRONTEND_ORIGINS) {
  process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()).filter(Boolean).forEach(o => NETWORK_INTERFACES.push(o));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, origin);
    const match = NETWORK_INTERFACES.some(a => {
      return a === origin || isValidPrivateOrigin(origin);
    });
    if (match) return callback(null, origin);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition', 'Content-Length'],
}));

app.options('*', cors());

app.use(apiLimiter);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? false : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(compression());
app.use(hpp());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const storageRoot = getUploadServePath();
console.log(`[Storage] Serving static files from: ${storageRoot}`);
app.use('/uploads', express.static(storageRoot, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  },
}));

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[DB] Health reconnect failed:', err.message);
    }
  }
  res.status(200).json({
    success: true,
    message: 'eKavach VAPT Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || '1.0.0',
    uptime: process.uptime(),
    storageRoot,
    database: {
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
  });
});

app.get('/api/socket-status', (req, res) => {
  res.json({
    success: true,
    connectedClients: io.engine?.clientsCount || 0,
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', findingRoutes);
app.use('/api/projects', reportRoutes);
app.use('/api/projects', milestoneRoutes);
app.use('/api/mis', misRoutes);
app.use('/api/notes', noteRoutes);
/**
 * @swagger
 * /api/findings:
 *   get:
 *     summary: Get all findings across projects
 *     tags: [Findings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: project
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of findings
 * /api/findings/export/csv:
 *   get:
 *     summary: Export findings as CSV
 *     tags: [Findings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 * /api/findings/bulk-status:
 *   put:
 *     summary: Bulk update finding statuses
 *     tags: [Findings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               findingIds:
 *                 type: array
 *                 items: { type: string }
 *               status:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk update result
 * /api/findings/bulk-upload:
 *   post:
 *     summary: Bulk upload findings
 *     tags: [Findings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Findings uploaded
 */
app.get('/api/findings', protect, getAllFindings);
app.get('/api/findings/export/csv', protect, exportAllFindingsCSV);
app.get('/api/findings/export/excel', protect, exportAllFindingsExcel);
app.put('/api/findings/bulk-status', protect, bulkUpdateFindings);
app.post('/api/findings/bulk-upload', protect, requirePermission(PERMISSIONS.FINDINGS_BULK_UPLOAD), findingsUpload.single('file'), bulkUploadFindings);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/report-conversion', reportConversionRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/quarterly-audits', quarterlyAuditRoutes);
app.use('/api/vapt-calendar', vaptCalendarRoutes);
app.use('/api/security-reports', securityReportRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/api-keys', require('./routes/apiKeys'));
app.use('/api/support', supportRoutes);
app.use('/api/firewall-logs', firewallLogRoutes);

const recycleBinController = require('./controllers/recycleBinController');
app.get('/api/recycle-bin', protect, recycleBinController.getRecycleBinItems);
app.post('/api/recycle-bin/restore/:entityType/:id', protect, recycleBinController.restoreItem);
app.delete('/api/recycle-bin/delete/:entityType/:id', protect, recycleBinController.permanentDeleteItem);
app.post('/api/recycle-bin/days-remaining', protect, recycleBinController.getDaysRemaining);

app.get('/api/analytics/projects/:projectId', protect, (req, res, next) => {
  const { getProjectPerformance } = require('./controllers/analyticsController');
  req.params.id = req.params.projectId;
  getProjectPerformance(req, res, next);
});

if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.resolve(__dirname, '../../frontend/build');
  if (fs.existsSync(frontendBuildPath)) {
    console.log(`[Production] Serving frontend build from: ${frontendBuildPath}`);
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
      }
    });
  }
}

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.id,
  });
});

let runningServer;
let serverInitialized = false;

const initializeServer = async () => {
  if (serverInitialized) return;
  serverInitialized = true;

  try {
    console.log(`[Storage] Root: ${storageRoot}`);
    console.log(`[Storage] Paths:`, Object.keys(storagePaths));

    console.log('[DB] Connecting to MongoDB...');
    await connectDB();
    console.log('[DB] MongoDB connected successfully');

    connectDB.startHealthMonitor?.();

    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections().toArray();
        const indexCleanupMap = {
          'projects': ['code_1'],
          'findings': ['findingId_1'],
          'reports': ['reportId_1']
        };
        for (const [collectionName, indexNames] of Object.entries(indexCleanupMap)) {
          if (collections.some(c => c.name === collectionName)) {
            for (const indexName of indexNames) {
              try {
                await db.collection(collectionName).dropIndex(indexName);
                console.log(`[DB] Dropped old index ${indexName} on ${collectionName}`);
              } catch (e) {}
            }
          }
        }
      }
    } catch (e) {
      console.warn('[DB] Index migration skipped (non-critical):', e.message);
    }

    require('./models/ReviewRequest');
    require('./models/VaptCalendar');
    const mongoose = require('mongoose');
    const models = ['User', 'Project', 'Finding', 'Milestone', 'Report', 'Notification', 'AuditLog', 'QuarterlyAudit', 'VaptCalendar', 'Task', 'ReviewRequest'];
    for (const modelName of models) {
      try {
        const model = mongoose.model(modelName);
        if (model && model.schema) {
          const indexes = Object.keys(model.schema.paths).filter(k => model.schema.paths[k]._index);
          if (indexes.length > 0) {
            await model.createIndexes();
          }
        }
      } catch (e) {}
    }

    const User = require('./models/User');
    const userCount = await User.countDocuments({ deletedAt: null });
    if (userCount === 0) {
      if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
        console.error('[DB] SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in backend/.env');
        process.exit(1);
      }
      const adminEmail = process.env.SUPER_ADMIN_EMAIL;
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
      const superAdmin = await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isActive: true,
        isVerified: true,
      });
      console.log(`[DB] Super admin created: ${superAdmin.email}`);
    } else {
      console.log(`[DB] ${userCount} user(s) found, skipping super admin creation`);
    }

    const { startScheduler } = require('./jobs/scheduler');
    startScheduler();

    const { startCollector } = require('./services/firewallLogService');
    startCollector();

    const PORT = process.env.PORT || 5000;
    runningServer = server.listen(PORT, '0.0.0.0', () => {
      console.log('==============================================');
      console.log('  eKavach VAPT Tracker API');
      console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Port: ${PORT}`);
      console.log(`  Host: 0.0.0.0`);
      console.log(`  Storage: ${storageRoot}`);
      console.log('==============================================');
      console.log(`  Local:    http://localhost:${PORT}`);
      console.log(`  Health:   http://localhost:${PORT}/api/health`);
      console.log(`  LAN:      http://<your-ip>:${PORT}`);
      console.log('==============================================');
    });
  } catch (err) {
    console.error('[Server] Failed to initialize:', err);
    serverInitialized = false;
    if (runningServer) {
      runningServer.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  initializeServer();
}

process.on('unhandledRejection', (err) => {
  console.error(`[Error] Unhandled Rejection: ${err.message}`);
});

process.on('uncaughtException', (err) => {
  console.error(`[Error] Uncaught Exception: ${err.message}`);
});

process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  const { closeDB } = require('./config/database');
  if (runningServer) {
    runningServer.close(async () => {
      await closeDB();
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  const { closeDB } = require('./config/database');
  if (runningServer) {
    runningServer.close(async () => {
      await closeDB();
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
});

module.exports = { app, server, io };
