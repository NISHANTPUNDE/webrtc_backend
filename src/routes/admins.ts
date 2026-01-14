import { Router, Response } from 'express';
import { Admin } from '../models';
import { AuthRequest, authenticate, requireSuperadmin } from '../middleware/auth';

const router = Router();

// Get all admins (superadmin only)
router.get('/', authenticate, requireSuperadmin, async (req: AuthRequest, res: Response) => {
    try {
        const admins = await Admin.findAll({
            attributes: ['id', 'email', 'name', 'phone', 'isActive', 'createdAt'],
        });
        res.json({ admins });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// Create admin (superadmin only)
router.post('/', authenticate, requireSuperadmin, async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, name, phone } = req.body;

        const existing = await Admin.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const admin = await Admin.create({ email, password, name, phone });
        res.status(201).json({
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                phone: admin.phone,
            },
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

// Update admin (superadmin only)
router.put('/:id', authenticate, requireSuperadmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, password, isActive } = req.body;

        const admin = await Admin.findByPk(id);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        if (name) admin.name = name;
        if (phone !== undefined) admin.phone = phone;
        if (password) admin.password = password;
        if (isActive !== undefined) admin.isActive = isActive;

        await admin.save();
        res.json({ message: 'Admin updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// Delete admin (superadmin only)
router.delete('/:id', authenticate, requireSuperadmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await Admin.destroy({ where: { id } });
        res.json({ message: 'Admin deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

export default router;
