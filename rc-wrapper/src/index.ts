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

// Important: Beckn verification requires the raw request body
app.use(express.json({
    verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// Apply authentication middleware globally
app.use(authMiddleware);

// Proxy configuration
const createBecknProxy = (target: string) => createProxyMiddleware({
    target: target,
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => {
            console.log(`[Proxy] Forwarding ${req.method} ${req.url} to: ${target}`);

            // Fix: Restream the body if it was parsed by express.json()
            // We use rawBody to ensure absolute payload integrity (no tampering)
            const expressReq = req as any;
            const bodyData = expressReq.rawBody !== undefined ? expressReq.rawBody :
                (expressReq.body && Object.keys(expressReq.body).length > 0 ? JSON.stringify(expressReq.body) : null);

            if (bodyData !== null) {
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        }
    }
});

const identityProxy = createBecknProxy(IDENTITY_URL);
const didProxy = createBecknProxy(IDENTITY_URL);
const credentialProxy = createBecknProxy(CREDENTIAL_URL);
const credentialsProxy = createBecknProxy(CREDENTIAL_URL);
const credSchemaProxy = createBecknProxy(CREDSCHEMA_URL);
const templateProxy = createBecknProxy(CREDSCHEMA_URL);

// Routes
app.use('/identity', identityProxy);
app.use('/did', didProxy);
app.use('/credential', credentialProxy);
app.use('/credentials', credentialsProxy);
app.use('/credential-schema', credSchemaProxy);
app.use('/template', templateProxy);

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
