// AutoTimegist — site interactions (Pit Lane design)
// Mobile nav, sticky header shading, ticker duplication, tab filtering,
// newsletter feedback, FAQ accordion, TOC scroll-spy, back-to-top,
// share buttons, and site search.

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initHeaderShadow();
    initTicker();
    initTabFilter();
    initNewsletter();
    initFaqAccordion();
    initTocScrollSpy();
    initBackToTop();
    initShareButtons();
    initSearch();
});

/* ---------- Sharing ---------- */

function shareTargets() {
    const url = encodeURIComponent(window.location.href);
    const rawTitle = document.querySelector('meta[property="og:title"]')?.content
        || document.title.replace(/\s*\|\s*AutoTimegist\s*$/, '');
    const title = encodeURIComponent(rawTitle);
    return {
        x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        whatsapp: `https://api.whatsapp.com/send?text=${title}%20${url}`,
        email: `mailto:?subject=${title}&body=${url}`
    };
}

function flashLabel(el, message) {
    const original = el.getAttribute('aria-label');
    el.setAttribute('aria-label', message);
    el.classList.add('is-copied');
    setTimeout(() => {
        el.setAttribute('aria-label', original);
        el.classList.remove('is-copied');
    }, 1600);
}

function copyCurrentUrl(trigger) {
    const done = () => flashLabel(trigger, 'Link copied');
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(window.location.href).then(done).catch(() => fallbackCopy(done));
    } else {
        fallbackCopy(done);
    }
}

function fallbackCopy(done) {
    const field = document.createElement('textarea');
    field.value = window.location.href;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(field);
    done();
}

function openShareWindow(href) {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=520');
}

// Resolves which platform a control refers to, from its aria-label or data attribute.
function shareKeyFor(el) {
    const hint = (el.dataset.share || el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
    if (hint.includes('copy') || hint.includes('link')) return 'copy';
    if (hint.includes('x') && !hint.includes('email')) return 'x';
    if (hint.includes('twitter')) return 'x';
    if (hint.includes('facebook')) return 'facebook';
    if (hint.includes('linkedin')) return 'linkedin';
    if (hint.includes('whatsapp')) return 'whatsapp';
    if (hint.includes('mail')) return 'email';
    return null;
}

function initShareButtons() {
    const controls = document.querySelectorAll('.share-rail .icon-btn, [data-share]');
    if (!controls.length) return;

    controls.forEach((el) => {
        const key = shareKeyFor(el);
        if (!key) return;

        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (key === 'copy') {
                copyCurrentUrl(el);
                return;
            }
            openShareWindow(shareTargets()[key]);
        });
    });
}

/* ---------- Search ---------- */

function initSearch() {
    // Any control labelled Search opens the overlay, not just the header icon —
    // the 404 page uses a full-width button.
    const triggers = document.querySelectorAll('[aria-label="Search"], [data-search-open]');
    if (!triggers.length) return;

    const overlay = buildSearchOverlay();
    const input = overlay.querySelector('.search-input');
    const results = overlay.querySelector('.search-results');

    const open = () => {
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        input.value = '';
        renderSearchResults([], results, '');
        setTimeout(() => input.focus(), 40);
    };
    const close = () => {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    };

    triggers.forEach((t) => t.addEventListener('click', open));
    overlay.querySelector('.search-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    input.addEventListener('input', () => {
        const q = input.value.trim();
        renderSearchResults(searchIndex(q), results, q);
    });
}

function buildSearchOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
        <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search articles">
            <div class="search-bar">
                <i class="fas fa-magnifying-glass"></i>
                <input type="search" class="search-input" placeholder="Search reviews, news, guides..." autocomplete="off">
                <button class="search-close" aria-label="Close search"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="search-results"></div>
        </div>`;
    document.body.appendChild(overlay);
    return overlay;
}

// Scores each entry: title matches outrank description matches, and a run of
// consecutive terms scores higher than the same words scattered.
function searchIndex(query) {
    const data = window.AT_SEARCH_INDEX || [];
    if (!query || query.length < 2) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = [];

    data.forEach((item) => {
        const title = (item.t || '').toLowerCase();
        const desc = (item.d || '').toLowerCase();
        const cat = (item.c || '').toLowerCase();
        let score = 0;
        let matchedAll = true;

        terms.forEach((term) => {
            if (title.startsWith(term)) score += 60;
            else if (title.includes(term)) score += 40;
            else if (cat.includes(term)) score += 12;
            else if (desc.includes(term)) score += 8;
            else matchedAll = false;
        });

        if (!matchedAll) return;
        if (title.includes(query.toLowerCase())) score += 50;
        scored.push({ item, score });
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 12).map((s) => s.item);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const terms = query.trim().split(/\s+/).filter((t) => t.length > 1)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!terms.length) return safe;
    return safe.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark>$1</mark>');
}

function renderSearchResults(items, container, query) {
    if (!query) {
        container.innerHTML = '<p class="search-hint">Start typing to search across every review, comparison, guide and news story.</p>';
        return;
    }
    if (!items.length) {
        container.innerHTML = `<p class="search-hint">No matches for <strong>${escapeHtml(query)}</strong>. Try a model name, a brand, or a topic like "charging".</p>`;
        return;
    }
    container.innerHTML = items.map((item) => `
        <a class="search-hit" href="${escapeHtml(item.u)}">
            <span class="search-hit-cat">${escapeHtml(item.c)}</span>
            <span class="search-hit-title">${highlight(item.t, query)}</span>
        </a>`).join('');
}

function initMobileNav() {
    const toggle = document.querySelector('.mobile-toggle');
    const nav = document.querySelector('.mobile-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.querySelector('i').className = open ? 'fas fa-xmark' : 'fas fa-bars';
    });
}

function initHeaderShadow() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}

function initTicker() {
    const track = document.querySelector('.ticker-track');
    if (!track) return;
    // Duplicate the content once so the CSS keyframe (-50%) loops seamlessly
    // regardless of how many headlines were authored in the markup.
    track.innerHTML += track.innerHTML;
}

function initTabFilter() {
    const tabs = document.querySelectorAll('.tab[data-filter]');
    if (!tabs.length) return;

    const cards = document.querySelectorAll('[data-category]');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('is-active'));
            tab.classList.add('is-active');

            const filter = tab.dataset.filter;
            cards.forEach((card) => {
                const match = filter === 'all' || card.dataset.category === filter;
                card.style.display = match ? '' : 'none';
            });
        });
    });
}

function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    const note = form.parentElement.querySelector('.newsletter-note');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]').value.trim();
        if (!note) return;

        note.textContent = email
            ? `You're in — confirmation on its way to ${email}.`
            : 'Enter an email address to subscribe.';
        if (email) form.reset();
    });
}

function initFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
        const question = item.querySelector('.faq-q');
        const answer = item.querySelector('.faq-a');
        if (!question || !answer) return;

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');

            items.forEach((other) => {
                other.classList.remove('is-open');
                other.querySelector('.faq-a').style.maxHeight = null;
            });

            if (!isOpen) {
                item.classList.add('is-open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}

function initTocScrollSpy() {
    const links = document.querySelectorAll('.toc a[href^="#"]');
    if (!links.length) return;

    const targets = Array.from(links)
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    if (!targets.length) return;

    const setActive = (id) => {
        links.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

    targets.forEach((target) => observer.observe(target));
}

function initBackToTop() {
    const btn = document.querySelector('.to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
