import sequelize from '../config/database';
import Superadmin from './Superadmin';
import Admin from './Admin';
import User from './User';

export { sequelize, Superadmin, Admin, User };

// Initialize database and create default superadmin
export async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('Database synced.');

        // Create default superadmin if not exists
        const existingSuperadmin = await Superadmin.findOne({ where: { email: 'superadmin@admin.com' } });
        if (!existingSuperadmin) {
            await Superadmin.create({
                email: 'superadmin@admin.com',
                password: 'admin123',
                name: 'Super Admin',
            });
            console.log('Default superadmin created: superadmin@admin.com / admin123');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}
