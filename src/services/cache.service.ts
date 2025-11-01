import logger from "../utils/logger";

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export class CacheService {
    private static cache = new Map<string, CacheEntry<any>>();
    private static defaultTTL = 3600000; // 1 hour in milliseconds

    // Set cache with TTL
    static set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { data, expiresAt });
        logger.debug(`Cache set: ${key}, expires in ${ttl}ms`);
    }

    // Get from cache
    static get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            logger.debug(`Cache miss: ${key}`);
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            logger.debug(`Cache expired: ${key}`);
            return null;
        }

        logger.debug(`Cache hit: ${key}`);
        return entry.data as T;
    }

    // Delete from cache
    static delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug(`Cache deleted: ${key}`);
        }
        return deleted;
    }

    // Clear all cache
    static clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        logger.info(`Cache cleared: ${size} entries removed`);
    }

    // Clear expired entries
    static clearExpired(): number {
        const now = Date.now();
        let count = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                count++;
            }
        }

        if (count > 0) {
            logger.info(`Expired cache entries cleared: ${count}`);
        }

        return count;
    }

    // Get cache stats
    static getStats() {
        const now = Date.now();
        let activeCount = 0;
        let expiredCount = 0;

        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expiredCount++;
            } else {
                activeCount++;
            }
        }

        return {
            total: this.cache.size,
            active: activeCount,
            expired: expiredCount,
        };
    }

    // Get or set (with callback)
    static async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = this.defaultTTL
    ): Promise<T> {
        const cached = this.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        logger.debug(`Cache miss, fetching: ${key}`);
        const data = await fetchFn();
        this.set(key, data, ttl);

        return data;
    }

    // Initialize cleanup interval
    static initCleanup(intervalMs: number = 600000): void {
        // Clean up every 10 minutes by default
        setInterval(() => {
            this.clearExpired();
        }, intervalMs);

        logger.info(`Cache cleanup initialized: every ${intervalMs}ms`);
    }
}

// Initialize cleanup on import
CacheService.initCleanup();
