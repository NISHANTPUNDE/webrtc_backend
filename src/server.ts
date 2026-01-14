import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { initializeDatabase } from './models';
import authRoutes from './routes/auth';
import adminsRoutes from './routes/admins';
import usersRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// WebSocket for signaling
const wss = new WebSocketServer({ server, path: '/ws' });

interface Client {
    id: string;
    ws: WebSocket;
    roomId?: string;
    role?: 'admin' | 'user';
    userId?: number;
    userName?: string;
}

interface Room {
    id: string;
    adminId: string;
    participants: Map<string, Client>;
}

const clients = new Map<string, Client>();
const rooms = new Map<string, Room>();

wss.on('connection', (ws: WebSocket) => {
    const clientId = uuidv4();
    const client: Client = { id: clientId, ws };
    clients.set(clientId, client);

    console.log(`[WS] Client connected: ${clientId}`);

    // Send client ID
    ws.send(JSON.stringify({ type: 'connected', clientId }));

    ws.on('message', (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(client, message);
        } catch (error) {
            console.error('Message parse error:', error);
        }
    });

    ws.on('close', () => {
        handleDisconnect(client);
        clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId}`);
    });
});

function handleMessage(client: Client, message: any) {
    const { type } = message;

    switch (type) {
        case 'create-room':
            handleCreateRoom(client, message);
            break;
        case 'join-room':
            handleJoinRoom(client, message);
            break;
        case 'leave-room':
            handleLeaveRoom(client);
            break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
            forwardSignaling(client, message);
            break;
        case 'invite-user':
            handleInviteUser(client, message);
            break;
    }
}

function handleCreateRoom(client: Client, message: any) {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const room: Room = {
        id: roomId,
        adminId: client.id,
        participants: new Map(),
    };

    client.roomId = roomId;
    client.role = 'admin';
    client.userId = message.userId;
    client.userName = message.userName;
    room.participants.set(client.id, client);
    rooms.set(roomId, room);

    client.ws.send(JSON.stringify({
        type: 'room-created',
        roomId,
        participants: [{ id: client.id, name: client.userName, role: 'admin' }],
    }));

    console.log(`[WS] Room created: ${roomId} by ${client.userName}`);
}

function handleJoinRoom(client: Client, message: any) {
    const { roomId, userId, userName, role } = message;
    const room = rooms.get(roomId);

    if (!room) {
        client.ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
    }

    client.roomId = roomId;
    client.role = role || 'user';
    client.userId = userId;
    client.userName = userName;
    room.participants.set(client.id, client);

    // Get participant list
    const participants = Array.from(room.participants.values()).map(p => ({
        id: p.id,
        name: p.userName,
        role: p.role,
    }));

    // Notify the joining client
    client.ws.send(JSON.stringify({
        type: 'room-joined',
        roomId,
        participants,
    }));

    // Notify all other participants
    room.participants.forEach((p) => {
        if (p.id !== client.id) {
            p.ws.send(JSON.stringify({
                type: 'peer-joined',
                clientId: client.id,
                userName: client.userName,
                role: client.role,
            }));
        }
    });

    console.log(`[WS] ${client.userName} joined room ${roomId}`);
}

function handleLeaveRoom(client: Client) {
    if (!client.roomId) return;

    const room = rooms.get(client.roomId);
    if (!room) return;

    room.participants.delete(client.id);

    // If admin left, end the room
    if (room.adminId === client.id) {
        room.participants.forEach((p) => {
            p.ws.send(JSON.stringify({ type: 'room-ended' }));
            p.roomId = undefined;
        });
        rooms.delete(client.roomId);
        console.log(`[WS] Room ${client.roomId} ended (admin left)`);
    } else {
        // Notify others
        room.participants.forEach((p) => {
            p.ws.send(JSON.stringify({
                type: 'peer-left',
                clientId: client.id,
            }));
        });
    }

    client.roomId = undefined;
}

function handleDisconnect(client: Client) {
    handleLeaveRoom(client);
}

function forwardSignaling(client: Client, message: any) {
    const { targetId } = message;
    if (!client.roomId) return;

    const room = rooms.get(client.roomId);
    if (!room) return;

    if (targetId) {
        // Send to specific client
        const target = room.participants.get(targetId);
        if (target) {
            target.ws.send(JSON.stringify({ ...message, senderId: client.id }));
        }
    } else {
        // Broadcast to all except sender
        room.participants.forEach((p) => {
            if (p.id !== client.id) {
                p.ws.send(JSON.stringify({ ...message, senderId: client.id }));
            }
        });
    }
}

function handleInviteUser(client: Client, message: any) {
    // Send notification to invited user (if they're connected)
    // This could be extended with push notifications
    console.log(`[WS] ${client.userName} invited user to room ${client.roomId}`);
}

// Get active rooms API
app.get('/api/rooms', (req, res) => {
    const activeRooms = Array.from(rooms.values()).map(room => ({
        id: room.id,
        participantCount: room.participants.size,
        adminName: Array.from(room.participants.values()).find(p => p.role === 'admin')?.userName,
    }));
    res.json({ rooms: activeRooms });
});

// Start server
async function start() {
    try {
        await initializeDatabase();
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
