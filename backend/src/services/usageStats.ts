/**
 * Usage statistics tracking service
 * Tracks API usage for monitoring and cost estimation
 */

export interface UsageRecord {
  timestamp: Date;
  endpoint: string;
  success: boolean;
  sessionToken?: string;
  errorType?: string;
}

export interface DailyStats {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  autocompleteRequests: number;
  placeDetailsRequests: number;
  uniqueSessions: number;
  estimatedCost: number;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  autocompleteRequests: number;
  placeDetailsRequests: number;
  uniqueSessions: number;
  estimatedCost: number;
  costBreakdown: {
    autocompleteCost: number;
    placeDetailsCost: number;
  };
  dailyStats: DailyStats[];
  recentRequests: UsageRecord[];
  uptime: number;
}

class UsageStatsService {
  private records: UsageRecord[] = [];
  private startTime: Date = new Date();
  private readonly MAX_RECORDS = 10000; // Keep last 10k records in memory

  // Pricing (per Google Maps Platform)
  private readonly AUTOCOMPLETE_COST_PER_SESSION = 0.00283; // $2.83 per 1000
  private readonly PLACE_DETAILS_COST = 0.017; // $0.017 per request

  /**
   * Track an API request
   */
  trackRequest(
    endpoint: 'autocomplete' | 'place-details',
    success: boolean,
    sessionToken?: string,
    errorType?: string
  ): void {
    const record: UsageRecord = {
      timestamp: new Date(),
      endpoint,
      success,
      sessionToken,
      errorType,
    };

    this.records.push(record);

    // Limit memory usage by keeping only recent records
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS);
    }
  }

  /**
   * Get usage statistics
   */
  getStats(days: number = 7): UsageStats {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Filter records within the time range
    const recentRecords = this.records.filter(
      (record) => record.timestamp >= cutoffDate
    );

    // Calculate totals
    const totalRequests = recentRecords.length;
    const successfulRequests = recentRecords.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const autocompleteRequests = recentRecords.filter(
      (r) => r.endpoint === 'autocomplete'
    ).length;

    const placeDetailsRequests = recentRecords.filter(
      (r) => r.endpoint === 'place-details'
    ).length;

    // Count unique sessions
    const uniqueSessionTokens = new Set(
      recentRecords
        .filter((r) => r.sessionToken)
        .map((r) => r.sessionToken as string)
    );
    const uniqueSessions = uniqueSessionTokens.size;

    // Estimate costs
    const autocompleteCost =
      autocompleteRequests * this.AUTOCOMPLETE_COST_PER_SESSION;
    const placeDetailsCost =
      placeDetailsRequests * this.PLACE_DETAILS_COST;
    const estimatedCost = autocompleteCost + placeDetailsCost;

    // Calculate daily stats
    const dailyStats = this.calculateDailyStats(recentRecords, days);

    // Get recent requests (last 100)
    const recentRequests = this.records.slice(-100).reverse();

    // Calculate uptime in seconds
    const uptime = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      autocompleteRequests,
      placeDetailsRequests,
      uniqueSessions,
      estimatedCost: parseFloat(estimatedCost.toFixed(4)),
      costBreakdown: {
        autocompleteCost: parseFloat(autocompleteCost.toFixed(4)),
        placeDetailsCost: parseFloat(placeDetailsCost.toFixed(4)),
      },
      dailyStats,
      recentRequests,
      uptime,
    };
  }

  /**
   * Calculate daily statistics
   */
  private calculateDailyStats(records: UsageRecord[], days: number): DailyStats[] {
    const dailyMap = new Map<string, UsageRecord[]>();

    // Group records by day
    records.forEach((record) => {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(record);
    });

    // Generate stats for each day
    const stats: DailyStats[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dayRecords = dailyMap.get(dateKey) || [];

      const totalRequests = dayRecords.length;
      const successfulRequests = dayRecords.filter((r) => r.success).length;
      const failedRequests = totalRequests - successfulRequests;

      const autocompleteRequests = dayRecords.filter(
        (r) => r.endpoint === 'autocomplete'
      ).length;

      const placeDetailsRequests = dayRecords.filter(
        (r) => r.endpoint === 'place-details'
      ).length;

      const uniqueSessionTokens = new Set(
        dayRecords.filter((r) => r.sessionToken).map((r) => r.sessionToken as string)
      );

      const autocompleteCost =
        autocompleteRequests * this.AUTOCOMPLETE_COST_PER_SESSION;
      const placeDetailsCost =
        placeDetailsRequests * this.PLACE_DETAILS_COST;
      const estimatedCost = autocompleteCost + placeDetailsCost;

      stats.push({
        date: dateKey,
        totalRequests,
        successfulRequests,
        failedRequests,
        autocompleteRequests,
        placeDetailsRequests,
        uniqueSessions: uniqueSessionTokens.size,
        estimatedCost: parseFloat(estimatedCost.toFixed(4)),
      });
    }

    return stats.reverse(); // Return in chronological order
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.records = [];
    this.startTime = new Date();
  }

  /**
   * Get summary for quick overview
   */
  getSummary(): {
    totalRequests: number;
    estimatedCost: number;
    successRate: number;
    uptime: number;
  } {
    const stats = this.getStats(30); // Last 30 days
    const successRate = stats.totalRequests > 0
      ? (stats.successfulRequests / stats.totalRequests) * 100
      : 0;

    return {
      totalRequests: stats.totalRequests,
      estimatedCost: stats.estimatedCost,
      successRate: parseFloat(successRate.toFixed(2)),
      uptime: stats.uptime,
    };
  }
}

// Singleton instance
export const usageStatsService = new UsageStatsService();
