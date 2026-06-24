"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("./db"));
const erp_1 = require("./services/erp");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Key Authentication middleware (if ERP/external calls are made)
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ERP_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
};
// 1. GET /api/projects - List all projects with summaries
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await db_1.default.project.findMany({
            include: {
                tasks: true
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 2. GET /api/projects/:id - Detailed project info
app.get('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const project = await db_1.default.project.findUnique({
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 3. POST /api/sync - Manual ERP data sync
app.post('/api/sync', async (req, res) => {
    try {
        console.log('[API] Triggering manual ERP Sync...');
        const result = await (0, erp_1.syncERPData)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 4. GET /api/config - Get current configurations
app.get('/api/config', async (req, res) => {
    try {
        let config = await db_1.default.config.findUnique({ where: { id: 'default' } });
        if (!config) {
            config = await db_1.default.config.create({ data: {} });
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 5. PUT /api/config - Update configurations
app.put('/api/config', async (req, res) => {
    try {
        const data = req.body;
        const config = await db_1.default.config.upsert({
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 6. GET /api/mock-erp/projects - Mock ERP Endpoint
app.get('/api/mock-erp/projects', authenticateApiKey, (req, res) => {
    const data = (0, erp_1.getMockERPData)();
    res.json(data);
});
// Start Server
app.listen(port, async () => {
    console.log(`[SERVER] ERP Project Health Middleware listening on port ${port}`);
    // Seed initial configuration and run boot-time sync
    try {
        let config = await db_1.default.config.findUnique({ where: { id: 'default' } });
        if (!config) {
            await db_1.default.config.create({ data: {} });
            console.log('[DB] Default configuration initialized.');
        }
        console.log('[SERVER] Running initial ERP sync...');
        await (0, erp_1.syncERPData)();
        console.log('[SERVER] Initial sync completed.');
    }
    catch (err) {
        console.error('[SERVER] Boot sync failed:', err);
    }
    // Setup cron: Sync every 10 minutes
    node_cron_1.default.schedule('*/10 * * * *', async () => {
        console.log('[CRON] Starting scheduled ERP sync...');
        const result = await (0, erp_1.syncERPData)();
        console.log(`[CRON] Sync finished: ${result.syncedProjectsCount} projects synced.`);
    });
});
