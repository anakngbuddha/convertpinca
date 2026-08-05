import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;
const inMemoryQueue = [];

export async function getQueueClient() {
  const url = process.env.VALKEY_URL || process.env.REDIS_URL;
  if (!redisClient && url) {
    try {
      const clientConfig = { url };
      if (url.startsWith('rediss://')) {
        clientConfig.socket = { tls: true, rejectUnauthorized: false };
      }
      redisClient = createClient(clientConfig);
      redisClient.on('error', (err) => {
        console.warn('Redis queue connection error, operating with local fallback:', err.message);
        isConnected = false;
      });
      await redisClient.connect();
      isConnected = true;
      console.log('Connected to Valkey / Redis Queue successfully.');
    } catch (err) {
      console.warn('Could not connect to Redis/Valkey at', url, '- using in-memory queue fallback:', err.message);
      redisClient = null;
      isConnected = false;
    }
  }
  return { redisClient, isConnected };
}

export const localQueue = inMemoryQueue;
