import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, '../../recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
}

// Configure multer for file uploads - organize by roomId
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const roomId = req.body.roomId || 'unknown';
        const roomDir = path.join(recordingsDir, roomId);
        if (!fs.existsSync(roomDir)) {
            fs.mkdirSync(roomDir, { recursive: true });
        }
        cb(null, roomDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const clientId = req.body.clientId || 'unknown';
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `${clientId}_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.webm', '.wav', '.mp3', '.ogg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext) || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files allowed.'));
        }
    }
});

async function mergeRoomRecordings(roomId: string): Promise<string | null> {
    const roomDir = path.join(recordingsDir, roomId);
    if (!fs.existsSync(roomDir)) return null;

    const files = fs.readdirSync(roomDir)
        .filter(f => f.endsWith('.webm') && !f.startsWith('merged_'));

    if (files.length <= 1) return null;

    const inputs = files.map(f => `-i "${path.join(roomDir, f)}"`).join(' ');

    // Delete previous merged files for this room to avoid duplicates
    const existingMerged = fs.readdirSync(recordingsDir)
        .filter(f => f.startsWith(`merged_${roomId}_`) && f.endsWith('.webm'));

    existingMerged.forEach(f => {
        try {
            fs.unlinkSync(path.join(recordingsDir, f));
        } catch (e) {
            console.error('[MERGE] Failed to delete old merge:', e);
        }
    });

    const outputFilename = `merged_${roomId}_${Date.now()}.webm`;
    const outputPath = path.join(recordingsDir, outputFilename);
    const cmd = `ffmpeg ${inputs} -filter_complex amix=inputs=${files.length}:duration=longest "${outputPath}"`;

    console.log('[MERGE] Executing:', cmd);

    try {
        await execAsync(cmd);
        console.log(`[MERGE] Created merged file: ${outputFilename}`);
        return outputFilename;
    } catch (error) {
        console.error('[MERGE] FFmpeg error:', error);
        return null;
    }
}

/**
 * @swagger
 * /v1/recordings/upload:
 *   post:
 *     summary: Upload a new recording
 *     tags: [Recordings]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: recording
 *         type: file
 *         description: The audio recording file (webm, wav, mp3, ogg)
 *         required: true
 *       - in: formData
 *         name: roomId
 *         type: string
 *         description: ID of the room the recording belongs to
 *       - in: formData
 *         name: clientId
 *         type: string
 *         description: ID of the client who recorded
 *       - in: formData
 *         name: duration
 *         type: integer
 *         description: Duration of the recording in milliseconds
 *     responses:
 *       201:
 *         description: Recording uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 mergedFile:
 *                   type: string
 *                   description: Filename of the merged recording if auto-merge was triggered
 *       400:
 *         description: No file uploaded or invalid file type
 */
router.post('/upload', upload.single('recording'), async (req: Request, res: Response) => {
    console.log('[UPLOAD] Received upload request');
    console.log('[UPLOAD] Body:', req.body);
    console.log('[UPLOAD] File:', req.file ? req.file.filename : 'No file');

    if (!req.file) {
        console.error('[UPLOAD] Error: No file uploaded');
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const { roomId, clientId, duration } = req.body;
    console.log(`[UPLOAD] Processing upload for room ${roomId} from client ${clientId}`);

    // Check if we should auto-merge (if another file exists for this room)
    const roomDir = path.join(recordingsDir, roomId || 'unknown');
    let mergedFile = null;

    if (fs.existsSync(roomDir)) {
        const files = fs.readdirSync(roomDir).filter(f => f.endsWith('.webm'));
        if (files.length > 1) { // We have at least 2 files now
            mergedFile = await mergeRoomRecordings(roomId);
        }
    }

    res.status(201).json({
        message: 'Recording uploaded successfully',
        filename: req.file.filename,
        mergedFile
    });
});

/**
 * @swagger
 * /v1/recordings:
 *   get:
 *     summary: List all recordings
 *     tags: [Recordings]
 *     responses:
 *       200:
 *         description: List of recordings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   filename:
 *                     type: string
 *                   size:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   url:
 *                     type: string
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const getAllFiles = (dir: string): string[] => {
            let results: string[] = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getAllFiles(filePath));
                } else {
                    results.push(filePath);
                }
            });
            return results;
        };

        const allFiles = getAllFiles(recordingsDir);

        const recordings = allFiles
            .filter(f => ['.webm', '.wav', '.mp3', '.ogg'].includes(path.extname(f).toLowerCase()))
            .map(filepath => {
                const filename = path.basename(filepath);
                // Determine relative path from recordingsDir for URL
                const relativePath = path.relative(recordingsDir, filepath).replace(/\\/g, '/');

                const stats = fs.statSync(filepath);
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    url: `/v1/recordings/${relativePath}`
                };
            })
            // Sort by creation time desc
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(recordings);
    } catch (error) {
        console.error('Error listing recordings:', error);
        res.status(500).json({ error: 'Failed to list recordings' });
    }
});

/**
 * Serve recording files.
 * Uses express.static to handle file serving, ranges, and subdirectories automatically.
 * Mounted at /v1/recordings/
 */
router.use('/', express.static(recordingsDir, {
    index: false, // Don't serve index.html
    fallthrough: false // 404 if file not found
}));

/**
 * Delete a recording
 * DELETE /v1/recordings/:filename
 */
router.delete('/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    const filepath = path.join(recordingsDir, filename);

    if (!fs.existsSync(filepath)) {
        res.status(404).json({ error: 'Recording not found' });
        return;
    }

    try {
        fs.unlinkSync(filepath);
        res.json({ message: 'Recording deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

export default router;
