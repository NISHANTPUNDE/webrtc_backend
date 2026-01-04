/**
 * Client Manager Service
 * Handles client connections and messaging
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '../types/signaling';

class ClientManager {
    private clients: Map<string, Client> = new Map();

    /**
     * Register a new client
     */
    registerClient(ws: WebSocket): Client {
        const clientId = uuidv4();
        const client: Client = { id: clientId, ws, roomId: null };
        this.clients.set(clientId, client);

        console.log(`[CLIENT] Connected: ${clientId}`);
        return client;
    }

    /**
     * Remove a client
     */
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
        console.log(`[CLIENT] Disconnected: ${clientId}`);
    }

    /**
     * Get a client by ID
     */
    getClient(clientId: string): Client | undefined {
        return this.clients.get(clientId);
    }

    /**
     * Send message to a specific client
     */
    sendToClient(clientId: string, message: object): boolean {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    /**
     * Forward a message from one client to another
     */
    forwardMessage(fromClientId: string, toClientId: string, message: object): boolean {
        return this.sendToClient(toClientId, {
            ...message,
            fromClientId
        });
    }

    /**
     * Get all connected clients
     */
    getAllClients(): Client[] {
        return Array.from(this.clients.values());
    }

    /**
     * Broadcast message to all clients not in a room
     */
    broadcastToLobby(message: object): void {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (!client.roomId && client.ws.readyState === 1) {
                client.ws.send(messageStr);
            }
        });
    }
}

export const clientManager = new ClientManager();
export default ClientManager;
