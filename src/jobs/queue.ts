import crypto from 'node:crypto';
import { sql } from '../db/index.js';

export interface EnqueueJobOptions {
  queueName: string;
  jobType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  maxAttempts?: number;
  backoffBaseSec?: number;
}

export interface DurableJobRow {
  id: string;
  queue_name: string;
  job_type: string;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  created_at: string;
}

export class DurableJobQueue {
  async enqueue(options: EnqueueJobOptions): Promise<string> {
    const id = `job_${crypto.randomUUID()}`;
    const key = options.idempotencyKey || null;

    if (key) {
      // Check for existing job with same idempotency key
      const [existing] = await sql<{ id: string }[]>`
        SELECT id FROM durable_jobs WHERE idempotency_key = ${key} LIMIT 1;
      `;
      if (existing) {
        return existing.id;
      }
    }

    await sql`
      INSERT INTO durable_jobs (
        id, queue_name, job_type, payload, idempotency_key,
        status, attempts, max_attempts, backoff_base_sec, next_run_at
      ) VALUES (
        ${id}, ${options.queueName}, ${options.jobType},
        ${JSON.stringify(options.payload)}::jsonb, ${key},
        'PENDING', 0, ${options.maxAttempts || 5},
        ${options.backoffBaseSec || 10}, NOW()
      )
      ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW();
    `;

    return id;
  }

  /**
   * Concurrency-safe atomic worker leasing using FOR UPDATE SKIP LOCKED
   */
  async leaseNext(queueName: string, workerId: string, leaseSec: number = 60): Promise<DurableJobRow | null> {
    const [leased] = await sql<DurableJobRow[]>`
      UPDATE durable_jobs
      SET
        status = 'LEASED',
        lease_owner = ${workerId},
        lease_expires_at = NOW() + (${leaseSec} || ' seconds')::interval,
        updated_at = NOW()
      WHERE id = (
        SELECT id
        FROM durable_jobs
        WHERE queue_name = ${queueName}
          AND next_run_at <= NOW()
          AND (
            status = 'PENDING' 
            OR (status = 'LEASED' AND lease_expires_at < NOW())
          )
        ORDER BY next_run_at ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `;

    return leased || null;
  }

  async complete(jobId: string, result?: Record<string, unknown>): Promise<void> {
    await sql`
      UPDATE durable_jobs
      SET
        status = 'COMPLETED',
        result = ${JSON.stringify(result || {})}::jsonb,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${jobId};
    `;
  }

  async fail(jobId: string, errorMessage: string): Promise<void> {
    const [job] = await sql<{ attempts: number; max_attempts: number; backoff_base_sec: number }[]>`
      SELECT attempts, max_attempts, backoff_base_sec
      FROM durable_jobs
      WHERE id = ${jobId};
    `;

    if (!job) return;

    const newAttempts = job.attempts + 1;
    if (newAttempts >= job.max_attempts) {
      await sql`
        UPDATE durable_jobs
        SET
          status = 'DEAD_LETTER',
          attempts = ${newAttempts},
          last_error = ${errorMessage},
          updated_at = NOW()
        WHERE id = ${jobId};
      `;
    } else {
      // Exponential backoff
      const backoffSec = job.backoff_base_sec * Math.pow(2, newAttempts - 1);
      await sql`
        UPDATE durable_jobs
        SET
          status = 'PENDING',
          attempts = ${newAttempts},
          last_error = ${errorMessage},
          next_run_at = NOW() + (${backoffSec} || ' seconds')::interval,
          lease_owner = NULL,
          lease_expires_at = NULL,
          updated_at = NOW()
        WHERE id = ${jobId};
      `;
    }
  }

  async getStats(queueName?: string): Promise<Record<string, number>> {
    const rows = await sql<{ status: string; cnt: string }[]>`
      SELECT status, count(*)::text as cnt
      FROM durable_jobs
      WHERE (${!queueName} OR queue_name = ${queueName || ''})
      GROUP BY status;
    `;

    const stats: Record<string, number> = {
      PENDING: 0,
      LEASED: 0,
      COMPLETED: 0,
      FAILED: 0,
      DEAD_LETTER: 0,
      CANCELLED: 0,
    };

    for (const r of rows) {
      stats[r.status] = parseInt(r.cnt, 10);
    }
    return stats;
  }
}

export const durableQueue = new DurableJobQueue();
