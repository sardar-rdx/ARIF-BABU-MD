/**
 * RDX BOT — GLOW Style Engine
 * ------------------------------------------------------------------
 * Ek hi jagah se har command ka output style control hota hai.
 * Rendered look:
 *
 *   ┏━[ ⚡ P I N G ]━━━━━━━━━━━━━━━━━━━┓
 *   ┃ ⏱  Ping      : 12 ms             ┃
 *   ┃ ⏳  Uptime    : 2h 14m            ┃
 *   ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 *   ┃ ✦  Powered by RDX BOT             ┃
 *   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

const settings = require('../settings');

const DEFAULT_WIDTH = 34;

/* ------------------------------------------------------------------ *
 * Width calculation (emoji / CJK aware so boxes stay aligned)
 * ------------------------------------------------------------------ */

const ZERO_WIDTH = /[\u200B-\u200F\u2028\u2029\uFE00-\uFE0F]/;
const EMOJI_CLUSTER =
  /^(?:\p{RI}\p{RI}|\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/u;

function isRegional(cp) {
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

function isWideCodePoint(cp) {
    return (
        (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
        (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals
        (cp >= 0x3041 && cp <= 0x33ff) || // Kana / CJK compat
        (cp >= 0x3400 && cp <= 0x4dbf) || // CJK ext A
        (cp >= 0x4e00 && cp <= 0x9fff) || // CJK unified
        (cp >= 0xa000 && cp <= 0xa4cf) ||
        (cp >= 0xa960 && cp <= 0xa97f) ||
        (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul syllables
        (cp >= 0xf900 && cp <= 0xfaff) ||
        (cp >= 0xfe10 && cp <= 0xfe19) ||
        (cp >= 0xfe30 && cp <= 0xfe6f) ||
        (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth forms
        (cp >= 0xffe0 && cp <= 0xffe6) ||
        (cp >= 0x1f300 && cp <= 0x1f64f) ||
        (cp >= 0x1f680 && cp <= 0x1f6ff) ||
        (cp >= 0x1f900 && cp <= 0x1f9ff) ||
        (cp >= 0x1fa70 && cp <= 0x1faff) ||
        (cp >= 0x20000 && cp <= 0x3fffd)
    );
}

/** Display width of a string (emoji = 2, combining/VS = 0, rest = 1). */
function width(str) {
    if (str === null || str === undefined) return 0;
    const s = String(str);
    let w = 0;
    let i = 0;

    while (i < s.length) {
        const rest = s.slice(i);
        const m = rest.match(EMOJI_CLUSTER);

        if (m) {
            const cluster = m[0];
            const cp = cluster.codePointAt(0);
            if (isRegional(cp)) w += 2;
            else if (cluster.includes('\uFE0F')) w += 2;
            else if (/\p{Emoji_Presentation}/u.test(cluster)) w += 2;
            else w += 1;
            i += cluster.length;
            continue;
        }

        const cp = s.codePointAt(i);
        const ch = String.fromCodePoint(cp);
        i += ch.length;

        if (ZERO_WIDTH.test(ch)) continue;
        if (cp === 0x200d) continue;
        if (isWideCodePoint(cp)) {
            w += 2;
            continue;
        }
        w += 1;
    }
    return w;
}

/** Pad a string on the right up to `target` display columns. */
function pad(str, target) {
    const s = str === null || str === undefined ? '' : String(str);
    const diff = target - width(s);
    return diff > 0 ? s + ' '.repeat(diff) : s;
}

/** Word-wrap a line so it never exceeds `max` display columns. */
function wrapText(str, max) {
    const s = str === null || str === undefined ? '' : String(str);
    if (width(s) <= max) return [s];

    const words = s.split(/\s+/).filter(Boolean);
    if (!words.length) return [s];

    const out = [];
    let cur = '';
    for (const word of words) {
        if (!cur) {
            cur = word;
        } else if (width(cur) + 1 + width(word) <= max) {
            cur += ' ' + word;
        } else {
            out.push(cur);
            cur = word;
        }
        while (width(cur) > max) {
            out.push(cur.slice(0, max));
            cur = cur.slice(max);
        }
    }
    if (cur) out.push(cur);
    return out;
}

/* ------------------------------------------------------------------ *
 * Core renderer
 * ------------------------------------------------------------------ */

const ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    usage: '📖',
    restricted: '🔒',
    loading: '⏳',
    menu: '📖',
    tip: '💡',
};

/**
 * Build the rows of a panel body.
 * fields : [{ icon, label, value }]
 * lines  : [ 'raw line' ]   (may contain \n)
 * bullets: [ 'item' ]
 */
function buildRows(opts) {
    const rows = [];
    const max = opts.maxLine || 42;

    const fields = opts.fields || [];
    if (fields.length) {
        const labelW = Math.max(...fields.map((f) => width(f.label || '')));
        for (const f of fields) {
            const ic = f.icon ? `${f.icon}  ` : '   ';
            const lab = f.label ? pad(f.label, labelW) : '';
            const val = f.value === null || f.value === undefined ? '' : ` : ${f.value}`;
            rows.push(`${ic}${lab}${val}`);
        }
    }

    for (const l of opts.lines || []) {
        for (const part of String(l).split('\n')) {
            for (const w of wrapText(part, max)) rows.push(w);
        }
    }

    for (const b of opts.bullets || []) {
        for (const part of String(b).split('\n')) {
            const wrapped = wrapText(part, max - 3);
            wrapped.forEach((w, i) => rows.push(i === 0 ? `  ▸ ${w}` : `    ${w}`));
        }
    }

    return rows;
}

/**
 * Main panel renderer.
 *
 * panel({
 *   title, icon, width,
 *   fields:  [{ icon, label, value }],
 *   lines:   ['text'],
 *   bullets: ['text'],
 *   groups:  [{ name, icon, items: [] }],   // menu style
 *   footer:  'Powered by RDX BOT',
 *   footerIcon: '✦',
 *   signature: 'optional text under the box'
 * })
 */
function panel(opts = {}) {
    const o = {
        title: opts.title || '',
        icon: opts.icon || '',
        width: opts.width || DEFAULT_WIDTH,
        maxLine: opts.maxLine || 42,
        fields: opts.fields || [],
        lines: opts.lines || [],
        bullets: opts.bullets || [],
        groups: opts.groups || [],
        footer: opts.footer || null,
        footerIcon: opts.footerIcon || '✦',
        signature: opts.signature || null,
    };

    const rows = buildRows(o);

    if (o.groups.length) {
        if (rows.length) rows.push('');
        o.groups.forEach((g, gi) => {
            if (gi > 0) rows.push('');
            const gHead = g.icon ? `${g.icon}  ${g.name}` : g.name;
            rows.push(gHead);
            for (const item of g.items || []) {
                for (const part of String(item).split('\n')) {
                    const wrapped = wrapText(part, o.maxLine - 4);
                    wrapped.forEach((w, i) => rows.push(i === 0 ? `   ▸ ${w}` : `     ${w}`));
                }
            }
        });
    }

    // --- measure -----------------------------------------------------
    const headText = o.icon ? `${o.icon} ${o.title}` : o.title;
    let inner = Math.max(o.width, width(headText) + 6);
    for (const r of rows) inner = Math.max(inner, width(r) + 2);
    if (o.footer) inner = Math.max(inner, width(o.footer) + width(o.footerIcon) + 4);

    const out = [];

    // header
    const headFill = Math.max(3, inner - width(headText) - 5);
    out.push(`┏━[ ${headText} ]${'━'.repeat(headFill)}┓`);

    // body
    for (const r of rows) out.push(`┃ ${pad(r, inner - 1)}┃`);

    // footer
    if (o.footer) {
        out.push(`┣${'━'.repeat(inner)}┫`);
        const f = `${o.footerIcon}  ${o.footer}`;
        out.push(`┃ ${pad(f, inner - 1)}┃`);
    }

    // bottom
    out.push(`┗${'━'.repeat(inner)}┛`);

    if (o.signature) out.push(`   ${o.signature}`);

    return out.join('\n');
}

/* ------------------------------------------------------------------ *
 * Status helpers
 * ------------------------------------------------------------------ */

function statusPanel(kind, title, body, extra = {}) {
    const icon = extra.icon || ICONS[kind] || 'ℹ️';
    const opts = {
        title: title,
        icon,
        fields: extra.fields,
        lines: body ? [body] : [],
        bullets: extra.bullets,
        groups: extra.groups,
        footer: extra.footer,
        footerIcon: extra.footerIcon,
        width: extra.width,
        signature: extra.signature,
    };
    return panel(opts);
}

const success = (title, body, extra = {}) => statusPanel('success', title || 'SUCCESS', body, extra);
const error = (title, body, extra = {}) => statusPanel('error', title || 'ERROR', body, extra);
const warning = (title, body, extra = {}) => statusPanel('warning', title || 'WARNING', body, extra);
const info = (title, body, extra = {}) => statusPanel('info', title || 'INFO', body, extra);
const usage = (title, body, extra = {}) => statusPanel('usage', title || 'USAGE', body, extra);
const restricted = (title, body, extra = {}) => statusPanel('restricted', title || 'RESTRICTED', body, extra);

/** Usage panel with a command hint line. */
function usagePanel(cmd, hint, extra = {}) {
    const rows = [];
    if (hint) rows.push(hint);
    if (cmd) rows.push(`Example: ${cmd}`);
    return panel({
        title: extra.title || 'USAGE',
        icon: extra.icon || ICONS.usage,
        lines: rows,
        footer: extra.footer,
        width: extra.width,
    });
}

/** Multi section command menu (used by help / menu). */
function menu(opts = {}) {
    return panel({
        title: opts.title || 'COMMAND MENU',
        icon: opts.icon || ICONS.menu,
        groups: opts.groups || [],
        footer: opts.footer,
        footerIcon: opts.footerIcon,
        width: opts.width,
        signature: opts.signature,
    });
}

/** Footer credit used by the original panels ("Powered by ..."). */
const credit = (text) => text || `Powered by ${settings.botName}`;

module.exports = {
    panel,
    menu,
    success,
    error,
    warning,
    info,
    usage,
    usagePanel,
    restricted,
    credit,
    width,
    pad,
    ICONS,
};
