import { Router, Response } from 'express';
import { User } from '../models';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all users for admin
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const whereClause = req.user?.role === 'admin'
            ? { adminId: req.user.id }
            : {};

        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'email', 'name', 'phone', 'isActive', 'adminId', 'createdAt'],
        });
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create user (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, name, phone } = req.body;
        const adminId = req.user?.id;

        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID required' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const user = await User.create({ email, password, name, phone, adminId });
        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                adminId: user.adminId,
            },
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, password, isActive } = req.body;

        const whereClause = req.user?.role === 'admin'
            ? { id, adminId: req.user.id }
            : { id };

        const user = await User.findOne({ where: whereClause });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (password) user.password = password;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const whereClause = req.user?.role === 'admin'
            ? { id, adminId: req.user.id }
            : { id };

        await User.destroy({ where: whereClause });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Change user password (admin only)
router.put('/:id/password', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const whereClause = req.user?.role === 'admin'
            ? { id, adminId: req.user.id }
            : { id };

        const user = await User.findOne({ where: whereClause });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

export default router;
