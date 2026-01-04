import fs from 'fs';
import path from 'path';

interface RecordingSession {
    roomId: string;
    clientId: string;
    filePath: string;
    writeStream: fs.WriteStream;
    startTime: number;
    chunkCount: number;
}

interface RoomRecording {
    roomId: string;
    isRecording: boolean;
    startedBy: string;
    startTime: number;
    sessions: Map<string, RecordingSession>;
}

class RecordingManager {
    private roomRecordings: Map<string, RoomRecording> = new Map();
    private recordingsDir: string;

    constructor() {
        this.recordingsDir = path.join(__dirname, '../../recordings');
        this.ensureRecordingsDir();
    }

    private ensureRecordingsDir(): void {
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
    }

    /**
     * Start recording for a room
     */
    startRecording(roomId: string, clientId: string): { success: boolean; message: string } {
        if (this.roomRecordings.has(roomId)) {
            const existing = this.roomRecordings.get(roomId)!;
            if (existing.isRecording) {
                return { success: false, message: 'Recording already in progress for this room' };
            }
        }

        const roomRecording: RoomRecording = {
            roomId,
            isRecording: true,
            startedBy: clientId,
            startTime: Date.now(),
            sessions: new Map()
        };

        this.roomRecordings.set(roomId, roomRecording);
        console.log(`[RECORDING] Started recording for room ${roomId} by ${clientId}`);

        return { success: true, message: 'Recording started' };
    }

    /**
     * Add audio chunk from a client
     */
    addAudioChunk(roomId: string, clientId: string, audioData: Buffer): boolean {
        const roomRecording = this.roomRecordings.get(roomId);

        if (!roomRecording || !roomRecording.isRecording) {
            console.log(`[RECORDING] No active recording for room ${roomId}`);
            return false;
        }

        let session = roomRecording.sessions.get(clientId);

        // Create session for this client if it doesn't exist
        if (!session) {
            const timestamp = Date.now();
            const filename = `room_${roomId}_client_${clientId.substring(0, 8)}_${timestamp}.webm`;
            const filePath = path.join(this.recordingsDir, filename);

            const writeStream = fs.createWriteStream(filePath, { flags: 'a' });

            session = {
                roomId,
                clientId,
                filePath,
                writeStream,
                startTime: timestamp,
                chunkCount: 0
            };

            roomRecording.sessions.set(clientId, session);
            console.log(`[RECORDING] Created recording session for client ${clientId} in room ${roomId}`);
        }

        // Write the audio chunk
        session.writeStream.write(audioData);
        session.chunkCount++;

        if (session.chunkCount % 100 === 0) {
            console.log(`[RECORDING] Room ${roomId}, Client ${clientId}: ${session.chunkCount} chunks received`);
        }

        return true;
    }

    /**
     * Stop recording for a room
     */
    async stopRecording(roomId: string): Promise<{ success: boolean; files: string[] }> {
        const roomRecording = this.roomRecordings.get(roomId);

        if (!roomRecording) {
            return { success: false, files: [] };
        }

        const files: string[] = [];

        // Close all client sessions
        for (const [clientId, session] of roomRecording.sessions) {
            await new Promise<void>((resolve) => {
                session.writeStream.end(() => {
                    console.log(`[RECORDING] Closed session for client ${clientId}, ${session.chunkCount} chunks recorded`);
                    files.push(path.basename(session.filePath));
                    resolve();
                });
            });
        }

        roomRecording.isRecording = false;
        roomRecording.sessions.clear();
        this.roomRecordings.delete(roomId);

        console.log(`[RECORDING] Stopped recording for room ${roomId}. Files: ${files.join(', ')}`);

        return { success: true, files };
    }

    /**
     * Check if a room is currently recording
     */
    isRecording(roomId: string): boolean {
        const roomRecording = this.roomRecordings.get(roomId);
        return roomRecording?.isRecording ?? false;
    }

    /**
     * Clean up session when a client leaves
     */
    async handleClientDisconnect(roomId: string, clientId: string): Promise<void> {
        const roomRecording = this.roomRecordings.get(roomId);
        if (!roomRecording) return;

        const session = roomRecording.sessions.get(clientId);
        if (session) {
            await new Promise<void>((resolve) => {
                session.writeStream.end(() => {
                    console.log(`[RECORDING] Client ${clientId} disconnected. Session closed with ${session.chunkCount} chunks.`);
                    resolve();
                });
            });
            roomRecording.sessions.delete(clientId);
        }
    }

    /**
     * Get recording info for a room
     */
    getRecordingInfo(roomId: string): { isRecording: boolean; duration: number; participants: number } | null {
        const roomRecording = this.roomRecordings.get(roomId);
        if (!roomRecording) return null;

        return {
            isRecording: roomRecording.isRecording,
            duration: Date.now() - roomRecording.startTime,
            participants: roomRecording.sessions.size
        };
    }
}

// Singleton instance
export const recordingManager = new RecordingManager();
export default RecordingManager;
