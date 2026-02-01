import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const IDENTITY_URL = process.env.IDENTITY_URL;
const CREDENTIAL_URL = process.env.CREDENTIAL_URL;
const CREDSCHEMA_URL = process.env.CREDSCHEMA_URL;

if (!IDENTITY_URL || !CREDENTIAL_URL || !CREDSCHEMA_URL) {
    console.error('Service URLs are not defined in .env');
    process.exit(1);
}

// Apply authentication middleware globally
app.use(authMiddleware);

// Proxy configuration
const identityProxy = createProxyMiddleware({
    target: IDENTITY_URL,
    changeOrigin: true,
    pathRewrite: {
        // Keep path as is: /did -> /did
    },
    on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => {
            console.log(`[Identity] Proxying ${req.method} request to: ${IDENTITY_URL}${req.url}`);
        }
    }
});

const credentialProxy = createProxyMiddleware({
    target: CREDENTIAL_URL,
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => {
            console.log(`[Credential] Proxying ${req.method} request to: ${CREDENTIAL_URL}${req.url}`);
        }
    }
});

const credSchemaProxy = createProxyMiddleware({
    target: CREDSCHEMA_URL,
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => {
            console.log(`[CredSchema] Proxying ${req.method} request to: ${CREDSCHEMA_URL}${req.url}`);
        }
    }
});

// Routes
app.use('/identity', identityProxy);
app.use('/did', identityProxy);
app.use('/credential', credentialProxy);
app.use('/credentials', credentialProxy);
app.use('/credential-schema', credSchemaProxy);
app.use('/template', credSchemaProxy);

// Default route for health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'rc-wrapper' });
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
    console.log(`Identity URL: ${IDENTITY_URL}`);
    console.log(`Credential URL: ${CREDENTIAL_URL}`);
    console.log(`CredSchema URL: ${CREDSCHEMA_URL}`);
});
