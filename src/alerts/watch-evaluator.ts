import { sql } from '../db/index.js';
import type { SubscriberWatch, WatchNotification, AuditEvent } from './types.js';

/**
 * Haversine formula to compute great-circle distance between two geographic coordinates in km
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Registers a new subscriber watch
 */
export async function registerSubscriberWatch(watch: SubscriberWatch): Promise<SubscriberWatch> {
  const [created] = await sql<SubscriberWatch[]>`
    INSERT INTO subscriber_watches (
      subscriber_email,
      subscriber_name,
      watch_type,
      geography_id,
      radius_km,
      category_id,
      metric_id,
      threshold_pct,
      notification_channel,
      is_active
    ) VALUES (
      ${watch.subscriber_email},
      ${watch.subscriber_name || null},
      ${watch.watch_type},
      ${watch.geography_id || null},
      ${watch.radius_km || null},
      ${watch.category_id || null},
      ${watch.metric_id || null},
      ${watch.threshold_pct || null},
      ${watch.notification_channel || 'EMAIL'},
      ${watch.is_active !== undefined ? watch.is_active : true}
    )
    RETURNING *;
  `;

  return created;
}

/**
 * Single-pass watch evaluator:
 * Evaluates all active subscriber watches against unnotified audit events.
 * Zero external API round-trips: operates entirely on persisted local events and geometries.
 */
export async function evaluateActiveWatches(): Promise<{
  evaluatedWatchesCount: number;
  unnotifiedEventsCount: number;
  matchedNotificationsCount: number;
  dispatchedNotifications: WatchNotification[];
}> {
  // 1. Fetch all active watches
  const activeWatches = await sql<SubscriberWatch[]>`
    SELECT * FROM subscriber_watches
    WHERE is_active = TRUE;
  `;

  if (activeWatches.length === 0) {
    return {
      evaluatedWatchesCount: 0,
      unnotifiedEventsCount: 0,
      matchedNotificationsCount: 0,
      dispatchedNotifications: []
    };
  }

  // 2. Fetch unnotified audit events (events that haven't been queued for all watches)
  const unnotifiedEvents = await sql<(AuditEvent & { id: number })[]>`
    SELECT e.*
    FROM audit_events e
    WHERE e.id NOT IN (
      SELECT event_id FROM watch_notifications
    )
    ORDER BY e.occurred_at ASC;
  `;

  if (unnotifiedEvents.length === 0) {
    return {
      evaluatedWatchesCount: activeWatches.length,
      unnotifiedEventsCount: 0,
      matchedNotificationsCount: 0,
      dispatchedNotifications: []
    };
  }

  // 3. Preload geographic coordinates for fast in-memory radius checks
  const geoRows = await sql<{ id: string; latitude: number | null; longitude: number | null }[]>`
    SELECT id, latitude, longitude FROM geographies;
  `;
  const geoMap = new Map<string, { lat: number; lon: number }>();
  for (const g of geoRows) {
    if (g.latitude !== null && g.longitude !== null) {
      geoMap.set(g.id, { lat: Number(g.latitude), lon: Number(g.longitude) });
    }
  }

  const matchesToInsert: {
    watch_id: number;
    event_id: number;
    subscriber_email: string;
    channel: string;
  }[] = [];

  for (const watch of activeWatches) {
    for (const event of unnotifiedEvents) {
      let isMatch = false;

      // Match based on watch_type
      if (watch.watch_type === 'LISTING_WATCH') {
        const isListingEvent =
          event.event_type === 'LISTING_NEW' ||
          event.event_type === 'LISTING_PRICE_CHANGE' ||
          event.event_type === 'LISTING_RELIST' ||
          event.event_type === 'COMMERCIAL_LEASE_CHANGE';

        if (isListingEvent) {
          let categoryMatches = true;
          if (watch.category_id && event.category_id) {
            // Category match or partial prefix match
            categoryMatches =
              watch.category_id === event.category_id ||
              event.category_id.includes(watch.category_id) ||
              Boolean(event.title && event.title.toLowerCase().includes(watch.category_id.toLowerCase()));
          }

          let geoMatches = true;
          if (watch.geography_id && event.geography_id) {
            if (watch.geography_id === event.geography_id) {
              geoMatches = true;
            } else if (watch.radius_km && watch.radius_km > 0) {
              const watchCoords = geoMap.get(watch.geography_id);
              const eventCoords = geoMap.get(event.geography_id);
              if (watchCoords && eventCoords) {
                const dist = haversineDistanceKm(
                  watchCoords.lat,
                  watchCoords.lon,
                  eventCoords.lat,
                  eventCoords.lon
                );
                geoMatches = dist <= watch.radius_km;
              } else {
                geoMatches = false;
              }
            } else {
              geoMatches = false;
            }
          }

          if (categoryMatches && geoMatches) {
            isMatch = true;
          }
        }
      } else if (watch.watch_type === 'INDICATOR_WATCH') {
        const isIndicatorEvent =
          event.event_type === 'ECONOMIC_INDICATOR_CHANGE' ||
          event.event_type === 'STATCAN_RELEASE';

        if (isIndicatorEvent) {
          let geoMatches = !watch.geography_id || watch.geography_id === event.geography_id;
          let metricMatches = true;
          if (watch.metric_id && event.metadata?.metric_id) {
            metricMatches = watch.metric_id === event.metadata.metric_id;
          }

          let thresholdMatches = true;
          if (watch.threshold_pct !== null && watch.threshold_pct !== undefined && event.delta_pct !== null && event.delta_pct !== undefined) {
            thresholdMatches = Math.abs(Number(event.delta_pct)) >= Math.abs(Number(watch.threshold_pct));
          }

          if (geoMatches && metricMatches && thresholdMatches) {
            isMatch = true;
          }
        }
      } else if (watch.watch_type === 'BUDGET_WATCH') {
        if (event.event_type === 'MUNICIPAL_BUDGET_NEW') {
          let geoMatches = !watch.geography_id || watch.geography_id === event.geography_id;
          if (geoMatches) isMatch = true;
        }
      }

      if (isMatch && watch.id) {
        matchesToInsert.push({
          watch_id: watch.id,
          event_id: event.id,
          subscriber_email: watch.subscriber_email,
          channel: watch.notification_channel || 'EMAIL'
        });
      }
    }
  }

  // 4. Batch persist matched notifications
  const insertedNotifications: WatchNotification[] = [];
  for (const match of matchesToInsert) {
    const [inserted] = await sql<WatchNotification[]>`
      INSERT INTO watch_notifications (
        watch_id,
        event_id,
        subscriber_email,
        channel,
        delivered
      ) VALUES (
        ${match.watch_id},
        ${match.event_id},
        ${match.subscriber_email},
        ${match.channel},
        FALSE
      )
      ON CONFLICT (watch_id, event_id) DO NOTHING
      RETURNING *;
    `;
    if (inserted) insertedNotifications.push(inserted);
  }

  // 5. Update last_evaluated_at timestamp for active watches
  if (activeWatches.length > 0) {
    await sql`
      UPDATE subscriber_watches
      SET last_evaluated_at = NOW()
      WHERE is_active = TRUE;
    `;
  }

  return {
    evaluatedWatchesCount: activeWatches.length,
    unnotifiedEventsCount: unnotifiedEvents.length,
    matchedNotificationsCount: insertedNotifications.length,
    dispatchedNotifications: insertedNotifications
  };
}

/**
 * Returns pending un-delivered notifications
 */
export async function getPendingNotifications(): Promise<WatchNotification[]> {
  return await sql<WatchNotification[]>`
    SELECT n.*, e.title as event_title, e.description as event_description, e.event_type, e.occurred_at
    FROM watch_notifications n
    JOIN audit_events e ON e.id = n.event_id
    WHERE n.delivered = FALSE
      AND (n.status IS NULL OR n.status != 'FAILED')
      AND (n.retry_count IS NULL OR n.retry_count < 3)
    ORDER BY n.created_at ASC;
  `;
}

/**
 * Marks notifications as delivered
 */
export async function markNotificationsDelivered(notificationIds: number[]): Promise<void> {
  if (notificationIds.length === 0) return;
  await sql`
    UPDATE watch_notifications
    SET delivered = TRUE,
        status = 'DELIVERED',
        delivered_at = NOW()
    WHERE id IN ${sql(notificationIds)};
  `;
}

/**
 * Marks a single notification as sent
 */
export async function markNotificationSent(notificationId: number): Promise<void> {
  await sql`
    UPDATE watch_notifications
    SET delivered = TRUE,
        status = 'DELIVERED',
        delivered_at = NOW()
    WHERE id = ${notificationId};
  `;
}

/**
 * Records a delivery failure attempt. If retry_count reaches maxRetries (3), marks as FAILED.
 */
export async function recordNotificationFailure(notificationId: number, maxRetries = 3): Promise<void> {
  await sql`
    UPDATE watch_notifications
    SET retry_count = COALESCE(retry_count, 0) + 1,
        status = CASE WHEN COALESCE(retry_count, 0) + 1 >= ${maxRetries} THEN 'FAILED' ELSE 'RETRYING' END
    WHERE id = ${notificationId};
  `;
}
