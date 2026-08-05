import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;
const inMemoryQueue = [];

export async function getQueueClient() {
  const url = process.env.VALKEY_URL || process.env.REDIS_URL;

  // If the client exists but is no longer connected, destroy it so we reconnect cleanly
  if (redisClient && !isConnected) {
    try { await redisClient.quit(); } catch (_) { /* ignore */ }
    redisClient = null;
  }

  if (!redisClient && url) {
    try {
      const clientConfig = {
        url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) return new Error('Redis: too many reconnect attempts');
            return Math.min(retries * 500, 3000);
          },
        },
      };
      if (url.startsWith('rediss://')) {
        clientConfig.socket.tls = true;
        clientConfig.socket.rejectUnauthorized = false;
      }
      redisClient = createClient(clientConfig);
      redisClient.on('error', (err) => {
        console.warn('Redis queue connection error, operating with local fallback:', err.message);
        isConnected = false;
        // Reset so next call reconnects
        redisClient = null;
      });
      redisClient.on('ready', () => {
        isConnected = true;
        console.log('Connected to Valkey / Redis Queue successfully.');
      });
      await redisClient.connect();
      isConnected = true;
    } catch (err) {
      console.warn('Could not connect to Redis/Valkey at', url, '- using in-memory queue fallback:', err.message);
      redisClient = null;
      isConnected = false;
    }
  }
  return { redisClient, isConnected };
}

export const localQueue = inMemoryQueue;
