/**
 * Type definitions for WebRTC signaling
 */

import { WebSocket } from 'ws';

export interface Client {
    id: string;
    ws: WebSocket;
    roomId: string | null;
}

export interface Room {
    id: string;
    clients: Map<string, Client>;
}

export interface SignalingMessage {
    type: string;
    roomId?: string;
    targetClientId?: string;
    payload?: any;
}

export interface MessageResult {
    success: boolean;
    message?: string;
    data?: any;
}
