import { AppState, Transaction } from '../types';
import { format, addDays } from 'date-fns';

const NOTIFIED_KEY = 'clareza_notified_transactions';

interface NotifiedState {
  txId: string;
  dateNotified: string; // YYYY-MM-DD
  type: 'tomorrow' | 'today';
}

/**
 * Request permission for native system notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('System notifications are not supported in this environment.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Checks if notification permission is currently granted
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Triggers a native system notification safely
 */
function triggerNativeNotification(title: string, body: string, iconUrl = '/logo.png') {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        vibrate: [100, 50, 100],
      } as any);
    } catch (e) {
      // In some service worker or hybrid contexts, standard Notification constructor may fail, so we log it
      console.error('Failed to instantiate native Notification object', e);
    }
  }
}

/**
 * Returns list of notified transactions saved in localStorage to avoid double-firing
 */
function getAlreadyNotified(): Record<string, NotifiedState> {
  try {
    const saved = localStorage.getItem(NOTIFIED_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a notified transaction state
 */
function saveNotified(txId: string, type: 'tomorrow' | 'today', dateString: string) {
  try {
    const notified = getAlreadyNotified();
    notified[`${txId}_${type}`] = {
      txId,
      dateNotified: dateString,
      type
    };
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
  } catch (e) {
    console.error('Failed to save notified state', e);
  }
}

export interface TransactionAlert {
  transaction: Transaction;
  type: 'tomorrow' | 'today';
  message: string;
  monthId: string;
}

/**
 * Analyzes the AppState and triggers notifications for transactions due today or tomorrow.
 * Returns the list of active alerts so that the UI can render in-app warning banners or cards.
 */
export function checkAndTriggerNotifications(state: AppState): TransactionAlert[] {
  const alerts: TransactionAlert[] = [];
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const alreadyNotified = getAlreadyNotified();

  if (!state.monthlyData) return [];

  // Loop through all monthly records to find pending transactions
  Object.entries(state.monthlyData).forEach(([monthId, monthData]) => {
    if (!monthData || !monthData.transactions) return;

    monthData.transactions.forEach((tx) => {
      // We only care about pending incomes ('income') and expenses ('expense')
      const isEligibleType = tx.type === 'income' || tx.type === 'expense';
      if (!tx.isPending || !isEligibleType) return;

      const txDateStr = tx.date; // Format is 'YYYY-MM-DD'
      const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount);
      const isIncome = tx.type === 'income';
      const label = isIncome ? 'Receita' : 'Conta/Despesa';

      if (txDateStr === tomorrowStr) {
        // Vence amanhã (Falta 1 dia)
        const cacheKey = `${tx.id}_tomorrow`;
        const alertMessage = `Falta 1 dia! Sua ${label.toLowerCase()} "${tx.description}" de ${formattedAmount} vence amanhã (${format(addDays(new Date(), 1), 'dd/MM')}).`;
        
        alerts.push({
          transaction: tx,
          type: 'tomorrow',
          message: alertMessage,
          monthId
        });

        // Trigger native notification if not already notified TODAY for this tomorrow-state
        const lastNotified = alreadyNotified[cacheKey];
        if (!lastNotified || lastNotified.dateNotified !== todayStr) {
          const title = isIncome ? '💰 Receita chegando amanhã!' : '⚠️ Conta vencendo amanhã!';
          triggerNativeNotification(title, alertMessage);
          saveNotified(tx.id, 'tomorrow', todayStr);
        }
      } else if (txDateStr === todayStr) {
        // Vence hoje
        const cacheKey = `${tx.id}_today`;
        const alertMessage = `Atenção! Sua ${label.toLowerCase()} "${tx.description}" de ${formattedAmount} vence HOJE e ainda não foi confirmada.`;

        alerts.push({
          transaction: tx,
          type: 'today',
          message: alertMessage,
          monthId
        });

        // Trigger native notification if not already notified TODAY for this today-state
        const lastNotified = alreadyNotified[cacheKey];
        if (!lastNotified || lastNotified.dateNotified !== todayStr) {
          const title = isIncome ? '⚡ Receber hoje: ' + tx.description : '🚨 Vence hoje: ' + tx.description;
          triggerNativeNotification(title, alertMessage);
          saveNotified(tx.id, 'today', todayStr);
        }
      }
    });
  });

  return alerts;
}
