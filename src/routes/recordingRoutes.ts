import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, '../../recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, recordingsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `recording_${timestamp}${ext}`);
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

/**
 * Upload a recording
 * POST /v1/recordings/upload
 */
router.post('/upload', upload.single('recording'), (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const { roomId, clientId, duration } = req.body;

    res.status(201).json({
        message: 'Recording uploaded successfully',
        filename: req.file.filename,
        size: req.file.size,
        roomId,
        clientId,
        duration
    });
});

/**
 * List all recordings
 * GET /v1/recordings
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const files = fs.readdirSync(recordingsDir);
        const recordings = files
            .filter(f => ['.webm', '.wav', '.mp3', '.ogg'].includes(path.extname(f).toLowerCase()))
            .map(filename => {
                const filepath = path.join(recordingsDir, filename);
                const stats = fs.statSync(filepath);
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    url: `/v1/recordings/${filename}`
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ recordings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list recordings' });
    }
});

/**
 * Get/stream a specific recording
 * GET /v1/recordings/:filename
 */
router.get('/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    const filepath = path.join(recordingsDir, filename);

    if (!fs.existsSync(filepath)) {
        res.status(404).json({ error: 'Recording not found' });
        return;
    }

    const stat = fs.statSync(filepath);
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
        '.webm': 'audio/webm',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
});

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
