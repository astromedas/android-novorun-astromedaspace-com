import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {AppState, AppStateStatus} from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export interface SyncQueueItem {
  id: string;
  type: 'activity_create' | 'participation_create' | 'participation_update';
  endpoint: string;
  data: any;
  headers: any;
  attempts: number;
  nextRetry: number;
  created: number;
  sessionId: string;
}

export interface ActivityData {
  sessionId: string;
  userId: string;
  distance: number;
  duration: number;
  calories: number;
  avgPace: number;
  avgSpeed: number;
  routeCoordinates: {latitude: number; longitude: number}[];
  startTime: string;
  endTime: string;
  timestamp: string;
  eventId?: string;
  category?: string;
  routeType?: string;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: number;
}

class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncQueue: SyncQueueItem[] = [];
  private isProcessing = false;
  private retryTimeouts: {[key: string]: NodeJS.Timeout} = {};
  private maxRetries = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 60000; // 60 seconds
  private syncedIds: Set<string> = new Set();

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  private async initializeService() {
    // Load existing sync queue from storage
    await this.loadSyncQueue();

    // Load recently synced IDs to prevent duplicates
    await this.loadSyncedIds();

    // Set up app state listener
    AppState.addEventListener('change', this.handleAppStateChange);

    // Set up network state listener
    NetInfo.addEventListener(this.handleNetworkStateChange);

    // Start processing queue
    this.processQueue();

    // Clean up old synced IDs every hour
    setInterval(() => this.cleanupSyncedIds(), 3600000);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('📱 App became active, processing sync queue');
      this.processQueue();
    }
  };

  private handleNetworkStateChange = (state: any) => {
    if (state.isConnected) {
      console.log('🌐 Network connected, processing sync queue');
      this.processQueue();
    }
  };

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        console.log(`📥 Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('❌ Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ Error saving sync queue:', error);
    }
  }

  private async loadSyncedIds(): Promise<void> {
    try {
      const syncedData = await AsyncStorage.getItem('synced_ids');
      if (syncedData) {
        const syncedArray = JSON.parse(syncedData);
        this.syncedIds = new Set(syncedArray);
        console.log(`📥 Loaded ${this.syncedIds.size} synced IDs`);
      }
    } catch (error) {
      console.error('❌ Error loading synced IDs:', error);
      this.syncedIds = new Set();
    }
  }

  private async saveSyncedIds(): Promise<void> {
    try {
      const syncedArray = Array.from(this.syncedIds);
      await AsyncStorage.setItem('synced_ids', JSON.stringify(syncedArray));
    } catch (error) {
      console.error('❌ Error saving synced IDs:', error);
    }
  }

  private async cleanupSyncedIds(): Promise<void> {
    // Keep synced IDs for 24 hours to prevent duplicates
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const currentIds = Array.from(this.syncedIds);

    // Remove old IDs (assuming ID format includes timestamp)
    const validIds = currentIds.filter(id => {
      const parts = id.split('_');
      const timestamp = parseInt(parts[parts.length - 1], 10);
      return timestamp > oneDayAgo;
    });

    this.syncedIds = new Set(validIds);
    await this.saveSyncedIds();
    console.log(
      `🧹 Cleaned up synced IDs: ${currentIds.length} -> ${validIds.length}`,
    );
  }

  public async saveActivityData(activityData: ActivityData): Promise<void> {
    try {
      const key = `activity_${activityData.sessionId}`;
      await AsyncStorage.setItem(key, JSON.stringify(activityData));
      console.log(
        `💾 Saved activity data for session: ${activityData.sessionId}`,
      );
    } catch (error) {
      console.error('❌ Error saving activity data:', error);
    }
  }

  public async getActivityData(
    sessionId: string,
  ): Promise<ActivityData | null> {
    try {
      const key = `activity_${sessionId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error getting activity data:', error);
      return null;
    }
  }

  public async getAllPendingActivities(): Promise<ActivityData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const activityKeys = keys.filter(key => key.startsWith('activity_'));
      const activities: ActivityData[] = [];

      for (const key of activityKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const activity = JSON.parse(data);
          if (!activity.synced) {
            activities.push(activity);
          }
        }
      }

      return activities;
    } catch (error) {
      console.error('❌ Error getting pending activities:', error);
      return [];
    }
  }

  public async addToSyncQueue(
    type: SyncQueueItem['type'],
    endpoint: string,
    data: any,
    headers: any,
    sessionId: string,
  ): Promise<string> {
    const id = `${type}_${sessionId}_${Date.now()}`;

    // Check if already synced
    if (this.syncedIds.has(id)) {
      console.log(`⚠️ Item ${id} already synced, skipping`);
      return id;
    }

    const queueItem: SyncQueueItem = {
      id,
      type,
      endpoint,
      data,
      headers,
      attempts: 0,
      nextRetry: Date.now(),
      created: Date.now(),
      sessionId,
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();

    console.log(`📤 Added to sync queue: ${id}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing sync queue with ${this.syncQueue.length} items`);

    const now = Date.now();
    const itemsToProcess = this.syncQueue.filter(item => item.nextRetry <= now);

    for (const item of itemsToProcess) {
      await this.processQueueItem(item);
    }

    this.isProcessing = false;

    // Schedule next processing if there are still items
    if (this.syncQueue.length > 0) {
      const nextItem = this.syncQueue.reduce((earliest, current) =>
        current.nextRetry < earliest.nextRetry ? current : earliest,
      );
      const delay = Math.max(1000, nextItem.nextRetry - Date.now());

      setTimeout(() => this.processQueue(), delay);
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    try {
      console.log(
        `🚀 Attempting sync for ${item.id} (attempt ${item.attempts + 1})`,
      );

      const response = await axios({
        method: 'POST',
        url: item.endpoint,
        data: item.data,
        headers: item.headers,
        timeout: 30000,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Successfully synced ${item.id}`);

        // Mark as synced
        this.syncedIds.add(item.id);
        await this.saveSyncedIds();

        // Remove from queue
        this.syncQueue = this.syncQueue.filter(
          queueItem => queueItem.id !== item.id,
        );
        await this.saveSyncQueue();

        // Clear timeout if exists
        if (this.retryTimeouts[item.id]) {
          clearTimeout(this.retryTimeouts[item.id]);
          delete this.retryTimeouts[item.id];
        }

        // Update activity data as synced and clean up
        await this.markActivityAsSynced(item.sessionId);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error(`❌ Sync failed for ${item.id}:`, error.message);

      item.attempts++;

      if (item.attempts >= this.maxRetries) {
        console.error(
          `💀 Max retries reached for ${item.id}, removing from queue`,
        );
        this.syncQueue = this.syncQueue.filter(
          queueItem => queueItem.id !== item.id,
        );
        await this.saveSyncQueue();
        return;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        this.baseDelay * Math.pow(2, item.attempts - 1),
        this.maxDelay,
      );

      item.nextRetry = Date.now() + delay;
      await this.saveSyncQueue();

      console.log(
        `⏰ Will retry ${item.id} in ${delay}ms (attempt ${item.attempts}/${this.maxRetries})`,
      );
    }
  }

  private async markActivityAsSynced(sessionId: string): Promise<void> {
    try {
      const key = `activity_${sessionId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const activity = JSON.parse(data);
        activity.synced = true;
        activity.syncedAt = Date.now();

        // Save updated activity data temporarily (for UI feedback)
        await AsyncStorage.setItem(key, JSON.stringify(activity));

        // Remove after a short delay to allow UI to update
        setTimeout(async () => {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ Cleaned up synced activity data: ${sessionId}`);
        }, 5000);
      }
    } catch (error) {
      console.error('❌ Error marking activity as synced:', error);
    }
  }

  public async getSyncStatus(sessionId: string): Promise<{
    synced: boolean;
    pending: boolean;
    attempts: number;
    nextRetry?: number;
  }> {
    // Check if in sync queue
    const queueItem = this.syncQueue.find(item => item.sessionId === sessionId);
    if (queueItem) {
      return {
        synced: false,
        pending: true,
        attempts: queueItem.attempts,
        nextRetry: queueItem.nextRetry,
      };
    }

    // Check if already synced
    const activity = await this.getActivityData(sessionId);
    if (activity) {
      return {
        synced: activity.synced || false,
        pending: !activity.synced,
        attempts: activity.syncAttempts || 0,
      };
    }

    return {
      synced: false,
      pending: false,
      attempts: 0,
    };
  }

  public async retrySync(sessionId?: string): Promise<void> {
    if (sessionId) {
      // Retry specific session
      const queueItems = this.syncQueue.filter(
        item => item.sessionId === sessionId,
      );
      for (const item of queueItems) {
        item.nextRetry = Date.now();
      }
      await this.saveSyncQueue();
    } else {
      // Retry all pending items
      for (const item of this.syncQueue) {
        item.nextRetry = Date.now();
      }
      await this.saveSyncQueue();
    }

    this.processQueue();
  }

  public getQueueStatus(): {
    totalItems: number;
    pendingItems: number;
    failedItems: number;
  } {
    const now = Date.now();
    const pendingItems = this.syncQueue.filter(
      item => item.nextRetry <= now,
    ).length;
    const failedItems = this.syncQueue.filter(
      item => item.attempts >= 3,
    ).length;

    return {
      totalItems: this.syncQueue.length,
      pendingItems,
      failedItems,
    };
  }

  public async clearSyncedData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const activityKeys = keys.filter(key => key.startsWith('activity_'));

      for (const key of activityKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const activity = JSON.parse(data);
          if (activity.synced) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      console.log('🧹 Cleared all synced activity data');
    } catch (error) {
      console.error('❌ Error clearing synced data:', error);
    }
  }
}

export default OfflineSyncService.getInstance();
