import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;
const inMemoryQueue = [];

export async function getQueueClient() {
  const url = process.env.VALKEY_URL || process.env.REDIS_URL;

  if (redisClient && !isConnected) {
    try { await redisClient.disconnect(); } catch (_) { /* ignore */ }
    redisClient = null;
  }

  if (!redisClient && url) {
    try {
      const clientConfig = {
        url,
        pingInterval: 5000, // Send PING every 5s to keep connection alive
        socket: {
          keepAlive: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Redis: max reconnect attempts reached');
            return Math.min(retries * 500, 3000);
          },
        },
      };
      if (url.startsWith('rediss://')) {
        clientConfig.socket.rejectUnauthorized = false;
      }
      redisClient = createClient(clientConfig);

      redisClient.on('error', (err) => {
        console.warn('[Redis Queue] Connection error (falling back to local queue):', err.message);
        isConnected = false;
        redisClient = null;
      });

      redisClient.on('ready', () => {
        isConnected = true;
        console.log('[Redis Queue] Connected to Valkey / Redis successfully.');
      });

      await redisClient.connect();
      isConnected = true;
    } catch (err) {
      console.warn('[Redis Queue] Could not connect to Valkey / Redis - using local queue fallback:', err.message);
      redisClient = null;
      isConnected = false;
    }
  }

  return { redisClient, isConnected };
}

export const localQueue = inMemoryQueue;
