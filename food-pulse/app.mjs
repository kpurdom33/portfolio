import {
    STATES, PERIODS, PRESETS, REFRESH_INTERVAL_MS, parseSettings, validateTerms,
    buildShareQuery, buildExploreUrl, buildEmbedUrl, shouldAutoRefresh,
} from './core.mjs';

const byId = id => document.getElementById(id);
const form = byId('filters');
const stateSelect = byId('geography');
const periodSelect = byId('period');
const presetSelect = byId('preset');
const termsInput = byId('terms');
const autoCheckbox = byId('auto-refresh');
const refreshButton = byId('refresh-now');
const shareButton = byId('share-view');
let settings = parseSettings(window.location.search);
let lastRequestedAt = null;

function fillSelect(select, options) {
    select.replaceChildren(...options.map(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        return option;
    }));
}

fillSelect(stateSelect, STATES.map(state => [state.code, state.name]));
fillSelect(periodSelect, Object.entries(PERIODS));

function syncForm() {
    stateSelect.value = settings.geo;
    periodSelect.value = settings.period;
    termsInput.value = settings.terms.join(', ');
    autoCheckbox.checked = settings.autoRefresh;
    presetSelect.value = Object.keys(PRESETS).find(key =>
        PRESETS[key].terms.join(',') === settings.terms.join(',')) ?? 'custom';
    termsInput.removeAttribute('aria-invalid');
    byId('terms-error').hidden = true;
}

function shareUrl() {
    const url = new URL(window.location.href);
    url.search = buildShareQuery(settings);
    url.hash = '';
    return url.href;
}

function saveView() {
    window.history.replaceState(null, '', shareUrl());
    byId('share-url').value = shareUrl();
    byId('share-status').textContent = '';
    byId('share-fallback').hidden = true;
}

function updateLabels() {
    const place = STATES.find(state => state.code === settings.geo).name;
    byId('scope-label').textContent = place;
    byId('period-label').textContent = PERIODS[settings.period];
    byId('term-count').textContent = `${settings.terms.length} search terms`;
    byId('timeline-place').textContent = settings.geo === 'US' ? 'the United States' : place;
    byId('timeline-eyebrow').textContent = `A closer look · ${place}`;
    byId('query-list').replaceChildren(...settings.terms.map(term => {
        const item = document.createElement('li');
        item.textContent = term;
        return item;
    }));
    byId('map-source').href = buildExploreUrl(settings, 'US');
    byId('timeline-source').href = buildExploreUrl(settings);
}

function replaceChart(hostId, kind, geo, title) {
    const frame = document.createElement('iframe');
    frame.title = title;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = buildEmbedUrl(kind, settings, geo);
    // Cross-origin load events do not prove that Google returned chart data.
    // Keep request time separate from data freshness; never invent a success flag.
    byId(hostId).replaceChildren(frame);
}

function requestCharts() {
    if (!navigator.onLine) {
        for (const id of ['map-host', 'timeline-host']) {
            const message = document.createElement('p');
            message.className = 'chart-placeholder';
            message.textContent = 'You are offline. Reconnect to load this comparison.';
            byId(id).replaceChildren(message);
        }
        byId('request-status').textContent = 'You are offline. Charts will be requested when you reconnect.';
        updateRefreshStatus();
        return;
    }
    const place = STATES.find(state => state.code === settings.geo).name;
    replaceChart('map-host', 'GEO_MAP', 'US', `Google Trends: selected food search terms by U.S. state, ${PERIODS[settings.period]}`);
    replaceChart('timeline-host', 'TIMESERIES', settings.geo, `Google Trends: food search interest over time in ${place}, ${PERIODS[settings.period]}`);
    lastRequestedAt = Date.now();
    const time = new Date(lastRequestedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
    byId('request-status').textContent = `Charts requested at ${time}.`;
    updateRefreshStatus();
}

function chartFocused() {
    return document.activeElement?.tagName === 'IFRAME';
}

function updateRefreshStatus() {
    const now = Date.now();
    refreshButton.disabled = !navigator.onLine || (lastRequestedAt !== null && now - lastRequestedAt < 10000);
    let text;
    if (!navigator.onLine) text = 'Offline · automatic requests paused.';
    else if (!settings.autoRefresh) text = 'Auto-refresh is off. Refresh charts whenever you want.';
    else if (document.hidden) text = 'Paused while this tab is in the background.';
    else if (chartFocused()) text = 'Paused while you interact with a chart.';
    else if (lastRequestedAt === null) text = 'Waiting to request charts.';
    else {
        const seconds = Math.max(0, Math.ceil((REFRESH_INTERVAL_MS - (now - lastRequestedAt)) / 1000));
        text = `Next chart request in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.`;
    }
    byId('refresh-countdown').textContent = text;
}

function tick() {
    if ((lastRequestedAt === null && !document.hidden && navigator.onLine)
        || shouldAutoRefresh({
            enabled: settings.autoRefresh, visible: !document.hidden, online: navigator.onLine,
            interacting: chartFocused(), lastRequestedAt, now: Date.now(),
        })) {
        requestCharts();
    } else updateRefreshStatus();
}

form.addEventListener('submit', event => {
    event.preventDefault();
    const result = validateTerms(termsInput.value);
    if (!result.valid) {
        byId('terms-error').textContent = result.error;
        byId('terms-error').hidden = false;
        termsInput.setAttribute('aria-invalid', 'true');
        termsInput.focus();
        return;
    }
    settings = {...settings, geo: stateSelect.value, period: periodSelect.value, terms: result.terms};
    syncForm();
    updateLabels();
    saveView();
    lastRequestedAt = null;
    requestCharts();
});

presetSelect.addEventListener('change', () => {
    if (Object.hasOwn(PRESETS, presetSelect.value)) {
        termsInput.value = PRESETS[presetSelect.value].terms.join(', ');
    }
});
termsInput.addEventListener('input', () => { presetSelect.value = 'custom'; });
autoCheckbox.addEventListener('change', () => {
    settings.autoRefresh = autoCheckbox.checked;
    saveView();
    tick();
});
refreshButton.addEventListener('click', requestCharts);

shareButton.addEventListener('click', async () => {
    const url = shareUrl();
    try {
        await navigator.clipboard.writeText(url);
        byId('share-status').textContent = 'View link copied. It includes your foods, state, and time window.';
    } catch {
        byId('share-fallback').hidden = false;
        byId('share-url').value = url;
        byId('share-url').focus();
        byId('share-url').select();
        byId('share-status').textContent = 'Automatic copying is unavailable. Copy the selected link below.';
    }
});

window.addEventListener('popstate', () => {
    settings = parseSettings(window.location.search);
    syncForm();
    updateLabels();
    lastRequestedAt = null;
    requestCharts();
});
window.addEventListener('online', tick);
window.addEventListener('offline', updateRefreshStatus);
document.addEventListener('visibilitychange', tick);

syncForm();
updateLabels();
saveView();
if (!document.hidden) requestCharts();
window.setInterval(tick, 1000);
