/**
 * dataFreshness.ts — Meteorological Data Staleness & Trustworthiness Calculator
 *
 * During connectivity blackout, never mislead the public that cached data is "live".
 * Computes exact staleness tiers and actionable warnings:
 *  - FRESH: < 15 minutes
 *  - RECENT: 15–60 minutes
 *  - STALE: 1–6 hours
 *  - VERY STALE: > 6 hours
 */

export type FreshnessTier = 'FRESH' | 'RECENT' | 'STALE' | 'VERY_STALE';

export interface FreshnessInfo {
  tier: FreshnessTier;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  description: string;
  ageMinutes: number;
  isStale: boolean;
  relativeTimeStr: string;
}

export function getDataFreshness(timestampIso: string): FreshnessInfo {
  const eventTime = new Date(timestampIso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - eventTime);
  const ageMinutes = Math.floor(diffMs / (60 * 1000));
  const ageHours = Math.floor(ageMinutes / 60);

  let relativeTimeStr = '';
  if (ageMinutes < 1) {
    relativeTimeStr = 'Just now';
  } else if (ageMinutes === 1) {
    relativeTimeStr = '1 minute ago';
  } else if (ageMinutes < 60) {
    relativeTimeStr = `${ageMinutes} minutes ago`;
  } else if (ageHours === 1) {
    relativeTimeStr = '1 hour ago';
  } else if (ageHours < 24) {
    relativeTimeStr = `${ageHours} hours ago`;
  } else {
    const days = Math.floor(ageHours / 24);
    relativeTimeStr = `${days} day${days > 1 ? 's' : ''} ago`;
  }

  if (ageMinutes < 15) {
    return {
      tier: 'FRESH',
      label: 'FRESH INTELLIGENCE',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-300',
      dotColor: 'bg-emerald-500',
      description: 'Synchronized recently. High meteorological reliability.',
      ageMinutes,
      isStale: false,
      relativeTimeStr
    };
  }

  if (ageMinutes < 60) {
    return {
      tier: 'RECENT',
      label: 'RECENT CACHE',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-700',
      badgeBorder: 'border-sky-300',
      dotColor: 'bg-sky-500',
      description: 'Synchronized within the past hour. Good operational validity.',
      ageMinutes,
      isStale: false,
      relativeTimeStr
    };
  }

  if (ageMinutes < 360) { // 6 hours
    return {
      tier: 'STALE',
      label: 'STALE — INTERNET UNAVAILABLE',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      dotColor: 'bg-amber-500',
      description: 'Data may be outdated due to network outage. Exercise caution.',
      ageMinutes,
      isStale: true,
      relativeTimeStr
    };
  }

  return {
    tier: 'VERY_STALE',
    label: 'VERY STALE — CRITICAL WARNING',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    dotColor: 'bg-rose-500',
    description: 'Data is over 6 hours old. Weather situation may have changed significantly.',
    ageMinutes,
    isStale: true,
    relativeTimeStr
  };
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}
