import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthSDK } from '@manjunath-davanam/beckn-auth-sdk';

// Define config interface
interface Config {
    protected: string[];
}

let protectedPaths: string[] = [];

// Load config from config.json
try {
    const possiblePaths = [
        path.resolve(__dirname, '../config.json'),
        path.resolve(__dirname, '../../src/config.json'),
        path.resolve(process.cwd(), 'src/config.json')
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

// Initialize AuthSDK
const authSDK = new AuthSDK({
    baseUrl: process.env.REGISTRY_URL || 'https://registry.becknprotocol.io/subscribers',
    registryName: process.env.REGISTRY_NAME || 'lookup',
});

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // If path matches any protected pattern, check for Beckn signature
    const isProtected = protectedPaths.some(pattern => req.path.includes(pattern));

    if (isProtected) {
        try {
            // Attempt to authorize using Beckn Auth SDK (requires Authorization header)
            await authSDK.authorize(req as any);
            return next();
        } catch (error: any) {
            console.error('Beckn signature verification failed:', error.message);
            return res.status(401).json({
                message: 'Invalid or missing Beckn signature',
                error: error.message
            });
        }
    }

    // If not protected, continue normally
    next();
};
