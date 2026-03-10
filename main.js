console.log("Seattle Japanese Researchers' Community website loaded.");

// ==========================================
// CONFIGURATION & DATA
// ==========================================
const locationCoords = {
    "UW Seattle (Main)": [47.6553, -122.3035],
    "University of Washington": [47.6553, -122.3035],
    "UW South Lake Union": [47.6256, -122.3391],
    "University of Washington, South Lake Union": [47.6256, -122.3391],
    "Fred Hutchinson Cancer Center": [47.6247, -122.3301],
    "Fred Hutch": [47.6247, -122.3301],
    "Allen Institute": [47.6189, -122.3340],
    "Seattle Children's Research Institute": [47.6166, -122.3353],
    "NOAA Western Regional Center": [47.6816683, -122.2583716],
    "Redmond": [47.7035201, -122.1538974],
    "Webrain Think Tank": [47.6740591, -122.2645295],
    "Seattle Children’s Hospital / University of Washington School of Medicine": [47.6625, -122.2811],
    "Department of Rehabilitation Medicine, University of Washington": [47.6040479, -122.3241759]
};

let allMembers = [];
let map = null;

// ==========================================
// GLOBAL HEADER NAV (MOBILE HAMBURGER)
// ==========================================
function setupMobileNav() {
    const header = document.querySelector('.header');
    if (!header) return;

    const toggleBtn = header.querySelector('.nav-toggle');
    const nav = header.querySelector('.nav');
    if (!toggleBtn || !nav) return;

    function setMenuState(open) {
        header.classList.toggle('nav-open', open);
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function closeMenu() {
        setMenuState(false);
    }

    toggleBtn.addEventListener('click', () => {
        const isOpen = header.classList.contains('nav-open');
        setMenuState(!isOpen);
    });

    nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) closeMenu();
        });
    });

    document.addEventListener('click', (event) => {
        if (!header.contains(event.target)) closeMenu();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) closeMenu();
    });
}

setupMobileNav();

// ==========================================
// CANVAS ANIMATION (Connecting Nodes)
// ==========================================
const canvas = document.getElementById('hero-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const particleCount = 50;

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.5)'; // Primary color
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connections
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================
// MEMBER DIRECTORY LOGIC (CSV BASED)
// ==========================================

const membersGrid = document.getElementById('members-grid');
const memberCountDisplay = document.getElementById('member-count-display');
const isJapanese = document.documentElement.lang === 'ja';
// fetch and parse CSV
async function fetchMembers() {
    try {
        const response = await fetch(`members.csv?v=${new Date().getTime()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load members.csv');
        const csvText = await response.text();
        allMembers = parseCSV(csvText);

        if (membersGrid) {
            setupSearch();
            renderTagCloud();
            renderTitleCloud();
            setupEmailModal();

            // Handle URL search parameters for deep-linking
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('search');
            if (searchQuery) {
                const searchInput = document.getElementById('member-search');
                if (searchInput) {
                    searchInput.value = searchQuery;
                }
            }

            applyFilters();
            initMap(allMembers);
        }
    } catch (error) {
        console.error('Error loading members:', error);
        if (membersGrid) {
            membersGrid.innerHTML = `<p class="no-results">Error loading member data. Please try again later.</p>`;
        }
    }
}

// Simple CSV Parser (handles quotes)
function parseCSV(csv) {
    function parseCSVLine(line) {
        const cells = [];
        let col = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const next = line[i + 1];

            if (char === '"') {
                // Escaped quote inside a quoted field ("")
                if (inQuotes && next === '"') {
                    col += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                cells.push(col.trim());
                col = "";
            } else {
                col += char;
            }
        }
        cells.push(col.trim());
        return cells;
    }

    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const members = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);

        const member = {};
        headers.forEach((header, index) => {
            let value = row[index] ? row[index].replace(/^"|"$/g, '').trim() : '';
            member[header] = value;
        });

        // Process links dynamically
        member.links = [];
        let linkIdx = 1;
        while (member[`link${linkIdx}_label`] || member[`link${linkIdx}_url`]) {
            const label = member[`link${linkIdx}_label`];
            const url = member[`link${linkIdx}_url`];
            if (label && url) {
                member.links.push({ label, url });
            }
            linkIdx++;
        }

        members.push(member);
    }
    return members;
}

// State Management
let activeTags = [];
let currentSort = 'name-asc';

function toggleTag(tag) {
    if (!tag) return;
    const index = activeTags.indexOf(tag);
    if (index > -1) {
        activeTags.splice(index, 1);
    } else {
        activeTags.push(tag);
    }
    applyFilters();
}

window.toggleTag = toggleTag; // Make it global for onclick handlers

function updateMemberCount(count) {
    if (memberCountDisplay) {
        if (isJapanese) {
            memberCountDisplay.textContent = count + " (表示中)";
        } else {
            memberCountDisplay.textContent = count + " (Showing)";
        }
    }
}

function sortMembers(list) {
    return [...list].sort((a, b) => {
        if (currentSort === 'name-asc') return (isJapanese ? (a.nameJa || a.name) : a.name).localeCompare((isJapanese ? (b.nameJa || b.name) : b.name), isJapanese ? 'ja' : 'en');
        if (currentSort === 'name-desc') return (isJapanese ? (b.nameJa || b.name) : b.name).localeCompare((isJapanese ? (a.nameJa || a.name) : a.name), isJapanese ? 'ja' : 'en');
        if (currentSort === 'lab-asc') {
            const labA = a.labLocation || '';
            const labB = b.labLocation || '';
            return labA.localeCompare(labB);
        }
        return 0;
    });
}

// Email Modal Initialization
function setupEmailModal() {
    const modal = document.getElementById('email-modal');
    const modalBody = document.getElementById('modal-body-content');
    const closeBtn = document.querySelector('.close-modal');
    if (!modal || !modalBody) return;

    // Use delegation on the members grid to handle clicks on email icons
    if (membersGrid) {
        membersGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.show-email-modal');
            if (btn) {
                const name = btn.getAttribute('data-member-name');
                const email = btn.getAttribute('data-member-email');
                const obfuscatedEmail = email.replace('@', '<span class="email-triangle">▲</span>');

                modalBody.innerHTML = `
                    <h3 class="modal-title">${name}</h3>
                    <div class="anti-spam-box">
                        <p class="modal-instruction">スパム防止のため、@を▲で表示しております。<br>
                        メールアドレスの▲部分を@に変更してご連絡差し上げてください。<br>
                        <small>To prevent spam, the @ symbol is displayed as ▲. Please replace the ▲ in the email address with @ to contact us.</small></p>
                        <div class="email-copy-container">
                            <div class="obfuscated-email" id="modal-obfuscated-email">${obfuscatedEmail}</div>
                            <button class="copy-email-btn-refined" onclick="copyObfuscatedEmail()">
                                <span class="copy-icon">📋</span> ${isJapanese ? 'コピー' : 'Copy'}
                            </button>
                        </div>
                    </div>
                    
                    <div class="template-section">
                        <p>また、「シアトル日本人研究者の会のページを見て連絡をした」旨を伝えていただけると、連絡先とスムーズに連絡が取れるかもしれません。<br>
                        <small>Also, mentioning that you saw the Seattle Japanese Researchers' Community page may help us connect with you more smoothly.</small></p>
                        
                        <p>必要であればこちらをご利用ください。<br>
                        <small>Please use this if necessary.</small></p>
                        
                        <div class="template-box">シアトル日本人研究者の会のページを見て連絡を差し上げております。\n\nI am contacting you after seeing the Seattle Japanese Researchers' Community page.</div>
                        <p class="copy-hint">${isJapanese ? '上記をコピーしてメール本文にご使用ください' : 'Copy and paste the text above into your email.'}</p>
                    </div>
                `;
                modal.style.display = "block";
            }
        });
    }

    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = "none";
    }

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
}

// Global function to copy email
window.copyObfuscatedEmail = function () {
    const emailDiv = document.getElementById('modal-obfuscated-email');
    if (!emailDiv) return;

    const text = emailDiv.textContent.trim();
    const btn = document.querySelector('.copy-email-btn-refined');
    const isJapanese = document.documentElement.lang === 'ja';

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span>✅</span> ${isJapanese ? 'コピー完了' : 'Copied!'}`;
        btn.classList.add('copy-success');

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('copy-success');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
};


function applyFilters() {
    const searchInput = document.getElementById('member-search');
    const term = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = allMembers.filter(member => {
        // Multi-tag filter (Intersection: must match ALL active tags)
        const matchesTags = activeTags.every(tag => {
            const inCategories = [member.researchCategory, member.researchCategoryJa]
                .some(value => value && value.includes(tag));
            const inTitle = [member.title, member.titleJa]
                .some(value => value && value.includes(tag));
            const inTitleCategory = getTitleTagCategories(member).includes(tag);
            return inCategories || inTitle || inTitleCategory;
        });

        // Search term filter
        const matchesSearch = !term || (
            (member.name && member.name.toLowerCase().includes(term)) ||
            (member.nameJa && member.nameJa.toLowerCase().includes(term)) ||
            (member.researchTopic && member.researchTopic.toLowerCase().includes(term)) ||
            (member.researchTopicJa && member.researchTopicJa.toLowerCase().includes(term)) ||
            (member.labName && member.labName.toLowerCase().includes(term)) ||
            (member.labNameJa && member.labNameJa.toLowerCase().includes(term)) ||
            (member.researchCategory && member.researchCategory.toLowerCase().includes(term)) ||
            (member.researchCategoryJa && member.researchCategoryJa.toLowerCase().includes(term)) ||
            (member.title && member.title.toLowerCase().includes(term)) ||
            (member.titleJa && member.titleJa.toLowerCase().includes(term))
        );

        return matchesTags && matchesSearch;
    });

    // Update active tag UI
    const container = document.getElementById('active-tag-container');
    const tagList = document.getElementById('active-tag-list');
    if (container && tagList) {
        if (activeTags.length > 0) {
            tagList.innerHTML = activeTags.map(tag =>
                `<span class="member-tag active clickable" onclick="toggleTag('${tag.replace(/'/g, "\\'")}')">${tag} <span>&times;</span></span>`
            ).join('');
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
    }

    // Update highlighting in clouds
    document.querySelectorAll('.tag-cloud .member-tag').forEach(tagEl => {
        if (activeTags.includes(tagEl.textContent.trim())) {
            tagEl.classList.add('active');
        } else {
            tagEl.classList.remove('active');
        }
    });

    // Apply Sorting
    const sorted = sortMembers(filtered);
    renderMembers(sorted);
    updateMemberCount(sorted.length);
}

function splitCategoryTags(categoryField) {
    if (!categoryField) return [];
    return categoryField
        .split(/[\/,、]/)
        .map(part => part.trim())
        .filter(part => part !== '');
}

const TITLE_TAG_DEFINITIONS = [
    {
        en: 'Faculty',
        ja: '教員',
        matches: (titleEn, titleJa) =>
            /(assistant professor|associate professor|professor)/.test(titleEn) ||
            /(助教|准教授|教授|講師)/.test(titleJa)
    },
    {
        en: 'Postdoc',
        ja: 'ポスドク',
        matches: (titleEn, titleJa) =>
            /(postdoc|post-doc|postdoctoral)/.test(titleEn) ||
            /(ポスドク|博士研究員)/.test(titleJa)
    },
    {
        en: 'Clinician',
        ja: '臨床・医療',
        matches: (titleEn, titleJa) =>
            /(physician|clinical)/.test(titleEn) ||
            /(医師|臨床)/.test(titleJa)
    },
    {
        en: 'Researcher',
        ja: '研究職',
        matches: (titleEn, titleJa) =>
            /(research|scientist|engineer)/.test(titleEn) ||
            /(研究員|研究者|エンジニア)/.test(titleJa)
    },
    {
        en: 'Industry / Founder',
        ja: '企業・起業',
        matches: (titleEn, titleJa) =>
            /(founder|co-founder|co founder|startup|industry)/.test(titleEn) ||
            /(起業|創業|企業)/.test(titleJa)
    }
];

const EXTRA_PROFESSIONAL_TAGS_BY_MEMBER = {
    "Ryo Nakahara": {
        en: ["Physical Therapist (PT)"],
        ja: ["理学療法士 (PT)"]
    }
};

function getTitleTagCategories(member) {
    const titleEn = (member.title || '').toLowerCase();
    const titleJa = (member.titleJa || '');

    const tags = TITLE_TAG_DEFINITIONS
        .filter(def => def.matches(titleEn, titleJa))
        .map(def => (isJapanese ? def.ja : def.en));

    const extra = EXTRA_PROFESSIONAL_TAGS_BY_MEMBER[member.name];
    if (extra) {
        (isJapanese ? extra.ja : extra.en).forEach(tag => tags.push(tag));
    }

    if (tags.length > 0) {
        return [...new Set(tags)];
    }

    const fallback = isJapanese ? (member.titleJa || member.title) : member.title;
    return fallback ? [fallback.trim()] : [];
}

function renderTagCloud() {
    const tagCloud = document.getElementById('tag-cloud');
    if (!tagCloud) return;

    // Extract all unique tags
    const tagsSet = new Set();
    allMembers.forEach(member => {
        const catField = isJapanese ? (member.researchCategoryJa || member.researchCategory) : member.researchCategory;
        if (catField) {
            splitCategoryTags(catField).forEach(tag => tagsSet.add(tag));
        }
    });

    const uniqueTags = Array.from(tagsSet).sort();
    tagCloud.innerHTML = uniqueTags.map(tag =>
        `<span class="member-tag clickable" onclick="toggleTag('${tag.replace(/'/g, "\\'")}')">${tag}</span>`
    ).join('');
}

function renderTitleCloud() {
    const titleCloud = document.getElementById('title-cloud');
    if (!titleCloud) return;

    const titlesSet = new Set();
    allMembers.forEach(member => {
        getTitleTagCategories(member).forEach(tag => titlesSet.add(tag));
    });

    const sortOrder = TITLE_TAG_DEFINITIONS.map(def => (isJapanese ? def.ja : def.en));
    const uniqueTitles = Array.from(titlesSet).sort((a, b) => {
        const ai = sortOrder.indexOf(a);
        const bi = sortOrder.indexOf(b);
        if (ai !== -1 || bi !== -1) {
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        }
        return a.localeCompare(b, isJapanese ? 'ja' : 'en');
    });
    titleCloud.innerHTML = uniqueTitles.map(title =>
        `<span class="member-tag clickable" onclick="toggleTag('${title.replace(/'/g, "\\'")}')">${title}</span>`
    ).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('member-search');
    const sortSelect = document.getElementById('member-sort');
    const clearTagBtn = document.getElementById('clear-tag-filter');

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFilters();
        });
    }

    if (clearTagBtn) {
        clearTagBtn.addEventListener('click', () => {
            activeTags = []; // Clear all active tags
            const container = document.getElementById('active-tag-container');
            if (container) container.style.display = 'none';
            applyFilters();
        });
    }
}

function renderMembers(membersList) {
    if (!membersGrid) return;

    membersGrid.innerHTML = '';

    if (membersList.length === 0) {
        membersGrid.innerHTML = isJapanese
            ? '<p class="no-results">条件に一致する研究者は見つかりませんでした。</p>'
            : '<p class="no-results">No researchers found matching your search.</p>';
        return;
    }

    membersList.forEach(member => {
        const card = document.createElement('article');
        card.className = 'member-card';
        // Add ID for deep linking (ALWAYS use English name for stable IDs)
        const memberId = member.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        card.id = `member-${memberId}`;

        // Localized fields
        const displayName = isJapanese ? (member.nameJa || member.name) : member.name;
        const displayTitle = isJapanese ? (member.titleJa || member.title) : member.title;
        const displayLab = isJapanese ? (member.labNameJa || member.labName) : member.labName;
        const displayCategory = isJapanese ? (member.researchCategoryJa || member.researchCategory) : member.researchCategory;
        const displayTopic = isJapanese ? (member.researchTopicJa || member.researchTopic) : member.researchTopic;
        const normalizedLab = (displayLab || '').trim().toLowerCase().replace(/\./g, '');
        const isPlaceholderLab = ['n/a', 'na', 'none', 'なし', '該当なし'].includes(normalizedLab);
        const primaryAffiliation = isPlaceholderLab ? (member.labLocation || '') : (displayLab || member.labLocation || '');
        const secondaryAffiliation = isPlaceholderLab ? '' : ((displayLab && member.labLocation) ? member.labLocation : '');

        // Split categories into tags
        let tagsHtml = '';
        if (displayCategory) {
            const categories = splitCategoryTags(displayCategory);
            tagsHtml = `
                <div class="member-tags-container">
                    ${categories.map(cat => `<span class="member-tag clickable ${activeTags.includes(cat) ? 'active' : ''}" onclick="toggleTag('${cat.replace(/'/g, "\\'")}')">${cat}</span>`).join('')}
                </div>
            `;
        }

        let linksHtml = '';
        if (member.links && member.links.length > 0) {
            linksHtml = member.links.map(link =>
                `<a href="${link.url}" target="_blank" class="member-link">${link.label}</a>`
            ).join('');
        }

        // Status Badge Logic
        const displaySeattleStatus = isJapanese ? (member.seattleStatusJa || member.seattleStatus) : member.seattleStatus;
        const isComing = member.seattleStatus && member.seattleStatus.toLowerCase().includes('coming');

        card.innerHTML = `
            <div class="member-header">
                <h3 class="member-name">${displayName}</h3>
                ${displaySeattleStatus ? `<span class="seattle-status-badge ${isComing ? 'status-coming' : ''}">${displaySeattleStatus}</span>` : ''}
            </div>
            ${tagsHtml}
            <div class="member-role clickable ${activeTags.includes(displayTitle) ? 'active' : ''}" onclick="toggleTag('${(displayTitle || '').replace(/'/g, "\\'")}')">${displayTitle || ''}</div>
            
            <div class="member-info">
                ${(primaryAffiliation || secondaryAffiliation) ? `
                <div class="info-row">
                    <span class="icon">🏛️</span>
                    <span><strong>${primaryAffiliation}</strong>${secondaryAffiliation ? `<br><small>${secondaryAffiliation}</small>` : ''}
                    ${member.address ? `<br><small class="address-text">${member.address}</small>` : ''}</span>
                </div>` : ''}
                
                ${displayTopic ? `
                <div class="info-row">
                    <span class="icon">🔬</span>
                    <span>${displayTopic}</span>
                </div>` : ''}
            </div>

            <div class="member-actions">
                <div class="member-links">
                    ${linksHtml}
                </div>
                <div class="action-icons">
                    ${member.labWebsite ? `<a href="${member.labWebsite}" target="_blank" class="icon-link" title="${isJapanese ? 'ラボのウェブサイト' : 'Lab Website'}">🌐</a>` : ''}
                    ${member.email ? `<a href="javascript:void(0)" class="icon-link show-email-modal" data-member-name="${displayName}" data-member-email="${member.email}" title="${isJapanese ? 'メールを表示' : 'Show Email'}">✉️</a>` : ''}
                </div>
            </div>
        `;
        membersGrid.appendChild(card);
    });
}

// ==========================================
// INTERACTIVE MAP
// ==========================================
function initMap(members) {
    const mapElement = document.getElementById('map');
    if (!mapElement || typeof L === 'undefined') return;

    // Initialize map if not already done
    if (!map) {
        map = L.map('map', {
            scrollWheelZoom: false
        }).setView([47.625, -122.33], 12);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);
    }

    // Clear existing markers (if any)
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Group members by labLocation
    const locationGroups = {};
    members.forEach(m => {
        const loc = m.labLocation || "Unknown";
        if (!locationGroups[loc]) locationGroups[loc] = [];
        locationGroups[loc].push(m);
    });

    // Add markers
    Object.keys(locationGroups).forEach(locName => {
        const coords = locationCoords[locName];
        if (coords) {
            const locMembers = locationGroups[locName];
            const popupContent = `
                <div class="map-popup">
                    <span class="popup-location-name">${locName}</span>
                    <div class="member-popup-list">
                        ${locMembers.map(m => {
                const memberId = m.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                const linkUrl = isJapanese ? `members_ja.html#member-${memberId}` : `members.html#member-${memberId}`;
                return `
                                <div class="member-popup-item">
                                    <a href="${linkUrl}" class="member-popup-link">
                                        <span class="member-popup-name">${isJapanese ? (m.nameJa || m.name) : m.name}</span>
                                    </a>
                                    <span class="member-popup-role">${(isJapanese ? (m.titleJa || m.title) : m.title) || ''}</span>
                                    ${m.address ? `<div style="font-size:0.7rem; opacity:0.7;">${m.address}</div>` : ''}
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;

            L.marker(coords).addTo(map)
                .bindPopup(popupContent);
        }
    });
}

// Deep linking logic: scroll to member if hash is present
function handleDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#member-')) {
        const targetId = hash.substring(1);
        const element = document.getElementById(targetId);
        if (element) {
            // Wait a bit for layout
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-card');
                setTimeout(() => {
                    element.classList.remove('highlight-card');
                }, 3000);
            }, 500);
        }
    }
}

// ==========================================
// REPORT DIRECTORY SEARCH & FILTERING
// ==========================================
function setupReportSearch() {
    const reportGrid = document.getElementById('reports-grid');
    const searchInput = document.getElementById('report-search');
    const tagCloud = document.getElementById('report-tag-cloud');
    if (!reportGrid || !searchInput || !tagCloud) return;

    const reportCards = Array.from(reportGrid.querySelectorAll('.report-card'));
    let activeReportTags = [];

    // Extract unique tags from data-tags attributes
    const tagsSet = new Set();
    reportCards.forEach(card => {
        const tags = card.getAttribute('data-tags');
        if (tags) {
            tags.split(',').forEach(t => tagsSet.add(t.trim()));
        }
    });

    // Render Tag Cloud
    const uniqueTags = Array.from(tagsSet).sort();
    tagCloud.innerHTML = uniqueTags.map(tag =>
        `<span class="member-tag clickable" data-tag="${tag}">${tag}</span>`
    ).join('');

    function applyReportFilters() {
        const term = searchInput.value.toLowerCase();

        reportCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const text = card.querySelector('p').textContent.toLowerCase();
            const tagsAttr = card.getAttribute('data-tags') || '';
            const cardTags = tagsAttr.split(',').map(t => t.trim());

            const matchesSearch = !term || title.includes(term) || text.includes(term) || tagsAttr.toLowerCase().includes(term);
            const matchesTags = activeReportTags.length === 0 || activeReportTags.every(tag => cardTags.includes(tag));

            if (matchesSearch && matchesTags) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', applyReportFilters);

    tagCloud.addEventListener('click', (e) => {
        const tagEl = e.target.closest('.member-tag');
        if (!tagEl) return;

        const tag = tagEl.getAttribute('data-tag');
        const index = activeReportTags.indexOf(tag);

        if (index > -1) {
            activeReportTags.splice(index, 1);
            tagEl.classList.remove('active');
        } else {
            activeReportTags.push(tag);
            tagEl.classList.add('active');
        }

        applyReportFilters();
    });
}

// Initialize
if (membersGrid) {
    fetchMembers().then(() => {
        handleDeepLink();
    });
}

const reportsGrid = document.getElementById('reports-grid');
if (reportsGrid) {
    setupReportSearch();
}

// Handle hash changes for internal navigation
window.addEventListener('hashchange', handleDeepLink);

// Fetch dynamic stats (e.g. Facebook member count)
async function fetchStats() {
    try {
        const response = await fetch(`stats.json?v=${new Date().getTime()}`, { cache: 'no-store' });
        if (response.ok) {
            const stats = await response.json();
            if (stats.memberCount) {
                // Update the stat number on the home page if it exists
                const statEls = document.querySelectorAll('.stat-number');
                statEls.forEach(el => {
                    // Only update if it currently says the hardcoded 303 (or similar) to avoid overwriting other potential stats
                    if (el.textContent.includes('303') || el.parentElement.textContent.includes('Active Members')) {
                        el.textContent = stats.memberCount;
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Could not load dynamic stats, using fallback defaults.', e);
    }
}
fetchStats();

// If on home page, fetch members for the map also
const homeMap = document.getElementById('map');
if (homeMap && !membersGrid) {
    fetch('members.csv', { cache: 'no-store' })
        .then(res => res.text())
        .then(csvText => {
            const members = parseCSV(csvText);
            initMap(members);
        });
}
