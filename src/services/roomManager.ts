/**
 * Room Manager Service
 * Handles room creation, joining, leaving and management
 */

import { v4 as uuidv4 } from 'uuid';
import { Client, Room, MessageResult } from '../types/signaling';

class RoomManager {
    private rooms: Map<string, Room> = new Map();

    /**
     * Create a new room
     */
    createRoom(client: Client): { roomId: string; participants: string[] } {
        const roomId = uuidv4().substring(0, 6).toUpperCase();
        const room: Room = { id: roomId, clients: new Map() };
        room.clients.set(client.id, client);
        this.rooms.set(roomId, room);
        client.roomId = roomId;

        console.log(`[ROOM] ${roomId} created by ${client.id}`);
        return { roomId, participants: [client.id] };
    }

    /**
     * Join an existing room
     */
    joinRoom(client: Client, roomId: string): MessageResult & { existingClients?: Client[] } {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        const existingClients = Array.from(room.clients.values());

        // Add client to room
        room.clients.set(client.id, client);
        client.roomId = roomId;

        console.log(`[ROOM] ${client.id} joined ${roomId}. Participants: ${room.clients.size}`);
        return { success: true, existingClients };
    }

    /**
     * Remove client from room
     */
    leaveRoom(client: Client): { room: Room | null; wasEmpty: boolean } {
        if (!client.roomId) {
            return { room: null, wasEmpty: false };
        }

        const room = this.rooms.get(client.roomId);
        if (!room) {
            return { room: null, wasEmpty: false };
        }

        room.clients.delete(client.id);
        const wasEmpty = room.clients.size === 0;

        if (wasEmpty) {
            this.rooms.delete(client.roomId);
            console.log(`[ROOM] ${client.roomId} deleted (empty)`);
        }

        console.log(`[ROOM] ${client.id} left ${client.roomId}`);
        const roomRef = room;
        client.roomId = null;

        return { room: wasEmpty ? null : roomRef, wasEmpty };
    }

    /**
     * Get a room by ID
     */
    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Get all clients in a room
     */
    getRoomClients(roomId: string): Client[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.clients.values()) : [];
    }

    /**
     * Broadcast message to all clients in a room
     */
    broadcastToRoom(roomId: string, message: object, excludeClientId?: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const messageStr = JSON.stringify(message);
        room.clients.forEach((client) => {
            if (client.id !== excludeClientId && client.ws.readyState === 1) {
                client.ws.send(messageStr);
            }
        });
    }

    /**
     * Get all active rooms with their IDs
     */
    getActiveRooms(): { roomId: string; participantCount: number }[] {
        const activeRooms: { roomId: string; participantCount: number }[] = [];
        this.rooms.forEach((room, roomId) => {
            activeRooms.push({
                roomId,
                participantCount: room.clients.size
            });
        });
        return activeRooms;
    }

    /**
     * Check if there are any active rooms
     */
    hasActiveRooms(): boolean {
        return this.rooms.size > 0;
    }

    /**
     * Get the first active room (for auto-join)
     */
    getFirstActiveRoom(): string | null {
        const firstRoom = this.rooms.keys().next();
        return firstRoom.done ? null : firstRoom.value;
    }
}

export const roomManager = new RoomManager();
export default RoomManager;
