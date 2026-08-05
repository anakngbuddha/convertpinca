import { getQueueClient, localQueue } from '../../config/queue.js';

const QUEUE_KEY = 'jobs:queue';

/**
 * Pushes a job payload onto the queue.
 * Uses Redis/Valkey LPUSH if available, otherwise in-memory queue.
 * @param {object} payload - { jobId, sourceUrl, templateId }
 */
export async function pushJob(payload) {
  const message = JSON.stringify(payload);

  try {
    const { redisClient, isConnected } = await getQueueClient();
    if (isConnected && redisClient) {
      await redisClient.lPush(QUEUE_KEY, message);
      return;
    }
  } catch (err) {
    console.warn('[Queue] Redis lPush failed, falling back to local queue:', err.message);
  }

  // Local in-memory queue fallback
  localQueue.unshift(message);
}

/**
 * Blocking pop — waits for a job from the queue.
 * Returns parsed job payload object.
 * @param {number} timeout - Block timeout in seconds (default 5s)
 * @returns {Promise<object|null>}
 */
export async function popJob(timeout = 5) {
  // Check local queue first
  if (localQueue.length > 0) {
    return JSON.parse(localQueue.pop());
  }

  try {
    const { redisClient, isConnected } = await getQueueClient();
    if (isConnected && redisClient) {
      const result = await redisClient.brPop(QUEUE_KEY, timeout);
      if (result) return JSON.parse(result.element);
    }
  } catch (err) {
    console.warn('[Queue] Redis brPop failed, checking local queue:', err.message);
  }

  // Check local queue again after Redis attempt
  if (localQueue.length > 0) {
    return JSON.parse(localQueue.pop());
  }

  return null;
}
