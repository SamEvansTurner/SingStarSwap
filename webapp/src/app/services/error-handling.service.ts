import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorCode?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  /**
   * Handle song loading errors
   */
  handleSongLoadError(error: any): ErrorState {
    console.error('Song loading failed:', error);
    
    let errorMessage = 'Failed to load songs. Please try again.';
    let errorCode = 'SONG_LOAD_ERROR';

    if (error?.message) {
      errorMessage = `Loading failed: ${error.message}`;
    }

    if (error?.status) {
      errorCode = `HTTP_${error.status}`;
      errorMessage = `Network error (${error.status}): Unable to load songs.`;
    }

    return {
      hasError: true,
      errorMessage,
      errorCode,
      timestamp: Date.now()
    };
  }

  /**
   * Handle game data loading errors
   */
  handleGameDataError(error: any): ErrorState {
    console.error('Game data loading failed:', error);
    
    return {
      hasError: true,
      errorMessage: 'Failed to load game data. Some features may be limited.',
      errorCode: 'GAME_DATA_ERROR',
      timestamp: Date.now()
    };
  }

  /**
   * Handle song processing errors
   */
  handleProcessingError(error: any): ErrorState {
    console.error('Song processing failed:', error);
    
    return {
      hasError: true,
      errorMessage: 'Failed to process song data. Please refresh the page.',
      errorCode: 'PROCESSING_ERROR',
      timestamp: Date.now()
    };
  }

  /**
   * Handle dialog/mount errors
   */
  handleMountError(error: any): ErrorState {
    console.error('Mount operation failed:', error);
    
    let errorMessage = 'Failed to mount game. Please try again.';
    
    if (error?.message?.includes('network')) {
      errorMessage = 'Network error: Unable to connect to console.';
    } else if (error?.message?.includes('timeout')) {
      errorMessage = 'Mount operation timed out. Please try again.';
    }

    return {
      hasError: true,
      errorMessage,
      errorCode: 'MOUNT_ERROR',
      timestamp: Date.now()
    };
  }

  /**
   * Create a success state (no error)
   */
  createSuccessState(): ErrorState {
    return {
      hasError: false,
      errorMessage: '',
      timestamp: Date.now()
    };
  }

  /**
   * Log error for debugging purposes
   */
  logError(context: string, error: any): void {
    const errorInfo = {
      context,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    };
    
    console.error('Application Error:', errorInfo);
    
    // In production, you might want to send this to a logging service
    // this.sendToLoggingService(errorInfo);
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error: any): boolean {
    if (!error) return true;
    
    // Network errors are usually recoverable
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    // Timeout errors are recoverable
    if (error?.message?.includes('timeout')) {
      return true;
    }
    
    // Default to recoverable for user experience
    return true;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: any): string {
    if (!error) return 'An unexpected error occurred.';
    
    if (error?.status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (error?.status >= 500) {
      return 'Server error occurred. Please try again later.';
    }
    
    if (error?.message?.includes('network')) {
      return 'Network connection error. Please check your connection.';
    }
    
    return error?.message || 'An unexpected error occurred.';
  }
}
