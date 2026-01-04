import express, { Router } from 'express';
import * as AdminController from '../controllers/adminController';

const router = express.Router();

/**
 * @swagger
 * /v1/admins:
 *   post:
 *     summary: Create a new admin
 *     tags: [Admins]
 *     parameters:
 *       - in: header
 *         name: domainname
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name for the admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the admin
 *               email:
 *                 type: string
 *                 description: Email of the admin
 *               role:
 *                 type: string
 *                 description: Role of the admin
 *     responses:
 *       200:
 *         description: Admin created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', AdminController.createAdmin);

/**
 * @swagger
 * /v1/admins/{id}:
 *   get:
 *     summary: Get an admin by ID
 *     tags: [Admins]
 *     parameters:
 *       - in: header
 *         name: domainname
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name for the admin
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin to retrieve
 *     responses:
 *       200:
 *         description: Admin retrieved successfully
 *       404:
 *         description: Admin not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', AdminController.getAdminById);

/**
 * @swagger
 * /v1/admins:
 *   get:
 *     summary: Get all admins with pagination and filtering
 *     tags: [Admins]
 *     parameters:
 *       - in: header
 *         name: domainname
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name for the admins
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of admins to retrieve
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of admins to skip
 *       - in: query
 *         name: columnNames
 *         schema:
 *           type: string
 *         description: Columns to retrieve
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter admins
 *     responses:
 *       200:
 *         description: Admins retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', AdminController.getAllAdmins);

/**
 * @swagger
 * /v1/admins/{id}:
 *   put:
 *     summary: Update an admin by ID
 *     tags: [Admins]
 *     parameters:
 *       - in: header
 *         name: domainname
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name for the admin
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated name of the admin
 *               email:
 *                 type: string
 *                 description: Updated email of the admin
 *               role:
 *                 type: string
 *                 description: Updated role of the admin
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.put('/:id', AdminController.updateAdminById);

/**
 * @swagger
 * /v1/admins/get/count:
 *   get:
 *     summary: Count the number of admins
 *     tags: [Admins]
 *     parameters:
 *       - in: header
 *         name: domainname
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name for the admins
 *     responses:
 *       200:
 *         description: Admin count retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/get/count', AdminController.countAdmins);

/**
 * @swagger
 * /v1/admins/get/dropdown:
 *   get:
 *     summary: Get admins for dropdown
 *     tags: [Admins]
 *     parameters:
 *       - in: header
 *         name: domainname
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name for the admins
 *     responses:
 *       200:
 *         description: Admins dropdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/get/dropdown', AdminController.getAdminsDropdown);

export default router;