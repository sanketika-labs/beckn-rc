import { Request, Response, NextFunction } from 'express';
import { AuthSDK } from '@manjunath-davanam/beckn-auth-sdk';

// Initialize AuthSDK
const authSDK = new AuthSDK({
    baseUrl: process.env.REGISTRY_URL || 'https://api.testnet.beckn.one/registry/dedi/lookup',
    registryName: process.env.REGISTRY_NAME || 'subscribers.beckn.one',
});

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    let currentProtectedPaths: string[] = [];

    // Load protected paths from environment variable
    if (process.env.PROTECTED_PATHS) {
        currentProtectedPaths = process.env.PROTECTED_PATHS
            .split(',')
            .map(p => p.trim())
            .filter(p => p !== '');
    }

    // If path matches any protected pattern, check for authorization signature
    const isProtected = currentProtectedPaths.some(pattern => req.path.includes(pattern));

    if (isProtected) {
        console.log(`[Auth] Verifying authorization signature for protected path: ${req.path}`);
        try {
            // Attempt to authorize using Auth SDK (requires Authorization header)
            await authSDK.authorize(req as any);
            console.log(`[Auth] Signature verified successfully for: ${req.path}`);
            return next();
        } catch (error: any) {
            console.error(`[Auth] Authorization signature verification failed for ${req.path}:`, error.message);
            return res.status(401).json({
                message: 'Invalid or missing authorization signature',
                error: error.message
            });
        }
    }

    // If not protected, continue normally
    next();
};
