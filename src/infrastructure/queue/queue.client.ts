import type { Redis } from 'ioredis';
import { redis } from '../redis/redis.client';

export function getQueueConnection(): Redis {
  return redis;
}
