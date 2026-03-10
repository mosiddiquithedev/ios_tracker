import { supabase } from './supabase.js';

// ─── Config ────────────────────────────────────────────────────────
const ITUNES_API = 'https://itunes.apple.com/search';
const LIMIT = 200;
const DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS || '300', 10);
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_SIZE = 50; // Supabase upsert batch size
const MAX_RETRIES = 3;

// ─── Query Generation ──────────────────────────────────────────────
// Common app name prefixes and words that surface niche/new apps
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

// Category-specific terms to catch niche apps
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

function generateQueries(mode = 'full') {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const digits = '0123456789'.split('');

    if (mode === 'letters') {
        return [...alphabet];
    }

    if (mode === 'quick') {
        // a-z + digits + common prefixes (~90 queries, ~30 seconds)
        return [...alphabet, ...digits, ...COMMON_PREFIXES];
    }

    if (mode === 'three') {
        // All 3-letter combos: aaa → zzz (26³ = 17,576 queries, ~88 min at 300ms)
        const combos = [];
        for (const a of alphabet) {
            for (const b of alphabet) {
                for (const c of alphabet) {
                    combos.push(a + b + c);
                }
            }
        }
        return combos;
    }

    // Full mode: a-z + aa-zz + digits + prefixes + category terms
    const queries = [...alphabet];

    // Two-letter combos
    for (const a of alphabet) {
        for (const b of alphabet) {
            queries.push(a + b);
        }
    }

    // Digits and digit combos
    queries.push(...digits);
    for (const d of digits) {
        for (const a of alphabet) {
            queries.push(d + a);
        }
    }

    // Common prefixes and category terms (deduplicated)
    const seen = new Set(queries);
    for (const term of [...COMMON_PREFIXES, ...CATEGORY_TERMS]) {
        if (!seen.has(term)) {
            queries.push(term);
            seen.add(term);
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
    if (!webhookUrl) return; // silently skip if not configured
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
    const url = `${ITUNES_API}?term=${encodeURIComponent(term)}&entity=software&limit=${LIMIT}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url);

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

// ─── Data Extraction & Filtering ───────────────────────────────────
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

    // Process in batches
    for (let i = 0; i < apps.length; i += BATCH_SIZE) {
        const batch = apps.slice(i, i + BATCH_SIZE);

        const { error } = await supabase
            .from('apps')
            .upsert(batch, {
                onConflict: 'track_id',
                ignoreDuplicates: false, // Update existing records
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
    const args = process.argv.slice(2);

    let mode = 'full';
    if (args.includes('--letters-only')) mode = 'letters';
    else if (args.includes('--quick')) mode = 'quick';
    else if (args.includes('--three-letters')) mode = 'three';

    const queries = generateQueries(mode);

    // Load existing trackIds from DB to skip known apps
    let existingIds = new Set();
    try {
        const { data } = await supabase
            .from('apps')
            .select('track_id');
        if (data) {
            existingIds = new Set(data.map(r => r.track_id));
        }
        log(`Loaded ${existingIds.size} existing app IDs from database`);
    } catch (err) {
        log('Could not preload existing IDs, proceeding without dedup cache');
    }

    const seenIds = new Set();
    const newApps = [];

    const modeLabels = {
        letters: 'Letters Only (a-z)',
        quick: 'Quick (a-z + digits + prefixes)',
        three: 'Three Letters (aaa–zzz, 17,576 queries)',
        full: 'Full Sweep (a-z + aa-zz + digits + prefixes + categories)',
    };

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

    log('═══════════════════════════════════════════════════════');
    log('  iOS App Discovery Crawler');
    log(`  Mode: ${modeLabels[mode]}`);
    log(`  Queries: ${queries.length}`);
    log(`  Year Filter: ${CURRENT_YEAR}`);
    log(`  Delay: ${DELAY_MS}ms`);
    log(`  Known apps in DB: ${existingIds.size}`);
    log('═══════════════════════════════════════════════════════');

    const startTime = Date.now();
    await notify(
        `🚀 **Crawler Started**\n` +
        `▸ Mode: ${modeLabels[mode]}\n` +
        `▸ Queries: ${queries.length.toLocaleString()}\n` +
        `▸ Known apps in DB: ${existingIds.size.toLocaleString()}`
    );

    for (let i = 0; i < queries.length; i++) {
        const term = queries[i];
        const progress = `[${i + 1}/${queries.length}]`;

        const results = await fetchApps(term);

        if (results.length === 0 && i > 0) {
            stats.failedQueries++;
        }

        stats.totalResults += results.length;

        let queryNewCount = 0;

        for (const result of results) {
            if (!result.trackId) continue;

            // Deduplicate within this run
            if (seenIds.has(result.trackId)) {
                stats.duplicatesSkipped++;
                continue;
            }
            seenIds.add(result.trackId);

            // Skip if already in database
            if (existingIds.has(result.trackId)) {
                stats.alreadyInDb++;
                continue;
            }

            // Filter by current year
            if (!isCurrentYear(result.releaseDate)) {
                stats.filteredByYear++;
                continue;
            }

            const app = extractApp(result);
            newApps.push(app);
            queryNewCount++;
            stats.newAppsFound++;
        }

        log(`${progress} "${term}" → ${results.length} results, ${queryNewCount} new apps (${CURRENT_YEAR})`);
        stats.completedQueries++;

        // Delay between requests
        if (i < queries.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    // Upsert all collected apps
    log('');
    log('Saving apps to database...');
    stats.upsertedCount = await upsertApps(newApps);

    // Summary
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
    const status = stats.failedQueries === 0 ? '✅' : '⚠️';
    await notify(
        `${status} **Crawl Complete**\n` +
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
