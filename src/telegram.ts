/**
 * telegram.ts — Telegram Mini App integration for Casino Night
 *
 * Provides user identity via Telegram.WebApp and a helper to open Stars invoices.
 * Falls back silently when not running inside Telegram.
 */

import type { UserInfo } from './types';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

let _tgUser: TelegramUser | null = null;
let _isTelegram = false;

/** Check if we're running inside a Telegram Mini App */
export function isTelegramWebApp(): boolean {
  return _isTelegram;
}

/** Get the Telegram user info */
export function getTelegramUser(): TelegramUser | null {
  return _tgUser;
}

/** Convert Telegram user to our UserInfo format */
export function toUserInfo(tgUser: TelegramUser): UserInfo {
  const name = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
  return { id: `tg_${tgUser.id}`, name };
}

/**
 * Initialise Telegram Mini App SDK.
 * Returns true if running inside Telegram, false otherwise.
 */
export function initTelegram(): boolean {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return false;

    _isTelegram = true;

    // Expand to full height
    tg.expand();

    // Enable closing confirmation
    tg.enableClosingConfirmation();

    // Set header color
    tg.setHeaderColor('#0d0d17');
    tg.setBackgroundColor('#0d0d17');

    // Extract user info
    const initData = tg.initDataUnsafe || {};
    if (initData.user) {
      _tgUser = initData.user;
    } else if (initData.start_param) {
      // Deep link param — could contain anonymous session info
      console.log('Start param:', initData.start_param);
    }

    // Make buttons ready
    tg.ready();

    console.log('📱 Telegram Mini App initialized');
    console.log('  User:', _tgUser?.first_name || 'anonymous');
    console.log('  Theme:', tg.colorScheme);

    return true;
  } catch (e) {
    console.warn('⚠️ Not in Telegram:', e);
    _isTelegram = false;
    return false;
  }
}

/** Open a Stars invoice for purchasing credits */
export async function openStarsInvoice(
  invoiceLink: string
): Promise<boolean> {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return false;

  try {
    const result = await tg.openInvoice(invoiceLink);
    return result === 'paid';
  } catch (e) {
    console.error('Invoice error:', e);
    return false;
  }
}

/** Show an alert in Telegram style (or fall back to browser alert) */
export function showAlert(message: string): void {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

/** Show a confirmation dialog */
export function showConfirm(message: string): Promise<boolean> {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    return tg.showConfirm(message);
  }
  return Promise.resolve(confirm(message));
}

/** Haptic feedback (only works in Telegram) */
export function haptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning'): void {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    if (['light', 'medium', 'heavy'].includes(style)) {
      tg.HapticFeedback.impactOccurred(style as any);
    } else {
      tg.HapticFeedback.notificationOccurred(style as any);
    }
  } catch { /* ignore */ }
}

/** Close the Mini App */
export function closeTelegramApp(): void {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) tg.close();
}
