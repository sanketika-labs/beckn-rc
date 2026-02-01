import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Define config interface
interface Config {
    protected: string[];
}

let protectedPaths: string[] = [];

// Load config from config.json
try {
    // Check possible locations for config.json
    const possiblePaths = [
        path.resolve(__dirname, '../config.json'),        // dist/config.json
        path.resolve(__dirname, '../../src/config.json'),  // dist/middleware/../../src/config.json
        path.resolve(process.cwd(), 'src/config.json')    // root/src/config.json
    ];

    let configLoaded = false;
    for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config: Config = JSON.parse(configData);
            if (config.protected && Array.isArray(config.protected)) {
                protectedPaths = config.protected;
                console.log('Loaded protected route paths:', protectedPaths);
                configLoaded = true;
                break;
            }
        }
    }

    if (!configLoaded) {
        console.warn('config.json not found or invalid, all routes will be public.');
    }
} catch (error) {
    console.error('Error loading config.json:', error);
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // If path matches any protected pattern, check for auth token
    const isProtected = protectedPaths.some(pattern => req.path.includes(pattern));

    if (isProtected) {
        const token = req.headers['authorization'];
        const expectedToken = process.env.AUTH_TOKEN;

        if (!token || token !== expectedToken) {
            // Also allow 'Bearer <token>' format
            if (token && expectedToken && token.startsWith('Bearer ') && token.slice(7) === expectedToken) {
                return next();
            }
            return res.status(401).json({ message: 'Unauthorized' });
        }
    }

    // If not protected or auth passed, continue
    next();
};
