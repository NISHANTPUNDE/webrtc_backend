/**
 * WebRTC Backend Server
 * 
 * This server provides:
 * - HTTP API for recording management
 * - WebSocket signaling for WebRTC peer connections
 */

import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import recordingRoutes from './routes/recordingRoutes';
import setupSwaggerDocs from './config/swaggerConfig';
import { clientManager } from './services/clientManager';
import { handleMessage, handleDisconnect, sendActiveRooms } from './services/signalingHandler';

// ============ Configuration ============

const HTTP_PORT = process.env.PORT || 8050;
const WS_PORT = process.env.WS_PORT || 8060;

// ============ Express HTTP Server ============

const app = express();

app.use(express.json());

// Health check
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).send('pong');
});

// API Documentation
setupSwaggerDocs(app);

// Routes
app.use('/v1/recordings', recordingRoutes);

app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Server running on port ${HTTP_PORT}`);
});

// ============ WebSocket Signaling Server ============

const wsServer = new WebSocketServer({ port: Number(WS_PORT) });

wsServer.on('connection', (ws: WebSocket) => {
  // Register new client
  const client = clientManager.registerClient(ws);

  // Send client their ID
  ws.send(JSON.stringify({ type: 'connected', clientId: client.id }));

  // Send active rooms list
  sendActiveRooms(client);

  // Handle incoming messages
  ws.on('message', (data: RawData, isBinary: boolean) => {
    handleMessage(client, data, isBinary);
  });

  // Handle disconnect
  ws.on('close', () => {
    handleDisconnect(client);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[WS] Error for ${client.id}:`, error);
  });
});

console.log(`[WS] Signaling server running on port ${WS_PORT}`);