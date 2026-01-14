import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface SuperadminAttributes {
    id: number;
    email: string;
    password: string;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SuperadminCreationAttributes extends Optional<SuperadminAttributes, 'id'> { }

class Superadmin extends Model<SuperadminAttributes, SuperadminCreationAttributes>
    implements SuperadminAttributes {
    public id!: number;
    public email!: string;
    public password!: string;
    public name!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    async comparePassword(candidatePassword: string): Promise<boolean> {
        return bcrypt.compare(candidatePassword, this.password);
    }
}

Superadmin.init(
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
    },
    {
        sequelize,
        tableName: 'superadmins',
        hooks: {
            beforeCreate: async (superadmin) => {
                superadmin.password = await bcrypt.hash(superadmin.password, 10);
            },
            beforeUpdate: async (superadmin) => {
                if (superadmin.changed('password')) {
                    superadmin.password = await bcrypt.hash(superadmin.password, 10);
                }
            },
        },
    }
);

export default Superadmin;
