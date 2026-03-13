import { supabase } from './supabase.js';
import pLimit from 'p-limit';

// ─── Config ────────────────────────────────────────────────────────
const ITUNES_API = 'https://itunes.apple.com/search';
const LIMIT = 200;
const DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS || '3000', 10);
const CURRENT_YEAR = new Date().getFullYear();
const DB_BATCH_SIZE = 50;
const MACRO_BATCH_SIZE = parseInt(process.env.MACRO_BATCH_SIZE || '400', 10);
const MACRO_PAUSE_MS = parseInt(process.env.MACRO_PAUSE_MS || '15000', 10);
const MAX_RETRIES = 5;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '4', 10);
const CHUNK_TOTAL = parseInt(process.env.CHUNK_TOTAL || '1', 10);
const CHUNK_INDEX = parseInt(process.env.CHUNK_INDEX || '0', 10);

// ─── User-Agent Rotation ───────────────────────────────────────────
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── Query Generation ──────────────────────────────────────────────
// Same base prefixes as iOS scraper
const COMMON_PREFIXES = [
    'my', 'the', 'app', 'pro', 'go', 'ez', 'ai', 'mr', 'dr',
    'new', 'top', 'get', 'one', 'all', 'best', 'fast', 'easy',
    'smart', 'super', 'quick', 'mini', 'mega', 'ultra', 'auto',
    'daily', 'simple', 'live', 'free', 'plus', 'max', 'lite',
    'photo', 'video', 'music', 'chat', 'game', 'fit', 'pay',
    'track', 'scan', 'learn', 'read', 'cook', 'shop', 'find',
    'health', 'money', 'baby', 'kid', 'pet', 'food', 'note',
    'edit', 'calc', 'map', 'task', 'plan', 'work', 'play',
    'study', 'flash', 'crypto', 'stock', 'yoga', 'gym', 'run',
    'sleep', 'water', 'step', 'timer', 'alarm', 'radio', 'news',
    'bible', 'pray', 'vpn', 'pdf', 'qr', 'zip', 'cam', 'pic',
];

const CATEGORY_TERMS = [
    'finance', 'budget', 'invest', 'trading', 'banking',
    'fitness', 'workout', 'exercise', 'meditation', 'wellness',
    'recipe', 'restaurant', 'delivery', 'grocery',
    'travel', 'hotel', 'flight', 'booking', 'taxi',
    'dating', 'social', 'messenger', 'calling',
    'weather', 'calendar', 'reminder', 'widget',
    'drawing', 'design', 'color', 'filter', 'camera',
    'podcast', 'stream', 'player', 'lyrics',
    'school', 'math', 'language', 'dictionary', 'translate',
    'parking', 'rental', 'moving', 'storage',
    'doctor', 'pharmacy', 'clinic', 'dental',
    'invoice', 'receipt', 'expense', 'salary',
    'realtor', 'property', 'mortgage', 'loan',
];

// macOS-specific terms not in the iOS sets
const MACOS_TERMS = [
    'terminal', 'xcode', 'swift', 'debug', 'script', 'shell',
    'server', 'backup', 'ssh', 'proxy', 'cpu', 'firewall',
    'remote', 'desktop', 'virtual', 'util', 'folder', 'archive',
    'compress', 'regex', 'json', 'markdown', 'diagram', 'kanban',
    'clipboard', 'launcher', 'snippet', 'automator', 'workflow',
    'shortcut', 'extension', 'plugin', 'dock', 'finder', 'spotlight',
    'developer', 'package', 'deploy', 'docker', 'database', 'sql',
    'git', 'notion', 'obsidian', 'focus', 'pomodoro', 'journal',
    'capture', 'ocr', 'grammar', 'inbox', 'font', 'palette',
    'wallpaper', 'screensaver', 'menubar', 'sidebar', 'toolbar',
    'password', 'keychain', 'vault', 'cleaner', 'optimizer',
    'memory', 'duplicate', 'uninstaller', 'battery', 'network',
    'bluetooth', 'tiling', 'resize', 'snap', 'gesture', 'hotkey',
    'macro', 'encoder', 'converter', 'renderer', 'downloader',
    'transfer', 'versioning', 'diff', 'merge', 'branch',
];

// Top 150 English digraphs — each expanded with a–z to generate 3,900 targeted trigrams
// Covers common word starts like "the" → tha/thb/.../thz, "pro" → pra/prb/.../prz, etc.
const TOP_DIGRAPHS = [
    'th', 'he', 'in', 'er', 'an', 're', 'on', 'en', 'at', 'es',
    'st', 'ed', 'nd', 'to', 'or', 'ea', 'ti', 'ar', 'te', 'ng',
    'al', 'it', 'as', 'is', 'ha', 'et', 'se', 'ou', 'of', 'le',
    'sa', 've', 'ro', 'ra', 'li', 'hi', 'ri', 'ne', 'me', 'de',
    'co', 'ta', 'ec', 'si', 'll', 'so', 'na', 'ir', 'la', 'nt',
    'io', 'ca', 'ma', 'el', 'wi', 'ge', 'fo', 'ce', 'ic', 'ch',
    'be', 'no', 'sp', 'su', 'pe', 'di', 'sh', 'tr', 'pr', 'cl',
    'gr', 'wo', 'wh', 'ac', 'ad', 'bu', 'em', 'fe', 'fi', 'fl',
    'fr', 'go', 'gu', 'hu', 'im', 'ju', 'ke', 'ki', 'lo', 'lu',
    'mi', 'mo', 'mu', 'ni', 'nu', 'ob', 'oc', 'od', 'og', 'ol',
    'om', 'op', 'ot', 'ov', 'ow', 'pa', 'ph', 'pi', 'pl', 'po',
    'pu', 'qu', 'sc', 'sk', 'sl', 'sm', 'sn', 'sw', 'sy', 'un',
    'up', 'us', 'ut', 'vi', 'vo', 'wa', 'we', 'wr', 'ya', 'ye',
    'yo', 'ab', 'ag', 'ai', 'ak', 'ba', 'bi', 'bl', 'bo', 'br',
    'by', 'du', 'dy', 'ef', 'eg', 'ek', 'eu', 'ev', 'ew', 'ex',
];

function generateMacQueries() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const digits = '0123456789'.split('');
    const seen = new Set();
    const queries = [];

    const add = (term) => {
        if (!seen.has(term)) {
            seen.add(term);
            queries.push(term);
        }
    };

    // Single letters (26)
    alphabet.forEach(add);

    // Two-letter combos aa–zz (676)
    for (const a of alphabet) {
        for (const b of alphabet) {
            add(a + b);
        }
    }

    // Digits and digit+letter combos (270)
    digits.forEach(add);
    for (const d of digits) {
        for (const a of alphabet) {
            add(d + a);
        }
    }

    // Base prefixes, category terms, and macOS-specific terms
    for (const term of [...COMMON_PREFIXES, ...CATEGORY_TERMS, ...MACOS_TERMS]) {
        add(term);
    }

    // Three-letter trigrams from top 150 digraphs × a–z (up to 3,900 new queries)
    for (const digraph of TOP_DIGRAPHS) {
        for (const c of alphabet) {
            add(digraph + c);
        }
    }

    return queries;
}

// ─── Helpers ───────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg) {
    console.log(`[${timestamp()}] ${msg}`);
}

function logError(msg) {
    console.error(`[${timestamp()}] ❌ ${msg}`);
}

// ─── Discord Notifications ─────────────────────────────────────────
async function notify(message) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message }),
        });
    } catch (err) {
        logError(`Discord notification failed: ${err.message}`);
    }
}

// ─── iTunes API Fetch ──────────────────────────────────────────────
async function fetchApps(term) {
    const url = `${ITUNES_API}?term=${encodeURIComponent(term)}&entity=macSoftware&limit=${LIMIT}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': getRandomUserAgent() },
            });

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const backoff = retryAfter ? (parseInt(retryAfter, 10) * 1000) : (attempt * 2000);
                logError(`Attempt ${attempt}/${MAX_RETRIES} for "${term}": HTTP 429 Too Many Requests`);
                log(`  Retrying in ${backoff}ms...`);
                await sleep(backoff);
                continue;
            }

            // 403 won't resolve with retries — skip immediately
            if (response.status === 403) {
                return [];
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (err) {
            logError(`Attempt ${attempt}/${MAX_RETRIES} for "${term}": ${err.message}`);

            if (attempt < MAX_RETRIES) {
                const backoff = DELAY_MS * Math.pow(2, attempt);
                log(`  Retrying in ${backoff}ms...`);
                await sleep(backoff);
            }
        }
    }

    logError(`All retries failed for "${term}", skipping.`);
    return [];
}

// ─── Data Extraction ───────────────────────────────────────────────
function extractApp(result) {
    return {
        track_id: result.trackId,
        name: result.trackName,
        description: result.description || null,
        developer: result.sellerName || null,
        bundle_id: result.bundleId || null,
        release_date: result.releaseDate || null,
        last_updated: result.currentVersionReleaseDate || null,
        app_store_url: result.trackViewUrl || null,
        icon: result.artworkUrl100 || null,
        category: result.primaryGenreName || null,
        price: result.price ?? null,
        formatted_price: result.formattedPrice || null,
        average_user_rating: result.averageUserRating ?? null,
        user_rating_count: result.userRatingCount ?? null,
        macos_app: true,
    };
}

function isCurrentYear(dateStr) {
    if (!dateStr) return false;
    const year = new Date(dateStr).getFullYear();
    return year === CURRENT_YEAR;
}

// ─── Database Upsert ───────────────────────────────────────────────
async function upsertApps(apps) {
    if (apps.length === 0) return 0;

    let upserted = 0;

    for (let i = 0; i < apps.length; i += DB_BATCH_SIZE) {
        const batch = apps.slice(i, i + DB_BATCH_SIZE);

        const { error } = await supabase
            .from('apps')
            .upsert(batch, {
                onConflict: 'track_id',
                ignoreDuplicates: false,
            });

        if (error) {
            logError(`Upsert failed: ${error.message}`);
        } else {
            upserted += batch.length;
        }
    }

    return upserted;
}

// ─── Main Crawler ──────────────────────────────────────────────────
async function crawl() {
    let queries = generateMacQueries();

    if (CHUNK_TOTAL > 1) {
        const chunkSize = Math.ceil(queries.length / CHUNK_TOTAL);
        queries = queries.slice(CHUNK_INDEX * chunkSize, (CHUNK_INDEX + 1) * chunkSize);
    }

    // Load only track_ids already confirmed as macOS apps.
    // Apps in DB without macos_app=true (iOS-only records) are NOT skipped —
    // they'll be upserted and the macos_app flag will be set to true.
    let existingIds = new Set();
    try {
        let hasMore = true;
        let start = 0;
        const step = 1000;
        while (hasMore) {
            const { data, error } = await supabase
                .from('apps')
                .select('track_id')
                .eq('macos_app', true)
                .range(start, start + step - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                data.forEach(r => existingIds.add(r.track_id));
                start += step;
            } else {
                hasMore = false;
            }
        }
        log(`Loaded ${existingIds.size} existing macOS app IDs from database`);
    } catch (err) {
        log(`Could not preload existing IDs: ${err.message}`);
    }

    const seenIds = new Set();
    const newApps = [];

    const stats = {
        totalQueries: queries.length,
        completedQueries: 0,
        totalResults: 0,
        duplicatesSkipped: 0,
        alreadyInDb: 0,
        filteredByYear: 0,
        newAppsFound: 0,
        failedQueries: 0,
        upsertedCount: 0,
    };

    const chunkLabel = CHUNK_TOTAL > 1 ? ` (chunk ${CHUNK_INDEX + 1}/${CHUNK_TOTAL})` : '';
    log('═══════════════════════════════════════════════════════');
    log(`  macOS App Discovery Crawler${chunkLabel}`);
    log(`  Queries: ${queries.length}`);
    log(`  Year Filter: ${CURRENT_YEAR}`);
    log(`  Delay: ${DELAY_MS}ms`);
    log(`  Concurrency: ${CONCURRENCY}`);
    log(`  Known macOS apps in DB: ${existingIds.size}`);
    log('═══════════════════════════════════════════════════════');

    const startTime = Date.now();
    await notify(
        `🖥️ **macOS Crawler Started${chunkLabel}**\n` +
        `▸ Queries: ${queries.length.toLocaleString()}\n` +
        `▸ Known macOS apps in DB: ${existingIds.size.toLocaleString()}`
    );

    const limit = pLimit(CONCURRENCY);

    for (let chunkStart = 0; chunkStart < queries.length; chunkStart += MACRO_BATCH_SIZE) {
        const chunkEnd = Math.min(chunkStart + MACRO_BATCH_SIZE, queries.length);
        const chunkQueries = queries.slice(chunkStart, chunkEnd);

        log(`\n▶ Starting batch ${chunkStart + 1} to ${chunkEnd} of ${queries.length}...`);

        const tasks = chunkQueries.map((term, i) =>
            limit(async () => {
                const results = await fetchApps(term);

                if (results.length === 0 && i > 0) {
                    stats.failedQueries++;
                }

                stats.totalResults += results.length;
                let queryNewCount = 0;

                for (const result of results) {
                    if (!result.trackId) continue;

                    if (seenIds.has(result.trackId)) {
                        stats.duplicatesSkipped++;
                        continue;
                    }
                    seenIds.add(result.trackId);

                    if (existingIds.has(result.trackId)) {
                        stats.alreadyInDb++;
                        continue;
                    }

                    if (!isCurrentYear(result.releaseDate)) {
                        stats.filteredByYear++;
                        continue;
                    }

                    const app = extractApp(result);
                    newApps.push(app);
                    queryNewCount++;
                    stats.newAppsFound++;
                }

                stats.completedQueries++;
                const progress = `[${stats.completedQueries}/${queries.length}]`;
                log(`${progress} "${term}" → ${results.length} results, ${queryNewCount} new`);

                if (i < chunkQueries.length - 1) {
                    await sleep(DELAY_MS);
                }
            })
        );

        await Promise.all(tasks);

        // Flush accumulated apps to DB after each macro batch so progress is
        // saved even if the job is cancelled mid-run.
        if (newApps.length > 0) {
            log(`\n💾 Flushing ${newApps.length} new apps to database...`);
            const saved = await upsertApps(newApps);
            stats.upsertedCount += saved;
            // Add flushed IDs to existingIds so subsequent batches skip them.
            for (const app of newApps) existingIds.add(app.track_id);
            newApps.length = 0;
            log(`   Saved. Running total: ${stats.upsertedCount} apps in DB.`);
        }

        if (chunkEnd < queries.length) {
            log(`\n⏳ Finished batch. Taking a ${MACRO_PAUSE_MS / 1000}s break to avoid API bans...`);
            await sleep(MACRO_PAUSE_MS);
        }
    }

    log('');
    log('All batches complete. Final flush...');
    stats.upsertedCount += await upsertApps(newApps);

    log('');
    log('═══════════════════════════════════════════════════════');
    log('  Crawl Complete — Summary');
    log('═══════════════════════════════════════════════════════');
    log(`  Queries run:        ${stats.completedQueries}/${stats.totalQueries}`);
    log(`  Total API results:  ${stats.totalResults}`);
    log(`  Duplicates (run):   ${stats.duplicatesSkipped}`);
    log(`  Already in DB:      ${stats.alreadyInDb}`);
    log(`  Filtered (year):    ${stats.filteredByYear}`);
    log(`  New apps found:     ${stats.newAppsFound}`);
    log(`  Saved to DB:        ${stats.upsertedCount}`);
    log(`  Failed queries:     ${stats.failedQueries}`);
    log('═══════════════════════════════════════════════════════');

    const durationMin = Math.round((Date.now() - startTime) / 60000);
    const status = '✅';
    await notify(
        `${status} **macOS Crawl Complete${chunkLabel}**\n` +
        `▸ New apps found:   **${stats.newAppsFound.toLocaleString()}**\n` +
        `▸ Saved to DB:      **${stats.upsertedCount.toLocaleString()}**\n` +
        `▸ Already in DB:    ${stats.alreadyInDb.toLocaleString()}\n` +
        `▸ Filtered (year):  ${stats.filteredByYear.toLocaleString()}\n` +
        `▸ Failed queries:   ${stats.failedQueries}\n` +
        `▸ Duration:         ${durationMin} min`
    );
}

// ─── Run ───────────────────────────────────────────────────────────
crawl().catch(err => {
    logError(`Fatal error: ${err.message}`);
    process.exit(1);
});
