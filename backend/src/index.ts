import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import prisma from './db';
import { syncERPData, getMockERPData } from './services/erp';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Key Authentication middleware (if ERP/external calls are made)
const authenticateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.ERP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// 1. GET /api/projects - List all projects with summaries
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 2. GET /api/projects/:id - Detailed project info
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: {
            endDate: 'asc'
          }
        },
        healthLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 15
        },
        alertLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 10
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 3. POST /api/sync - Manual ERP data sync
app.post('/api/sync', async (req, res) => {
  try {
    console.log('[API] Triggering manual ERP Sync...');
    const result = await syncERPData();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 4. GET /api/config - Get current configurations
app.get('/api/config', async (req, res) => {
  try {
    let config = await prisma.config.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.config.create({ data: {} });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 5. PUT /api/config - Update configurations
app.put('/api/config', async (req, res) => {
  try {
    const data = req.body;
    const config = await prisma.config.upsert({
      where: { id: 'default' },
      update: {
        thresholdWarning: data.thresholdWarning,
        thresholdCritical: data.thresholdCritical,
        weightOverdueTask: data.weightOverdueTask,
        weightCriticalOverdue: data.weightCriticalOverdue,
        weightMilestoneDelay: data.weightMilestoneDelay,
        weightProgressVariance: data.weightProgressVariance,
        emailAdmin: data.emailAdmin,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUser: data.smtpUser,
        smtpPass: data.smtpPass,
        slackWebhookUrl: data.slackWebhookUrl,
        aiPromptTemplate: data.aiPromptTemplate,
      },
      create: {
        id: 'default',
        ...data
      }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 6. GET /api/mock-erp/projects - Mock ERP Endpoint
app.get('/api/mock-erp/projects', authenticateApiKey, (req, res) => {
  const data = getMockERPData();
  res.json(data);
});

// Start Server
app.listen(port, async () => {
  console.log(`[SERVER] ERP Project Health Middleware listening on port ${port}`);
  
  // Seed initial configuration and run boot-time sync
  try {
    let config = await prisma.config.findUnique({ where: { id: 'default' } });
    if (!config) {
      await prisma.config.create({ data: {} });
      console.log('[DB] Default configuration initialized.');
    }
    
    console.log('[SERVER] Running initial ERP sync...');
    await syncERPData();
    console.log('[SERVER] Initial sync completed.');
  } catch (err) {
    console.error('[SERVER] Boot sync failed:', err);
  }

  // Setup cron: Sync every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[CRON] Starting scheduled ERP sync...');
    const result = await syncERPData();
    console.log(`[CRON] Sync finished: ${result.syncedProjectsCount} projects synced.`);
  });
});
