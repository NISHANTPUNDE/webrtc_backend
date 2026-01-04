/**
 * Signaling Handler
 * Processes WebSocket signaling messages for WebRTC
 */

import { RawData, WebSocket } from 'ws';
import { Client, SignalingMessage } from '../types/signaling';
import { roomManager } from './roomManager';
import { clientManager } from './clientManager';
import { recordingManager } from './recordingManager';

/**
 * Handle incoming WebSocket message
 */
export function handleMessage(client: Client, data: RawData, isBinary: boolean): void {
    // Handle binary audio data for recording
    if (isBinary && client.roomId) {
        const audioBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        recordingManager.addAudioChunk(client.roomId, client.id, audioBuffer);
        return;
    }

    // Parse JSON message
    let message: SignalingMessage;
    try {
        message = JSON.parse(data.toString());
    } catch (error) {
        console.error('[SIGNALING] Failed to parse message:', error);
        return;
    }

    // Route message to appropriate handler
    switch (message.type) {
        case 'create-room':
            handleCreateRoom(client);
            break;

        case 'join-room':
            handleJoinRoom(client, message.roomId!);
            break;

        case 'leave-room':
            handleLeaveRoom(client);
            break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
            handleSignalingForward(client, message);
            break;

        case 'start-recording':
            handleStartRecording(client);
            break;

        case 'stop-recording':
            handleStopRecording(client);
            break;

        case 'get-active-rooms':
            sendActiveRooms(client);
            break;

        default:
            console.log(`[SIGNALING] Unknown message type: ${message.type}`);
    }
}

/**
 * Handle client disconnect
 */
export async function handleDisconnect(client: Client): Promise<void> {
    await handleLeaveRoom(client);
    clientManager.removeClient(client.id);
}

// ============ Message Handlers ============

function handleCreateRoom(client: Client): void {
    const result = roomManager.createRoom(client);

    client.ws.send(JSON.stringify({
        type: 'room-created',
        roomId: result.roomId,
        participants: result.participants
    }));

    broadcastActiveRooms();
}

function handleJoinRoom(client: Client, roomId: string): void {
    const result = roomManager.joinRoom(client, roomId);

    if (!result.success) {
        client.ws.send(JSON.stringify({ type: 'error', message: result.message }));
        return;
    }

    // Notify existing participants about new peer
    result.existingClients?.forEach((existingClient) => {
        existingClient.ws.send(JSON.stringify({
            type: 'peer-joined',
            clientId: client.id
        }));
    });

    // Send room info to new client
    client.ws.send(JSON.stringify({
        type: 'room-joined',
        roomId,
        participants: result.existingClients?.map(c => c.id) || []
    }));

    broadcastActiveRooms();
}

async function handleLeaveRoom(client: Client): Promise<void> {
    if (!client.roomId) return;

    const roomId = client.roomId;

    // Clean up recording for this client
    await recordingManager.handleClientDisconnect(roomId, client.id);

    const { room, wasEmpty } = roomManager.leaveRoom(client);

    if (wasEmpty) {
        // Stop recording if room is now empty
        await recordingManager.stopRecording(roomId);
    } else if (room) {
        // Notify remaining participants
        roomManager.broadcastToRoom(room.id, {
            type: 'peer-left',
            clientId: client.id
        });
    }

    broadcastActiveRooms();
}

/**
 * Send active rooms list to a specific client
 */
export function sendActiveRooms(client: Client): void {
    const rooms = roomManager.getActiveRooms();
    client.ws.send(JSON.stringify({
        type: 'active-rooms-update',
        rooms
    }));
}

/**
 * Broadcast active rooms to all clients in lobby
 */
function broadcastActiveRooms(): void {
    const rooms = roomManager.getActiveRooms();
    clientManager.broadcastToLobby({
        type: 'active-rooms-update',
        rooms
    });
}

function handleSignalingForward(client: Client, message: SignalingMessage): void {
    const { type, targetClientId, payload } = message;

    console.log(`[${type.toUpperCase()}] from ${client.id} to ${targetClientId}`);

    if (targetClientId) {
        clientManager.forwardMessage(client.id, targetClientId, { type, payload });
    }
}

function handleStartRecording(client: Client): void {
    if (!client.roomId) {
        client.ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const result = recordingManager.startRecording(client.roomId, client.id);

    if (result.success) {
        roomManager.broadcastToRoom(client.roomId, {
            type: 'recording-started',
            startedBy: client.id,
            roomId: client.roomId
        });
    } else {
        client.ws.send(JSON.stringify({ type: 'error', message: result.message }));
    }
}

async function handleStopRecording(client: Client): Promise<void> {
    if (!client.roomId) {
        client.ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const result = await recordingManager.stopRecording(client.roomId);

    roomManager.broadcastToRoom(client.roomId, {
        type: 'recording-stopped',
        stoppedBy: client.id,
        roomId: client.roomId,
        files: result.files
    });
}
