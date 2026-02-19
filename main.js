console.log("Seattle Japanese Researchers' Community website loaded.");

// ==========================================
// CONFIGURATION & DATA
// ==========================================
const locationCoords = {
    "UW Seattle (Main)": [47.6553, -122.3035],
    "UW South Lake Union": [47.6256, -122.3391],
    "Fred Hutchinson Cancer Center": [47.6247, -122.3301],
    "Allen Institute": [47.6189, -122.3340],
    "Seattle Children's Research Institute": [47.6166, -122.3353],
    "NOAA Western Regional Center": [47.6816683, -122.2583716]
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
        const response = await fetch('members.csv', { cache: 'no-store' });
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
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    const members = [];

    for (let i = 1; i < lines.length; i++) {
        // Regex to handle quoted fields correctly
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row) continue;

        const member = {};
        // Clean quotes and map to headers
        row.forEach((cell, index) => {
            if (index < headers.length) {
                // Remove surrounding quotes if present
                let value = cell.replace(/^"|"$/g, '').trim();
                member[headers[index]] = value;
            }
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
        if (currentSort === 'name-asc') return a.name.localeCompare(b.name, isJapanese ? 'ja' : 'en');
        if (currentSort === 'name-desc') return b.name.localeCompare(a.name, isJapanese ? 'ja' : 'en');
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
                const obfuscatedEmail = email.replace('@', '▲');

                modalBody.innerHTML = `
                    <h3 class="modal-title">${name}</h3>
                    <div class="anti-spam-box">
                        <p>スパム防止のため、@を▲で表示しております。<br>
                        メールアドレスの▲部分を@に変更してご連絡差し上げてください。<br>
                        <small>To prevent spam, the @ symbol is displayed as ▲. Please replace the ▲ in the email address with @ to contact us.</small></p>
                        <div class="obfuscated-email">${obfuscatedEmail}</div>
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

function applyFilters() {
    const searchInput = document.getElementById('member-search');
    const term = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = allMembers.filter(member => {
        // Multi-tag filter (Intersection: must match ALL active tags)
        const matchesTags = activeTags.every(tag => {
            const inCategories = member.researchCategory && member.researchCategory.includes(tag);
            const inTitle = member.title && member.title.includes(tag);
            return inCategories || inTitle;
        });

        // Search term filter
        const matchesSearch = !term || (
            (member.name && member.name.toLowerCase().includes(term)) ||
            (member.researchTopic && member.researchTopic.toLowerCase().includes(term)) ||
            (member.labName && member.labName.toLowerCase().includes(term)) ||
            (member.researchCategory && member.researchCategory.toLowerCase().includes(term)) ||
            (member.title && member.title.toLowerCase().includes(term))
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

function renderTagCloud() {
    const tagCloud = document.getElementById('tag-cloud');
    if (!tagCloud) return;

    // Extract all unique tags
    const tagsSet = new Set();
    allMembers.forEach(member => {
        if (member.researchCategory) {
            member.researchCategory.split('/').map(c => c.trim()).filter(c => c !== '').forEach(tag => tagsSet.add(tag));
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
        if (member.title) {
            titlesSet.add(member.title.trim());
        }
    });

    const uniqueTitles = Array.from(titlesSet).sort();
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
        // Add ID for deep linking (lowercase name, spaces to hyphens)
        const memberId = member.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        card.id = `member-${memberId}`;

        // Split categories into tags
        let tagsHtml = '';
        if (member.researchCategory) {
            const categories = member.researchCategory.split('/').map(c => c.trim()).filter(c => c !== '');
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

        card.innerHTML = `
            <div class="member-header">
                <h3 class="member-name">${member.name}</h3>
            </div>
            ${tagsHtml}
            <div class="member-role clickable ${activeTags.includes(member.title) ? 'active' : ''}" onclick="toggleTag('${(member.title || '').replace(/'/g, "\\'")}')">${member.title || ''}</div>
            
            <div class="member-info">
                ${member.labName ? `
                <div class="info-row">
                    <span class="icon">🏛️</span>
                    <span><strong>${member.labName}</strong><br><small>${member.labLocation || ''}</small>
                    ${member.address ? `<br><small class="address-text">${member.address}</small>` : ''}</span>
                </div>` : ''}
                
                ${member.researchTopic ? `
                <div class="info-row">
                    <span class="icon">🔬</span>
                    <span>${member.researchTopic}</span>
                </div>` : ''}
            </div>

            <div class="member-actions">
                <div class="member-links">
                    ${linksHtml}
                </div>
                <div class="action-icons">
                    ${member.labWebsite ? `<a href="${member.labWebsite}" target="_blank" class="icon-link" title="${isJapanese ? 'ラボのウェブサイト' : 'Lab Website'}">🌐</a>` : ''}
                    ${member.email ? `<a href="javascript:void(0)" class="icon-link show-email-modal" data-member-name="${member.name}" data-member-email="${member.email}" title="${isJapanese ? 'メールを表示' : 'Show Email'}">✉️</a>` : ''}
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
                                        <span class="member-popup-name">${m.name}</span>
                                    </a>
                                    <span class="member-popup-role">${m.title || ''}</span>
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

// Initialize
if (membersGrid) {
    fetchMembers().then(() => {
        handleDeepLink();
    });
}

// Handle hash changes for internal navigation
window.addEventListener('hashchange', handleDeepLink);

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
