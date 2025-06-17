import { sign, verify } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { Secret, SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                email: string;
            };
        }
    }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return next();
    }

    try {
        const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

        // Fetch user from database to ensure they still exist
        const users = await db.select({
            id: schema.users.id,
            username: schema.users.username,
            email: schema.users.email,
        }).from(schema.users).where(eq(schema.users.id, decoded.userId));

        if (users.length === 0) {
            return next();
        }

        req.user = users[0];
        return next();
    } catch (error) {
        console.error('Token verification error:', error);
        return next();
    }
};

export const generateToken = (userId: string): string => {
    const secretOrPrivateKey: Secret = process.env.JWT_SECRET || 'fallback-secret';

    // const secret = process.env.JWT_SECRET;

    // if (!secret) {
    //     throw new Error('JWT_SECRET is not defined');
    // }

    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const options: SignOptions = {
        expiresIn: '24h', // Token expires in 1 hour
        algorithm: 'HS256', // Algorithm used for signing (HMAC SHA256)
    };


    return sign(
        { userId },
        secretOrPrivateKey,
        options
    );
}; 