console.log("Seattle Japanese Researchers' Community website loaded.");

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
let allMembers = []; // Store fetched members

// fetch and parse CSV
async function fetchMembers() {
    try {
        const response = await fetch('members.csv');
        if (!response.ok) throw new Error('Failed to load members.csv');
        const csvText = await response.text();
        allMembers = parseCSV(csvText);

        if (membersGrid) {
            renderMembers(allMembers);
            updateMemberCount(allMembers.length);
            setupSearch();
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

        // Process links specifically
        member.links = [];
        if (member.link1_label && member.link1_url) {
            member.links.push({ label: member.link1_label, url: member.link1_url });
        }
        if (member.link2_label && member.link2_url) {
            member.links.push({ label: member.link2_label, url: member.link2_url });
        }

        members.push(member);
    }
    return members;
}

function updateMemberCount(count) {
    if (memberCountDisplay) {
        if (isJapanese) {
            memberCountDisplay.textContent = count + " (サンプル) / 303 (合計)";
        } else {
            memberCountDisplay.textContent = count + " (Mock Data) / 303 Total";
        }
    }
}

function setupSearch() {
    const searchInput = document.getElementById('member-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allMembers.filter(member =>
                (member.name && member.name.toLowerCase().includes(term)) ||
                (member.researchTopic && member.researchTopic.toLowerCase().includes(term)) ||
                (member.labName && member.labName.toLowerCase().includes(term)) ||
                (member.researchCategory && member.researchCategory.toLowerCase().includes(term))
            );
            renderMembers(filtered);
        });
    }
}

function renderMembers(list) {
    if (!membersGrid) return;

    membersGrid.innerHTML = '';

    if (list.length === 0) {
        membersGrid.innerHTML = isJapanese
            ? '<p class="no-results">条件に一致する研究者は見つかりませんでした。</p>'
            : '<p class="no-results">No researchers found matching your search.</p>';
        return;
    }

    list.forEach(member => {
        const card = document.createElement('article');
        card.className = 'member-card';

        let linksHtml = '';
        if (member.links && member.links.length > 0) {
            linksHtml = member.links.map(link =>
                `<a href="${link.url}" target="_blank" class="member-link">${link.label}</a>`
            ).join('');
        }

        card.innerHTML = `
            <div class="member-header">
                <h3 class="member-name">${member.name}</h3>
                <span class="member-category">${member.researchCategory || ''}</span>
            </div>
            <div class="member-role">${member.title || ''}</div>
            
            <div class="member-info">
                ${member.labName ? `
                <div class="info-row">
                    <span class="icon">🏛️</span>
                    <span><strong>${member.labName}</strong><br><small>${member.labLocation || ''}</small></span>
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
                    ${member.email ? `<a href="mailto:${member.email}" class="icon-link" title="${isJapanese ? 'メール' : 'Email'}">✉️</a>` : ''}
                </div>
            </div>
        `;
        membersGrid.appendChild(card);
    });
}

// Initialize
if (membersGrid) {
    fetchMembers();
}
