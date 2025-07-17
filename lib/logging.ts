import { createClient } from './supabase-client';
import { getLocalISOString } from './utils';
import { createFallbackLogger, handleLoggingError } from './error-handler-network';

/**
 * Log levels for different types of logs
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Log categories for different parts of the application
 */
export enum LogCategory {
  RESERVATION = 'reservation',
  PAYMENT = 'payment',
  USER = 'user',
  SYSTEM = 'system',
  CONSUMPTION = 'consumption',
  ROOM = 'room',
  GUEST = 'guest'
}

/**
 * Interface for log entry data
 */
export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  source?: string;
  tags?: string[];
}

// Create a fallback logger that uses localStorage
const fallbackLogger = createFallbackLogger();

// Flag to track if we've shown the logging error message
let loggingErrorShown = false;

/**
 * Creates a log entry in the database
 * @param entry Log entry data
 * @returns Promise with the result of the log operation
 */
export async function createLog(entry: LogEntry): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('system_logs')
      .insert({
        level: entry.level,
        category: entry.category,
        message: entry.message,
        details: entry.details || {},
        user_id: entry.user_id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        source: entry.source || 'web',
        tags: entry.tags || [],
        created_at: getLocalISOString()
      });
    
    if (error) {
      // Use fallback logging and handle the error
      fallbackLogger(`${entry.level.toUpperCase()}: ${entry.message}`, entry.details);
      
      // Only show the error toast once per session to avoid spamming
      if (!loggingErrorShown) {
        handleLoggingError(error, fallbackLogger);
        loggingErrorShown = true;
      } else {
        console.error('Error creating log entry:', error);
      }
      
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    // Use fallback logging and handle the error
    fallbackLogger(`${entry.level.toUpperCase()}: ${entry.message}`, entry.details);
    
    // Only show the error toast once per session to avoid spamming
    if (!loggingErrorShown) {
      handleLoggingError(error, fallbackLogger);
      loggingErrorShown = true;
    } else {
      console.error('Error in createLog:', error);
    }
    
    return { success: false, error };
  }
}

/**
 * Logs a debug message
 * @param message Log message
 * @param category Log category
 * @param details Additional details
 * @param options Additional log options
 */
export function logDebug(
  message: string,
  category: LogCategory,
  details?: any,
  options?: Partial<Omit<LogEntry, 'level' | 'category' | 'message' | 'details'>>
): Promise<{ success: boolean; error?: any }> {
  return createLog({
    level: LogLevel.DEBUG,
    category,
    message,
    details,
    ...options
  });
}

/**
 * Logs an info message
 * @param message Log message
 * @param category Log category
 * @param details Additional details
 * @param options Additional log options
 */
export function logInfo(
  message: string,
  category: LogCategory,
  details?: any,
  options?: Partial<Omit<LogEntry, 'level' | 'category' | 'message' | 'details'>>
): Promise<{ success: boolean; error?: any }> {
  return createLog({
    level: LogLevel.INFO,
    category,
    message,
    details,
    ...options
  });
}

/**
 * Logs a warning message
 * @param message Log message
 * @param category Log category
 * @param details Additional details
 * @param options Additional log options
 */
export function logWarning(
  message: string,
  category: LogCategory,
  details?: any,
  options?: Partial<Omit<LogEntry, 'level' | 'category' | 'message' | 'details'>>
): Promise<{ success: boolean; error?: any }> {
  return createLog({
    level: LogLevel.WARNING,
    category,
    message,
    details,
    ...options
  });
}

/**
 * Logs an error message
 * @param message Log message
 * @param category Log category
 * @param details Additional details
 * @param options Additional log options
 */
export function logError(
  message: string,
  category: LogCategory,
  details?: any,
  options?: Partial<Omit<LogEntry, 'level' | 'category' | 'message' | 'details'>>
): Promise<{ success: boolean; error?: any }> {
  return createLog({
    level: LogLevel.ERROR,
    category,
    message,
    details,
    ...options
  });
}

/**
 * Logs a critical error message
 * @param message Log message
 * @param category Log category
 * @param details Additional details
 * @param options Additional log options
 */
export function logCritical(
  message: string,
  category: LogCategory,
  details?: any,
  options?: Partial<Omit<LogEntry, 'level' | 'category' | 'message' | 'details'>>
): Promise<{ success: boolean; error?: any }> {
  return createLog({
    level: LogLevel.CRITICAL,
    category,
    message,
    details,
    ...options
  });
}

/**
 * Logs a reservation action
 * @param action Action type (e.g., 'check-in', 'check-out', 'cancel')
 * @param reservationId Reservation ID
 * @param details Additional details
 * @param success Whether the action was successful
 * @param errorDetails Error details if the action failed
 */
export function logReservationAction(
  action: string,
  reservationId: string,
  details: any,
  success: boolean = true,
  errorDetails?: any
): Promise<{ success: boolean; error?: any }> {
  const level = success ? LogLevel.INFO : LogLevel.ERROR;
  const message = success 
    ? `Reservation action '${action}' completed successfully` 
    : `Reservation action '${action}' failed`;
  
  return createLog({
    level,
    category: LogCategory.RESERVATION,
    message,
    details: {
      action,
      success,
      ...details,
      ...(errorDetails ? { error: errorDetails } : {})
    },
    entity_type: 'reservation',
    entity_id: reservationId,
    tags: [action, success ? 'success' : 'failure']
  });
}

/**
 * Logs a payment action
 * @param action Action type (e.g., 'process', 'refund')
 * @param paymentId Payment ID
 * @param reservationId Reservation ID
 * @param details Additional details
 * @param success Whether the action was successful
 * @param errorDetails Error details if the action failed
 */
export function logPaymentAction(
  action: string,
  paymentId: string,
  reservationId: string,
  details: any,
  success: boolean = true,
  errorDetails?: any
): Promise<{ success: boolean; error?: any }> {
  const level = success ? LogLevel.INFO : LogLevel.ERROR;
  const message = success 
    ? `Payment action '${action}' completed successfully` 
    : `Payment action '${action}' failed`;
  
  return createLog({
    level,
    category: LogCategory.PAYMENT,
    message,
    details: {
      action,
      success,
      reservation_id: reservationId,
      ...details,
      ...(errorDetails ? { error: errorDetails } : {})
    },
    entity_type: 'payment',
    entity_id: paymentId,
    tags: [action, success ? 'success' : 'failure']
  });
}

/**
 * Logs a consumption action
 * @param action Action type (e.g., 'add', 'finalize', 'delete')
 * @param consumptionIds Consumption IDs
 * @param reservationId Reservation ID
 * @param details Additional details
 * @param success Whether the action was successful
 * @param errorDetails Error details if the action failed
 */
export function logConsumptionAction(
  action: string,
  consumptionIds: string | string[],
  reservationId: string,
  details: any,
  success: boolean = true,
  errorDetails?: any
): Promise<{ success: boolean; error?: any }> {
  const level = success ? LogLevel.INFO : LogLevel.ERROR;
  const message = success 
    ? `Consumption action '${action}' completed successfully` 
    : `Consumption action '${action}' failed`;
  
  const ids = Array.isArray(consumptionIds) ? consumptionIds : [consumptionIds];
  
  return createLog({
    level,
    category: LogCategory.CONSUMPTION,
    message,
    details: {
      action,
      success,
      consumption_ids: ids,
      reservation_id: reservationId,
      ...details,
      ...(errorDetails ? { error: errorDetails } : {})
    },
    entity_type: 'consumption',
    entity_id: ids.length === 1 ? ids[0] : undefined,
    tags: [action, success ? 'success' : 'failure']
  });
}

/**
 * Logs a validation error
 * @param context Context where the validation error occurred
 * @param details Validation error details
 * @param entityType Entity type (e.g., 'reservation', 'payment')
 * @param entityId Entity ID
 */
export function logValidationError(
  context: string,
  details: any,
  entityType?: string,
  entityId?: string
): Promise<{ success: boolean; error?: any }> {
  return createLog({
    level: LogLevel.WARNING,
    category: LogCategory.SYSTEM,
    message: `Validation error in ${context}`,
    details,
    entity_type: entityType,
    entity_id: entityId,
    tags: ['validation', 'error', context]
  });
}

/**
 * Logs a system error
 * @param error Error object or message
 * @param context Context where the error occurred
 * @param details Additional details
 */
export function logSystemError(
  error: Error | string,
  context: string,
  details?: any
): Promise<{ success: boolean; error?: any }> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  return createLog({
    level: LogLevel.ERROR,
    category: LogCategory.SYSTEM,
    message: `System error in ${context}: ${errorMessage}`,
    details: {
      error: errorMessage,
      stack: errorStack,
      context,
      ...details
    },
    tags: ['system', 'error', context]
  });
}