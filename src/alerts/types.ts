export type AuditEventType =
  | 'LISTING_NEW'
  | 'LISTING_PRICE_CHANGE'
  | 'LISTING_RELIST'
  | 'COMMERCIAL_LEASE_CHANGE'
  | 'COMPETITOR_EVENT'
  | 'MUNICIPAL_BUDGET_NEW'
  | 'STATCAN_RELEASE'
  | 'ECONOMIC_INDICATOR_CHANGE';

export type EntityType =
  | 'business_listing'
  | 'commercial_lease'
  | 'observation'
  | 'municipal_finance'
  | 'dataset';

export interface AuditEvent {
  id?: number;
  event_type: AuditEventType;
  entity_type: EntityType;
  entity_id: string;
  geography_id?: string | null;
  category_id?: string | null;
  title: string;
  description?: string | null;
  old_value?: number | null;
  new_value?: number | null;
  delta_pct?: number | null;
  metadata?: Record<string, any> | null;
  occurred_at?: string | Date;
  created_at?: string | Date;
}

export type WatchType = 'LISTING_WATCH' | 'INDICATOR_WATCH' | 'BUDGET_WATCH';

export interface SubscriberWatch {
  id?: number;
  subscriber_email: string;
  subscriber_name?: string | null;
  watch_type: WatchType;
  geography_id?: string | null;
  radius_km?: number | null;
  category_id?: string | null;
  metric_id?: string | null;
  threshold_pct?: number | null;
  notification_channel?: 'EMAIL' | 'WEBHOOK' | 'SMS';
  is_active?: boolean;
  last_evaluated_at?: string | Date | null;
  created_at?: string | Date;
}

export interface WatchNotification {
  id?: number;
  watch_id: number;
  event_id: number;
  subscriber_email: string;
  delivered: boolean;
  delivered_at?: string | Date | null;
  channel: string;
  created_at?: string | Date;
}

export interface ListingDiffInput {
  listing_id: string; // matches listing_uid or id::text
  geography_id: string;
  category_id?: string;
  business_name: string;
  asking_price: number;
  status: 'ACTIVE' | 'PENDING' | 'SOLD' | 'TERMINATED' | 'EXPIRED' | 'RELISTED' | 'PRICE_CHANGED';
  monthly_rent?: number;
  square_footage?: number;
}

export interface IndicatorDiffInput {
  geography_id: string;
  metric_id: string;
  reference_year: number;
  new_value: number;
  source_id?: string;
  dataset_id?: string;
}

export interface MunicipalBudgetDiffInput {
  geography_id: string;
  fiscal_year: number;
  account_category: string;
  amount_dollars: number;
  schedule_code?: string;
}
