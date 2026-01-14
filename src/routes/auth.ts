import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Superadmin, Admin, User } from '../models';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Superadmin Login
router.post('/superadmin/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const superadmin = await Superadmin.findOne({ where: { email } });
        if (!superadmin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await superadmin.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: superadmin.id, email: superadmin.email, role: 'superadmin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: superadmin.id,
                email: superadmin.email,
                name: superadmin.name,
                role: 'superadmin',
            },
        });
    } catch (error) {
        console.error('Superadmin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin Login
router.post('/admin/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ where: { email, isActive: true } });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await admin.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: 'admin',
            },
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User Login
router.post('/user/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email, isActive: true } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'user', adminId: user.adminId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: 'user',
                adminId: user.adminId,
            },
        });
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

export default router;
