import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import logger from '../utils/logger';
import { createAdminSchema, updateAdminSchema, readByIdAdminSchema } from '../validations/adminValidation';

/**
 * Create a new admin with hashed password.
 */
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = createAdminSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const adminData = req.body;
    const { domainname } = req.headers;

    // Hash the password before saving
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
    adminData.password = hashedPassword;
    console.log("adminData", adminData)

    const adminId = await adminService.createAdmin({ ...adminData }, domainname as string);
    logger.info(`Admin created with ID: ${adminId}`);
    res.status(200).json({ message: 'Admin created successfully', data: { id: adminId } });
  } catch (error: any) {
    logger.error('Error creating admin', { message: error.message, stack: error.stack });
    res.status(500).json({ message: error.message, error: error });
  }
};
