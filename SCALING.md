# Scaling Strategies for Porla Backend

This document outlines practical strategies to scale the Porla backend from MVP to enterprise level.

## Current State

- Single Node.js process
- MongoDB database (likely single instance)
- In-memory rate limiting
- Synchronous error handling
- No caching layer

## Phase 1: Immediate Optimizations (Week 1-2)

### 1.1 Database Indexing
**Effort:** Low | **Impact:** High

```javascript
// Already done for Q&A
qnaSchema.index({ isPublished: 1, answeredAt: -1 });

// Add these indexes to User model
userSchema.index({ email: 1 });
userSchema.index({ isPro: 1, proExpiresAt: 1 });
userSchema.index({ createdAt: -1 });

// Add to Cycle
cycleSchema.index({ userId: 1, startDate: -1 });

// Add to Notification
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// Add to Course
courseSchema.index({ isActive: 1, order: 1 });
```

### 1.2 Query Optimization
**Effort:** Low | **Impact:** Medium

```javascript
// src/services/courseService.js

// BEFORE: N+1 query problem
const courses = await Course.find({ isActive: true });
const withLessonCount = await Promise.all(
  courses.map(c => Lesson.countDocuments({ courseId: c._id }))
);

// AFTER: Single aggregation query
const coursesWithCount = await Course.aggregate([
  { $match: { isActive: true } },
  {
    $lookup: {
      from: 'lessons',
      localField: '_id',
      foreignField: 'courseId',
      as: 'lessons'
    }
  },
  {
    $project: {
      title: 1,
      description: 1,
      lessonCount: { $size: '$lessons' }
    }
  }
]);
```

### 1.3 Response Compression
**Effort:** Low | **Impact:** Medium

```javascript
// src/index.js
const compression = require('compression');

app.use(compression());

// Also limit JSON field selection
courseRoutes.get('/', protect, (req, res, next) => {
  // Only send necessary fields
  Course.find({ isActive: true })
    .select('title description isPro order')
    .lean() // Return plain objects, not Mongoose documents
    .exec()
});
```

## Phase 2: Caching Layer (Week 2-3)

### 2.1 Redis Integration
**Effort:** Medium | **Impact:** High

```javascript
// src/config/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const cache = {
  async get(key) {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key, value, ttl = 3600) {
    await client.setex(key, ttl, JSON.stringify(value));
  },
  
  async invalidate(pattern) {
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(...keys);
  }
};

module.exports = cache;
```

### 2.2 Caching Strategy
**Implementation:**

```javascript
// src/services/courseService.js
const cache = require('../config/cache');

async getAllCourses(user) {
  const cacheKey = `courses:all:${user.isPro ? 'pro' : 'free'}`;
  
  // Try cache first
  let courses = await cache.get(cacheKey);
  if (courses) return courses;
  
  // Database fallback
  courses = await Course.find({ isActive: true }).sort('order').lean();
  
  // Cache for 1 hour
  await cache.set(cacheKey, courses, 3600);
  
  return courses;
}

// Invalidate on update
async updateCourse(courseId, updates) {
  const course = await Course.findByIdAndUpdate(courseId, updates);
  await cache.invalidate('courses:*');
  return course;
}
```

**Cache Keys Strategy:**
```
courses:all:pro        → All pro courses
courses:all:free       → All free courses
tips:today             → Today's tip (refresh daily)
user:{id}:profile      → User profile (TTL: 1 hour)
notifications:{id}:*   → User notifications (TTL: 5 min)
```

## Phase 3: Horizontal Scaling (Week 3-4)

### 3.1 Multi-Process Architecture
**Effort:** Medium | **Impact:** High

```javascript
// src/cluster.js
const cluster = require('cluster');
const os = require('os');
const app = require('./index');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Respawn
  });
} else {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT);
  console.log(`Worker ${process.pid} started`);
}
```

**Update package.json:**
```json
{
  "scripts": {
    "start": "node src/cluster.js",
    "start:single": "node src/index.js"
  }
}
```

### 3.2 Load Balancing with Nginx
**Effort:** Low | **Impact:** High**

```nginx
# nginx.conf
upstream porla_backend {
  least_conn;
  server localhost:5001;
  server localhost:5002;
  server localhost:5003;
  server localhost:5004;
}

server {
  listen 80;
  server_name api.porla.uz;
  
  location / {
    proxy_pass http://porla_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "upgrade";
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

**Run multiple instances:**
```bash
PORT=5001 npm start &
PORT=5002 npm start &
PORT=5003 npm start &
PORT=5004 npm start &
```

## Phase 4: Asynchronous Job Processing (Week 4-5)

### 4.1 Bull Queue Integration
**Effort:** Medium | **Impact:** High**

```javascript
// src/config/queue.js
const Queue = require('bull');

const emailQueue = new Queue('email', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

const notificationQueue = new Queue('notifications', { redis: {...} });

// Process jobs
emailQueue.process(async (job) => {
  // Send email
  console.log(`Sending email to ${job.data.email}`);
  return { success: true };
});

module.exports = {
  emailQueue,
  notificationQueue
};
```

### 4.2 Async Operations
**Effort:** Low | **Impact:** Medium**

```javascript
// src/services/notificationService.js
const { notificationQueue } = require('../config/queue');

async broadcastNotification(title, message, type, onlyPro) {
  const users = await User.find(onlyPro ? { isPro: true } : {});
  
  // Queue async job instead of blocking
  await notificationQueue.add({
    users: users.map(u => u._id),
    title,
    message,
    type
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
  
  return { queued: users.length };
}
```

## Phase 5: Database Optimization (Week 5-6)

### 5.1 Read Replicas
**Effort:** High | **Impact:** High**

```javascript
// src/config/database.js
const mongoose = require('mongoose');

const readConnection = mongoose.createConnection(
  process.env.MONGODB_READ_REPLICA_URI
);

// For read-heavy operations
async function getPublicQAs(page, limit) {
  return Qna
    .find({ isPublished: true })
    .connection(readConnection) // Use read replica
    .limit(limit);
}
```

### 5.2 Connection Pooling
**Effort:** Low | **Impact:** Medium**

```javascript
// src/config/database.js
const connectionOptions = {
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
};

mongoose.connect(
  process.env.MONGODB_URI,
  connectionOptions
);
```

### 5.3 Document Archiving
**Effort:** Medium | **Impact:** Medium**

```javascript
// Cron job to archive old data
const cron = require('node-cron');

cron.schedule('0 2 * * *', async () => {
  // Archive notifications older than 1 year
  const cutoff = new Date(Date.now() - 365 * 86400000);
  
  const archived = await Notification.find({
    createdAt: { $lt: cutoff }
  });
  
  if (archived.length) {
    await db.collection('archived_notifications').insertMany(archived);
    await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  }
});
```

## Phase 6: Monitoring & Observability (Week 6+)

### 6.1 Logging with Winston
**Effort:** Medium | **Impact:** High**

```javascript
// src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ]
});

module.exports = logger;
```

### 6.2 Error Tracking with Sentry
**Effort:** Low | **Impact:** High**

```javascript
// src/index.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.errorHandler());
```

### 6.3 Performance Monitoring
**Effort:** Medium | **Impact:** High**

```javascript
// src/middlewares/metrics.js
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

module.exports = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    }, duration);
  });
  
  next();
};
```

## Phase 7: API Documentation & Versioning (Week 7+)

### 7.1 Swagger/OpenAPI
**Effort:** Medium | **Impact:** Medium**

```javascript
// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Porla API',
      version: '2.0.0',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Dev' },
      { url: 'https://api.porla.uz', description: 'Prod' },
    ],
  },
  apis: ['src/routes/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
```

### 7.2 API Versioning
**Effort:** Medium | **Impact:** Medium**

```javascript
// src/index.js
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/courses', courseRoutes);
// Keep v1 routes for backward compatibility
app.use('/api/v1/auth', authRoutesV1);
```

## Scaling Timeline

```
Week 1-2:  Phase 1 (Indexing, Query Optimization)
Week 2-3:  Phase 2 (Redis Caching)
Week 3-4:  Phase 3 (Horizontal Scaling)
Week 4-5:  Phase 4 (Async Jobs)
Week 5-6:  Phase 5 (Database Optimization)
Week 6+:   Phase 6 (Monitoring)
Week 7+:   Phase 7 (Documentation)
```

## Expected Results

### Before Optimization
- Single server: ~1,000 req/s
- P99 latency: ~500ms
- Database CPU: 80%

### After All Phases
- 4-server cluster: ~8,000+ req/s
- P99 latency: ~50ms
- Database CPU: <30%
- Cost: 2-3x increase

## Monitoring Checklist

- [ ] Setup Prometheus for metrics
- [ ] Configure Sentry for errors
- [ ] Setup CloudWatch/DataDog for infrastructure
- [ ] Create dashboards for key metrics
- [ ] Setup alerting thresholds
- [ ] Monitor database performance
- [ ] Track API latency
- [ ] Monitor error rates
- [ ] Setup uptime monitoring

## Estimated Costs (AWS)

| Phase | EC2 | RDS | ElastiCache | Total/Month |
|-------|-----|-----|-------------|------------|
| Current | $30 | $20 | - | $50 |
| Phase 1-2 | $50 | $50 | $20 | $120 |
| Phase 3 | $100 | $100 | $40 | $240 |
| Phase 4 | $100 | $100 | $80 | $280 |
| Phase 5 | $150 | $200 | $100 | $450 |
| Phase 6+ | $200+ | $300+ | $150+ | $650+ |

---

**Remember:** Don't optimize prematurely. Implement when you hit real bottlenecks!

**Latest Update:** March 17, 2026
