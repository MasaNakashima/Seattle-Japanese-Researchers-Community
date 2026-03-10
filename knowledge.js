// knowledge.js

document.addEventListener('DOMContentLoaded', () => {
    const isJapanese = document.documentElement.lang === 'ja';
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    let membersData = [];
    let reportsSearchData = []; // Store parsed content from reports

    // Maintain conversation context
    let currentChatContext = { topics: [], people: [] };

    // Define the event reports to fetch
    const eventReports = [
        { path: 'events/2026-01-26.html', title: 'JSPS San Francisco Office Activity Introduction' },
        { path: 'events/2026-01-31.html', title: '2026 1st Event Report: From Micro-Evolution to Macro-Waves' }
    ];

    // Fetch and parse members data and reports
    async function initKnowledgeBase() {
        try {
            // 1. Fetch Members
            const membersResponse = await fetch(`members.csv?v=${new Date().getTime()}`, { cache: 'no-store' });
            if (!membersResponse.ok) throw new Error('Failed to load members.csv');
            const csvText = await membersResponse.text();
            membersData = parseCSV(csvText);

            // 2. Fetch and Parse Reports Dynamically
            for (const report of eventReports) {
                const fetchUrl = isJapanese ? report.path.replace('.html', '-ja.html') : report.path;
                try {
                    const htmlResponse = await fetch(fetchUrl, { cache: 'no-store' });
                    if (htmlResponse.ok) {
                        const htmlText = await htmlResponse.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(htmlText, 'text/html');

                        // Extract meaningful text blocks (paragraphs in cards or script boxes)
                        const extractElements = doc.querySelectorAll('.report-card p, .script-section-body p, .script-box pre');

                        extractElements.forEach((el) => {
                            const text = el.textContent.trim();
                            if (text.length > 30) { // Only index substantial text blocks
                                // Walk up the DOM to find the nearest section ID for linking
                                let sectionHash = '';
                                const parentSection = el.closest('section[id]');
                                if (parentSection && parentSection.id) {
                                    sectionHash = '#' + parentSection.id;
                                }

                                reportsSearchData.push({
                                    text: text,
                                    source: report.title,
                                    link: fetchUrl + sectionHash,
                                    // Pre-calculate lowercased text for faster searching later
                                    searchableText: text.toLowerCase()
                                });
                            }
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to fetch report ${fetchUrl} for search index:`, err);
                }
            }

            // Re-enable input after data is loaded
            chatInput.disabled = false;
            sendBtn.disabled = false;

        } catch (error) {
            console.error('Error loading knowledge base:', error);
            addMessage('bot', isJapanese
                ? 'データベースの読み込みに失敗しました。後でもう一度お試しください。'
                : 'Failed to load the knowledge base. Please try again later.');
        }
    }

    // Simple CSV Parser (reused logic from main.js)
    function parseCSV(csv) {
        const lines = csv.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        const members = [];

        for (let i = 1; i < lines.length; i++) {
            const row = [];
            let col = "";
            let inQuotes = false;
            const line = lines[i];

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(col.trim());
                    col = "";
                } else {
                    col += char;
                }
            }
            row.push(col.trim());

            const member = {};
            headers.forEach((header, index) => {
                member[header] = row[index] ? row[index].replace(/^"|"$/g, '').trim() : '';
            });
            members.push(member);
        }
        return members;
    }

    function addMessage(sender, text, isHtml = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = sender === 'bot' ? '🤖' : '👤';

        const content = document.createElement('div');
        content.className = 'chat-content';
        if (isHtml) {
            content.innerHTML = text;
        } else {
            content.textContent = text;
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    }

    function checkConversationalIntents(query) {
        const q = query.trim().toLowerCase();

        // 1. Greetings
        if (/^(hi\b|hello\b|hey\b|こんにちは|挨拶)/i.test(q) && q.length < 20) {
            return isJapanese
                ? "こんにちは！どのような研究トピックやメンバーについて知りたいですか？"
                : "Hello! What research topics or members would you like to explore today?";
        }

        // 2. Collaboration/Context queries
        if (q.includes('collaborate') || q.includes('these two') || q.includes('この2人') || q.includes('共同研究') || q.includes('コラボ') || q.includes('together') || q.includes('一緒')) {
            if (currentChatContext.topics.length >= 2 || currentChatContext.people.length >= 2) {
                // Determine what we're talking about (fallback to placeholders if needed)
                const itemA = currentChatContext.topics[0] || currentChatContext.people[0] || "Field A";
                const itemB = currentChatContext.topics[1] || currentChatContext.people[1] || "Field B";

                const capitalizedA = itemA.charAt(0).toUpperCase() + itemA.slice(1);
                const capitalizedB = itemB.charAt(0).toUpperCase() + itemB.slice(1);

                return isJapanese ?
                    `<div class="chat-interdisciplinary-banner">
                        <div class="banner-icon">💡</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">共同研究のアイデア</h4>
                            <p style="margin:0; font-size: 0.9rem;"><strong>${capitalizedA}</strong>と<strong>${capitalizedB}</strong>の融合についてですね！</p>
                        </div>
                    </div>
                    <p>私が提案するアプローチは「<strong>${capitalizedA}のデータ分析手法や知見を使って、${capitalizedB}の予測モデルや未解決の課題に新しい視点をもたらす</strong>」ことです。SJRCのイベント等で、ぜひこれらの専門家に声をかけてみてください！</p>`
                    :
                    `<div class="chat-interdisciplinary-banner">
                        <div class="banner-icon">💡</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">Collaboration Idea</h4>
                            <p style="margin:0; font-size: 0.9rem;">Great question about combining <strong>${capitalizedA}</strong> and <strong>${capitalizedB}</strong>!</p>
                        </div>
                    </div>
                    <p>I suggest a project involving "<strong>applying analytical techniques and knowledge from ${capitalizedA} to improve resilience and problem-solving models in ${capitalizedB}</strong>". You should reach out to the experts identified earlier to brainstorm further!</p>`;
            } else {
                return isJapanese
                    ? "どの2つの分野、あるいはどのメンバーについてお話ししていますか？文脈がありませんので、先に具体的なトピックや名前を2つ以上挙げて検索してください。"
                    : "What are the 'two' you are referring to? I don't have enough context yet. Please search for at least two specific research topics or members first.";
            }
        }

        // 3. FAQs (Joining / Contact)
        if (q.includes('join') || q.includes('participate') || q.includes('参加') || q.includes('入会')) {
            return isJapanese
                ? "SJRCへの参加にご興味をお持ちいただきありがとうございます！コミュニティへの参加やイベントの詳細については、<a href='contact.html' style='color:var(--color-primary);text-decoration:underline;'>Contact / Join usページ</a>をご覧ください。"
                : "Thank you for your interest in joining SJRC! For details on how to become a member or participate in our events, please visit our <a href='contact.html' style='color:var(--color-primary);text-decoration:underline;'>Contact / Join us page</a>.";
        }

        // 4. Chit-chat / Help
        if (q.includes('who are you') || q.includes('what are you') || q.includes('お前は誰') || q.includes('名前は') || q.includes('誰ですか') || q.includes('what is this') || (q.includes('bot') && q.includes('who'))) {
            return isJapanese
                ? "私はSJRC（Seattle Japanese Researchers' Community）の知識アシスタントボットです。メンバーの専門分野や過去のイベントレポートから、あなたにぴったりの情報を見つけ出します。"
                : "I am the SJRC Knowledge Assistant Bot. I help you find information about our members' expertise and past event reports to foster collaboration.";
        }

        if (q.includes('what can you do') || q.includes('何ができる') || q.includes('使い方') || /(^|\s)(help|ヘルプ)(\s|$)/.test(q)) {
            return isJapanese
                ? "私は以下のことができます：<br>1. <strong>メンバー検索:</strong> 「機械学習」や「生物学」などのトピックで専門家を探します<br>2. <strong>情報抽出:</strong> 過去のイベントレポートから関連情報を検索します<br>3. <strong>知識補完:</strong> コミュニティ内にない話題については、外部知識（Wikipedia等）から概要を引いてきます<br>4. <strong>コラボ提案:</strong> 2つの分野を入力すると、融合アイデアを提案します"
                : "Here is what I can do:<br>1. <strong>Find Members:</strong> Search for topics like 'machine learning' or 'biology' to find experts.<br>2. <strong>Extract Insights:</strong> Find context from past event reports.<br>3. <strong>General Knowledge:</strong> Provide summaries from external sources (like Wikipedia) if community data is unavailable.<br>4. <strong>Collaboration Ideas:</strong> Enter two different fields to get interdisciplinary ideas.";
        }

        return null;
    }

    function generateResponse(query) {
        if (!query.trim()) return;

        // 1. Add User Message
        addMessage('user', query);
        chatInput.value = '';

        // 2. Show typing indicator (optional aesthetic touch)
        const typingId = 'typing-' + Date.now();
        const typingHtml = `<div class="typing-indicator" id="${typingId}"><span></span><span></span><span></span></div>`;
        addMessage('bot', typingHtml, true);

        // 3. Process the query (Simulated delay for "thinking" effect)
        setTimeout(async () => {
            const removeTyping = () => {
                const typingElement = document.getElementById(typingId);
                if (typingElement && typingElement.parentElement.parentElement) {
                    chatMessages.removeChild(typingElement.parentElement.parentElement);
                }
            };

            // Check conversational intents first
            const intentResponse = checkConversationalIntents(query);
            if (intentResponse) {
                removeTyping();
                addMessage('bot', intentResponse, true);
                return; // End processing if it was a conversational query
            }

            const lowerQuery = query.toLowerCase();

            // --- DYNAMIC REPORT KNOWLEDGE EXTRACTION & MEMBER SEARCH ---

            // Parse for multiple keywords (split by "and", "と", "や", "&", or comma)
            const parsedParts = lowerQuery
                .split(/\s+(?:and|&)\s+|と|や|,/)
                .map(part => part.trim())
                .filter(part => part.length > 0);

            // If the user didn't use explicit conjunctions, just treat the entire query as a single topic.
            // (Splitting by space breaks names and multi-word phrases, which caused false interdisciplinary suggestions)
            let topicsToSearch = parsedParts.length > 1 ? parsedParts : [lowerQuery.trim()];

            // Find researchers and report snippets for EACH topic distinctly
            let groupedResults = {};
            let allResultsSet = new Set();
            let matchedTopics = [];

            let matchedReports = [];

            topicsToSearch.forEach(topic => {
                // Break down topic into individual words to enable partial phrase matching (e.g. "John Doe" matches "John" and "Doe")
                const topicWords = topic.split(/\s+/).filter(w => w.trim() !== '');

                // 1. Members Search
                const matchesForTopic = membersData.filter(m => {
                    const searchableText = [
                        m.name,
                        m.nameJa,
                        m.title,
                        m.titleJa,
                        m.labName,
                        m.labNameJa,
                        m.researchCategory,
                        m.researchCategoryJa,
                        m.researchTopic,
                        m.researchTopicJa
                    ].join(" ").toLowerCase();
                    // A candidate is a match if ALL words in the topic phrase appear within their searchable text
                    return topicWords.every(word => searchableText.includes(word));
                });

                if (matchesForTopic.length > 0) {
                    groupedResults[topic] = matchesForTopic;
                    matchedTopics.push(topic);
                    matchesForTopic.forEach(m => allResultsSet.add(m));
                }

                // 2. Report Snippets Search
                const reportsMatches = reportsSearchData.filter(r => r.searchableText.includes(topic));
                if (reportsMatches.length > 0) {
                    matchedReports.push(...reportsMatches);
                }
            });

            const uniqueResults = Array.from(allResultsSet);

            // Remove exact duplicates from matchedReports
            matchedReports = matchedReports.filter((v, i, a) => a.findIndex(t => (t.text === v.text)) === i);
            // Limit to top 2 to avoid spam
            matchedReports = matchedReports.slice(0, 2);

            // Format response
            if (uniqueResults.length === 0 && matchedReports.length === 0) {
                // Try external Wikipedia API as fallback for dynamic knowledge
                const wikiLang = isJapanese ? 'ja' : 'en';
                const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;

                try {
                    const searchRes = await fetch(searchUrl);
                    const searchData = await searchRes.json();

                    if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
                        const topResult = searchData.query.search[0];
                        const pageTitle = topResult.title;

                        const summaryUrl = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
                        const summaryRes = await fetch(summaryUrl);
                        const data = await summaryRes.json();

                        if (data.type === 'standard' && data.extract) {
                            removeTyping();
                            const wikiHtml = isJapanese
                                ? `<p>コミュニティ内にはこのトピックに関する情報が見つかりませんでしたが、一般的な概念として以下の情報をWikipediaから取得しました：</p>
                                   <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; margin: 10px 0; border-left: 4px solid var(--color-primary);">
                                      <h4 style="margin:0 0 8px 0;">${data.title}</h4>
                                      <p style="margin:0 0 10px 0; font-size:0.95rem; line-height: 1.5;">${data.extract}</p>
                                      <a href="${data.content_urls.desktop.page}" target="_blank" style="font-size:0.8rem; color:var(--color-primary); text-decoration:none;">📄 Wikipediaで続きを読む &rarr;</a>
                                   </div>
                                   <p style="margin-top:10px; font-size: 0.9rem;">SJRCでこの分野を新しく開拓してみませんか？専門のメンバーを追加することもできます。</p>`
                                : `<p>I couldn't find internal community updates for this topic, but here is some general context from Wikipedia:</p>
                                   <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; margin: 10px 0; border-left: 4px solid var(--color-primary);">
                                      <h4 style="margin:0 0 8px 0;">${data.title}</h4>
                                      <p style="margin:0 0 10px 0; font-size:0.95rem; line-height: 1.5;">${data.extract}</p>
                                      <a href="${data.content_urls.desktop.page}" target="_blank" style="font-size:0.8rem; color:var(--color-primary); text-decoration:none;">📄 Read more on Wikipedia &rarr;</a>
                                   </div>
                                   <p style="margin-top:10px; font-size: 0.9rem;">Perhaps you could pioneer this topic within SJRC! Let us know if we should add experts in this field.</p>`;
                            addMessage("bot", wikiHtml, true);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Wikipedia fallback failed:', e);
                }

                removeTyping();
                const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
                const noResultMsg = isJapanese
                    ? `「${query}」に関連する情報はコミュニティ内やオープンな辞書で見つかりませんでした。<br><br>💡 <strong>研究検索:</strong> <a href="${scholarUrl}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">Google Scholarで「${query}」に関する論文を探す</a>`
                    : `I couldn't find information related to "${query}" internally or in general knowledge.<br><br>💡 <strong>Academic Search:</strong> <a href="${scholarUrl}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">Search Google Scholar for "${query}"</a>`;
                addMessage("bot", noResultMsg, true);
                return;
            }

            removeTyping(); // Remove typing before showing internal results
            // UPDATE CONTEXT with successful search results (from members)
            currentChatContext.topics = matchedTopics;
            currentChatContext.people = uniqueResults.map(m => isJapanese ? (m.nameJa || m.name) : m.name);

            let responseHtml = "";

            // Render Report Highlights first if any
            if (matchedReports.length > 0) {
                responseHtml += isJapanese ?
                    `<div class="chat-interdisciplinary-banner" style="background: linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(15, 23, 42, 0) 100%); border-color: rgba(34, 211, 238, 0.4);">
                        <div class="banner-icon">📚</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">レポートからの抽出データ</h4>
                            <p style="margin:0; font-size: 0.9rem;">イベントレポートの中に「<strong>${query}</strong>」に関連する文脈が見つかりました。</p>
                        </div>
                    </div>`
                    :
                    `<div class="chat-interdisciplinary-banner" style="background: linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(15, 23, 42, 0) 100%); border-color: rgba(34, 211, 238, 0.4);">
                        <div class="banner-icon">📚</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">Context Extracted from Reports</h4>
                            <p style="margin:0; font-size: 0.9rem;">I found mentions of "<strong>${query}</strong>" in our community event reports.</p>
                        </div>
                    </div>`;

                matchedReports.forEach(report => {
                    // Highlight the query keyword in the text
                    let highlightedText = report.text;
                    topicsToSearch.forEach(t => {
                        const regex = new RegExp(`(${t})`, 'gi');
                        highlightedText = highlightedText.replace(regex, '<mark style="background: rgba(34,211,238,0.3); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>');
                    });

                    responseHtml += `
                    <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; margin: 10px 0; border-left: 4px solid var(--color-primary);">
                        <p style="margin:0 0 10px 0; font-size:0.95rem; line-height: 1.5;">"...${highlightedText}..."</p>
                        <a href="${report.link}" target="_blank" style="font-size:0.8rem; color:var(--color-primary); text-decoration:none;">📄 ${isJapanese ? 'ソース' : 'Source'}: ${report.source} &rarr;</a>
                    </div>`;
                });
            }

            // --- INTERDISCIPLINARY COLLABORATION LOGIC ---
            // If more than 1 distinct topic yielded different researchers, simulate a connection!
            if (matchedTopics.length >= 2) {
                const topicA = matchedTopics[0];
                const topicB = matchedTopics[1];

                const capitalizedA = topicA.charAt(0).toUpperCase() + topicA.slice(1);
                const capitalizedB = topicB.charAt(0).toUpperCase() + topicB.slice(1);

                responseHtml += isJapanese ?
                    `<div class="chat-interdisciplinary-banner">
                        <div class="banner-icon">✨</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">異分野融合アイデア！</h4>
                            <p style="margin:0; font-size: 0.9rem;">SJRCの理念である「<strong>異なる分野が交差するところに革新的なアイデアが生まれる</strong>」に基づき、<strong>${capitalizedA}</strong>と<strong>${capitalizedB}</strong>の融合を考えてみました。</p>
                        </div>
                    </div>
                    <p>この2つの分野を組み合わせることで、例えば「<strong>${capitalizedA}のデータ分析手法を使って、${capitalizedB}の予測モデルや課題解決に新しい視点をもたらす</strong>」といった新しい共同研究の可能性があります！</p>
                    <p>この革新的なアイデアのハブとなるかもしれない、各分野の専門家はこちらです：</p>`
                    :
                    `<div class="chat-interdisciplinary-banner">
                        <div class="banner-icon">✨</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">Interdisciplinary Idea Generated!</h4>
                            <p style="margin:0; font-size: 0.9rem;">Following SJRC's mission that "<strong>Innovative Ideas Are Born where Different Disciplines Intersect</strong>", let's explore combining <strong>${capitalizedA}</strong> and <strong>${capitalizedB}</strong>!</p>
                        </div>
                    </div>
                    <p>By bringing these fields together, a potential breakthrough could involve "<strong>applying analytical techniques from ${capitalizedA} to improve resilience and problem-solving models in ${capitalizedB}</strong>".</p>
                    <p>Here are the experts in our community who could spearhead this collaboration:</p>`;
            } else {
                // --- STANDARD SINGLE-TOPIC LOGIC ---
                responseHtml += isJapanese
                    ? `<p>「<strong>${query}</strong>」に関する情報を見つけました（${uniqueResults.length}件）：</p>`
                    : `<p>I found ${uniqueResults.length} researcher(s) associated with "<strong>${query}</strong>":</p>`;
            }

            responseHtml += `<div class="chat-results-list">`;

            let results = uniqueResults; // Need variable for iteration below
            results.forEach((m, index) => {
                const memberId = m.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                const profileLink = isJapanese ? `members_ja.html#member-${memberId}` : `members.html#member-${memberId}`;

                // If it's an interdisciplinary query, label why they are here
                let topicLabelHtml = "";
                if (matchedTopics.length >= 2) {
                    // find which topic they matched
                    const matchedFor = matchedTopics.find(t => {
                        const searchable = [m.name, m.title, m.labName, m.researchCategory, m.researchTopic].join(" ").toLowerCase();
                        return searchable.includes(t);
                    });
                    if (matchedFor) {
                        topicLabelHtml = `<span class="matched-topic-badge">${matchedFor}</span>`;
                    }
                }

                // Localized fields
                const displayName = isJapanese ? (m.nameJa || m.name) : m.name;
                const displayTitle = isJapanese ? (m.titleJa || m.title) : m.title;
                const displayLab = isJapanese ? (m.labNameJa || m.labName) : m.labName;
                const displayCategory = isJapanese ? (m.researchCategoryJa || m.researchCategory) : m.researchCategory;
                const displayTopic = isJapanese ? (m.researchTopicJa || m.researchTopic) : m.researchTopic;

                responseHtml += `
                    <div class="chat-result-card" style="animation-delay: ${index * 0.1}s">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4><a href="${profileLink}" target="_blank">${displayName}</a></h4>
                            ${topicLabelHtml}
                        </div>
                        ${displayTitle ? `<p class="chat-title">${displayTitle}</p>` : ""}
                        ${displayLab ? `<p class="chat-lab">🏛️ ${displayLab}</p>` : ""}
                        ${displayTopic ? `<p class="chat-topic">🔬 <strong>${isJapanese ? '研究トピック' : 'Topic'}:</strong> ${displayTopic}</p>` : ""}
                        ${displayCategory ? `<p class="chat-category">🏷️ <strong>${isJapanese ? 'カテゴリー' : 'Category'}:</strong> ${displayCategory}</p>` : ""}
                    </div>
                `;
            });

            responseHtml += "</div>";

            if (isJapanese) {
                responseHtml += `<p class="chat-footer-note">詳細はメンバー名をクリックしてプロフィールをご覧ください。</p>`;
            } else {
                responseHtml += `<p class="chat-footer-note">Click on a member's name to view their full profile.</p>`;
            }

            addMessage("bot", responseHtml, true);

        }, 1200); // 1200ms "thinking" time for interdisciplinary query
    }

    // Event Listeners
    sendBtn.addEventListener('click', () => {
        generateResponse(chatInput.value);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateResponse(chatInput.value);
        }
    });

    // Initialize
    chatInput.disabled = true; // wait for data to load
    sendBtn.disabled = true;
    initKnowledgeBase();
});
