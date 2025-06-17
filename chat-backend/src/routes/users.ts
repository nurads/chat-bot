import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
const router = Router();

// Get all users
router.get('/', async (req: Request, res: Response) => {
    try {
        const users = await db.select({
            id: schema.users.id,
            username: schema.users.username,
            email: schema.users.email,
            createdAt: schema.users.createdAt,
            updatedAt: schema.users.updatedAt,
        }).from(schema.users);

        return res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await db.select({
            id: schema.users.id,
            username: schema.users.username,
            email: schema.users.email,
            createdAt: schema.users.createdAt,
            updatedAt: schema.users.updatedAt,
        }).from(schema.users).where(eq(schema.users.id, id));

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(user[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/', async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['username', 'email', 'password']
            });
        }

        const newUser = await db.insert(schema.users).values({
            username,
            email,
            passwordHash: await bcrypt.hash(password, 10),
        }).returning({
            id: schema.users.id,
            username: schema.users.username,
            email: schema.users.email,
            createdAt: schema.users.createdAt,
            updatedAt: schema.users.updatedAt,
        });

        return res.status(201).json(newUser[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error instanceof Error && error.message.includes('unique')) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
    }
});

export default router; 