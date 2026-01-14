import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface AdminAttributes {
    id: number;
    email: string;
    password: string;
    name: string;
    phone?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface AdminCreationAttributes extends Optional<AdminAttributes, 'id' | 'isActive'> { }

class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
    public id!: number;
    public email!: string;
    public password!: string;
    public name!: string;
    public phone?: string;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    async comparePassword(candidatePassword: string): Promise<boolean> {
        return bcrypt.compare(candidatePassword, this.password);
    }
}

Admin.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'admins',
        hooks: {
            beforeCreate: async (admin) => {
                admin.password = await bcrypt.hash(admin.password, 10);
            },
            beforeUpdate: async (admin) => {
                if (admin.changed('password')) {
                    admin.password = await bcrypt.hash(admin.password, 10);
                }
            },
        },
    }
);

export default Admin;
