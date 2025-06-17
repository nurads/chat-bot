import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, or } from 'drizzle-orm';
import { authenticateToken, generateToken } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();

// Public routes (no authentication needed)

// Protected routes (require authentication)
router.use(authenticateToken);

// Get all users (admin only - you might want to add role-based auth later)
router.get('/', async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
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

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await db.select().from(schema.users).where(eq(schema.users.email, email));

    console.log(user);

    if (user.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].passwordHash);

    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user[0].id);

    return res.json({ token, email: user[0].email, id: user[0].id, username: user[0].username });

});

router.post('/', async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    const users = await db.select().from(schema.users).where(or(eq(schema.users.email, email), eq(schema.users.username, username)));

    if (users.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await db.insert(schema.users).values({ username, email, passwordHash: hashedPassword }).returning();
    const token = generateToken(user[0].id);

    return res.json({ token, email: user[0].email, id: user[0].id, username: user[0].username });
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Users can only access their own profile or this could be admin-only
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (req.user?.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }

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

export default router; 