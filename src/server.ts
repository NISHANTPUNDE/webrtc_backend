import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import adminRoutes from './routes/adminRoutes';
import recordingRoutes from './routes/recordingRoutes';
import setupSwaggerDocs from './config/swaggerConfig';

const port = process.env.PORT || 3000;
const wsPort = process.env.WS_PORT || 8080;

const app = express();

// Middleware for parsing JSON bodies
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).send('pong');
});

// Swagger docs
setupSwaggerDocs(app);

// Routes
app.use('/v1/admins', adminRoutes);
app.use('/v1/recordings', recordingRoutes);

// Start Express server
app.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
});

// ============ WebSocket Signaling Server ============

interface Client {
  id: string;
  ws: WebSocket;
  roomId: string | null;
}

interface Room {
  id: string;
  clients: Map<string, Client>;
}

const rooms = new Map<string, Room>();
const clients = new Map<string, Client>();

const wsServer = new WebSocketServer({ port: Number(wsPort) });

wsServer.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  const client: Client = { id: clientId, ws, roomId: null };
  clients.set(clientId, client);

  console.log(`Client connected: ${clientId}`);

  // Send client their ID
  ws.send(JSON.stringify({ type: 'connected', clientId }));

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(client, message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  ws.on('close', () => {
    handleDisconnect(client);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
  });
});

function handleMessage(client: Client, message: any) {
  const { type, roomId, targetClientId, payload } = message;

  switch (type) {
    case 'create-room':
      createRoom(client);
      break;

    case 'join-room':
      joinRoom(client, roomId);
      break;

    case 'leave-room':
      leaveRoom(client);
      break;

    case 'offer':
    case 'answer':
    case 'ice-candidate':
      forwardToClient(client, targetClientId, { type, payload, fromClientId: client.id });
      break;

    default:
      console.log(`Unknown message type: ${type}`);
  }
}

function createRoom(client: Client) {
  const roomId = uuidv4().substring(0, 6).toUpperCase();
  const room: Room = { id: roomId, clients: new Map() };
  room.clients.set(client.id, client);
  rooms.set(roomId, room);
  client.roomId = roomId;

  client.ws.send(JSON.stringify({
    type: 'room-created',
    roomId,
    participants: [client.id]
  }));

  console.log(`Room ${roomId} created by ${client.id}`);
}

function joinRoom(client: Client, roomId: string) {
  const room = rooms.get(roomId);

  if (!room) {
    client.ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  // Notify existing participants about new peer
  const existingClients = Array.from(room.clients.values());
  existingClients.forEach((existingClient) => {
    existingClient.ws.send(JSON.stringify({
      type: 'peer-joined',
      clientId: client.id
    }));
  });

  // Add client to room
  room.clients.set(client.id, client);
  client.roomId = roomId;

  // Send room info to new client
  client.ws.send(JSON.stringify({
    type: 'room-joined',
    roomId,
    participants: existingClients.map(c => c.id)
  }));

  console.log(`Client ${client.id} joined room ${roomId}. Participants: ${room.clients.size}`);
}

function leaveRoom(client: Client) {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) return;

  room.clients.delete(client.id);

  // Notify remaining participants
  room.clients.forEach((remainingClient) => {
    remainingClient.ws.send(JSON.stringify({
      type: 'peer-left',
      clientId: client.id
    }));
  });

  // Delete room if empty
  if (room.clients.size === 0) {
    rooms.delete(client.roomId);
    console.log(`Room ${client.roomId} deleted (empty)`);
  }

  console.log(`Client ${client.id} left room ${client.roomId}`);
  client.roomId = null;
}

function forwardToClient(from: Client, targetClientId: string, message: any) {
  const targetClient = clients.get(targetClientId);
  if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
    targetClient.ws.send(JSON.stringify(message));
  }
}

function handleDisconnect(client: Client) {
  leaveRoom(client);
  clients.delete(client.id);
  console.log(`Client disconnected: ${client.id}`);
}

console.log(`WebSocket signaling server running on port ${wsPort}`);