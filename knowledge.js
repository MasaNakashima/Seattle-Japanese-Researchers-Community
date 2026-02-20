// knowledge.js

document.addEventListener('DOMContentLoaded', () => {
    const isJapanese = document.documentElement.lang === 'ja';
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    let membersData = [];

    // Maintain conversation context
    let currentChatContext = { topics: [], people: [] };

    // Fetch and parse members data
    async function initKnowledgeBase() {
        try {
            const response = await fetch('members.csv', { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to load members.csv');
            const csvText = await response.text();
            membersData = parseCSV(csvText);

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
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!row) continue;

            const member = {};
            row.forEach((cell, index) => {
                if (index < headers.length) {
                    member[headers[index]] = cell.replace(/^"|"$/g, '').trim();
                }
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
        const q = query.toLowerCase();

        // 1. Greetings
        if (/^(hi|hello|hey|こんにちは|挨拶)/i.test(q)) {
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
        setTimeout(() => {
            const typingElement = document.getElementById(typingId);
            if (typingElement && typingElement.parentElement.parentElement) {
                chatMessages.removeChild(typingElement.parentElement.parentElement);
            }

            // Check conversational intents first
            const intentResponse = checkConversationalIntents(query);
            if (intentResponse) {
                addMessage('bot', intentResponse, true);
                return; // End processing if it was a conversational query
            }

            const lowerQuery = query.toLowerCase();

            // --- REPORT KNOWLEDGE EXTRACTION (SIMULATED RAG) ---
            const knowledgeSnippets = [
                {
                    keywords: ["tsunami", "what is tsunami", "tsunami definition", "what is a tsunami", "tsunami speed", "津波"],
                    question: "What is a Tsunami?",
                    answer: isJapanese
                        ? "津波は、主に地震によって引き起こされる、水柱全体を変位させる「長波」です。風によって発生する高波とは異なり、津波の速度は水深に依存します（c = √gh）。沿岸の浅い海域に入ると速度は低下しますが、その分エネルギーが波高に変換され、被害をもたらします。"
                        : "A Tsunami is a 'long wave' that displaces the full water column, typically generated by earthquakes. Unlike wind-generated high waves, a tsunami's speed scales with depth (calculated as c = √gh). As it enters shallow coastal waters, its speed decreases, but its energy is converted into amplified wave height.",
                    source: "2026 1st Event Report: From Micro-Evolution to Macro-Waves",
                    link: "events/2026-01-31.html#section-macro"
                },
                {
                    keywords: ["antibiotics", "why finish antibiotics", "stop antibiotics", "antimicrobial resistance", "amr", "抗生物質", "薬を飲み切る"],
                    question: "Why must we complete an antibiotic course?",
                    answer: isJapanese
                        ? "抗生物質を最後まで飲み切ることは非常に重要です。症状が改善したからといって途中でやめてしまうと、生き残った細菌が再び増殖し、再発（Relapse）のリスクが高まります。さらに、不完全な治療は薬剤耐性菌（AMR）の選択圧を高め、将来的に薬が効かなくなる原因となります。"
                        : "It is critical to finish prescribed antibiotics, even if symptoms improve. Stopping too early can leave viable bacteria that trigger a relapse. Furthermore, incomplete treatment increases the selective pressure for Antimicrobial Resistance (AMR), making future infections harder to treat.",
                    source: "2026 1st Event Report: From Micro-Evolution to Macro-Waves",
                    link: "events/2026-01-31.html#section-micro"
                },
                {
                    keywords: ["defense", "human defense", "pneumonia risk", "smoking", "免疫機制", "肺炎"],
                    question: "How does the human body defend against pneumonia?",
                    answer: isJapanese
                        ? "人体は多層的な防御システムを持っています：鼻や口の物理的バリア、喉のリンパ組織、気管支の線毛運動と粘液、そして肺胞のマクロファージです。喫煙は特に線毛のクリアランス機能を低下させるため、肺炎のリスクを著しく高めます。"
                        : "The human body has a multi-layer defense system: a physical barrier (nose/mouth), lymphoid capture tissues (tonsils), ciliary clearance in the bronchi, and alveolar macrophages deep in the lungs. Smoking significantly impairs ciliary function, thereby increasing the risk of pneumonia.",
                    source: "2026 1st Event Report: From Micro-Evolution to Macro-Waves",
                    link: "events/2026-01-31.html#section-micro"
                },
                {
                    keywords: ["緑膿菌", "pseudomonas", "pseudomonas aeruginosa"],
                    question: "What is Pseudomonas aeruginosa (緑膿菌)?",
                    answer: isJapanese
                        ? "緑膿菌（Pseudomonas aeruginosa）は環境中に広く存在する細菌です。健康な人には弱毒性ですが、免疫力が低下した患者には重篤な感染症を引き起こします。多くの抗生物質が効きにくく、バイオフィルムを形成するため治療が困難です。慢性感染の過程で、攻撃的な「野生株」から持続性の高い「適応株」へと進化します。"
                        : "Pseudomonas aeruginosa is a bacterium widely present in the environment. While low-virulence in healthy individuals, it can be life-threatening to vulnerable patients. It is intrinsically difficult to treat due to antibiotic resistance and its ability to form biofilms. During chronic infections, it evolves from an aggressive 'wild-type' to a highly persistent 'adapted-type'.",
                    source: "2026 1st Event Report: From Micro-Evolution to Macro-Waves",
                    link: "events/2026-01-31.html#section-micro"
                }
            ];

            // Check if query matches any knowledge snippet
            const matchedSnippet = knowledgeSnippets.find(snippet =>
                snippet.keywords.some(kw => lowerQuery.includes(kw))
            );

            if (matchedSnippet) {
                const snippetHtml = isJapanese ?
                    `<div class="chat-interdisciplinary-banner" style="background: linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(15, 23, 42, 0) 100%); border-color: rgba(34, 211, 238, 0.4);">
                        <div class="banner-icon">📚</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">レポートからの抽出データ</h4>
                            <p style="margin:0; font-size: 0.9rem;"><strong>「${matchedSnippet.question}」</strong>に関する回答が見つかりました。</p>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; margin: 10px 0; border-left: 4px solid var(--color-primary);">
                        <p style="margin:0 0 10px 0; font-size:0.95rem; line-height: 1.5;">${matchedSnippet.answer}</p>
                        <a href="${matchedSnippet.link}" target="_blank" style="font-size:0.8rem; color:var(--color-primary); text-decoration:none;">📄 ソース: ${matchedSnippet.source} &rarr;</a>
                    </div>`
                    :
                    `<div class="chat-interdisciplinary-banner" style="background: linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(15, 23, 42, 0) 100%); border-color: rgba(34, 211, 238, 0.4);">
                        <div class="banner-icon">📚</div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--color-primary);">Knowledge Extraction</h4>
                            <p style="margin:0; font-size: 0.9rem;">I found an answer to <strong>"${matchedSnippet.question}"</strong> in our community reports.</p>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; margin: 10px 0; border-left: 4px solid var(--color-primary);">
                        <p style="margin:0 0 10px 0; font-size:0.95rem; line-height: 1.5;">${matchedSnippet.answer}</p>
                        <a href="${matchedSnippet.link}" target="_blank" style="font-size:0.8rem; color:var(--color-primary); text-decoration:none;">📄 Source: ${matchedSnippet.source} &rarr;</a>
                    </div>`;

                addMessage('bot', snippetHtml, true);
                return; // Stop processing, we found a direct answer!
            }

            // --- END REPORT KNOWLEDGE EXTRACTION ---

            // Parse for multiple keywords (split by "and", "と", "や", "&", or comma)
            const parsedParts = lowerQuery
                .split(/\s+(?:and|&)\s+|と|や|,/)
                .map(part => part.trim())
                .filter(part => part.length > 0);

            // If the user didn't use explicit conjunctions, try splitting by space if it's multiple distinct words
            // that don't match exactly.
            let topicsToSearch = parsedParts.length > 1 ? parsedParts : lowerQuery.split(/\s+/).filter(p => p.length > 2);

            // Fallback: If space splitting didn't yield multiple, just use the whole string as one topic.
            if (topicsToSearch.length <= 1) {
                topicsToSearch = [lowerQuery];
            }

            // Find researchers for EACH topic distinctly
            let groupedResults = {};
            let allResultsSet = new Set();
            let matchedTopics = [];

            topicsToSearch.forEach(topic => {
                const matchesForTopic = membersData.filter(m => {
                    const searchableText = [
                        m.name,
                        m.title,
                        m.labName,
                        m.researchCategory,
                        m.researchTopic
                    ].join(" ").toLowerCase();
                    return searchableText.includes(topic);
                });

                if (matchesForTopic.length > 0) {
                    groupedResults[topic] = matchesForTopic;
                    matchedTopics.push(topic);
                    matchesForTopic.forEach(m => allResultsSet.add(m));
                }
            });

            const uniqueResults = Array.from(allResultsSet);

            // Format response
            if (uniqueResults.length === 0) {
                const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
                const noResultMsg = isJapanese
                    ? `「${query}」に直接関連するメンバーやトピックはコミュニティ内に見つかりませんでした。<br><br>💡 <strong>外部検索:</strong> <a href="${searchUrl}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">Google Scholarで「${query}」に関する論文を検索する</a>`
                    : `I couldn't find any community members or topics directly related to "${query}".<br><br>💡 <strong>Web Search:</strong> <a href="${searchUrl}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">Search Google Scholar for papers on "${query}"</a>`;
                addMessage("bot", noResultMsg, true);
                return;
            }

            // UPDATE CONTEXT with successful search results
            currentChatContext.topics = matchedTopics;
            currentChatContext.people = uniqueResults.map(m => m.name);

            let responseHtml = "";

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

                responseHtml += `
                    <div class="chat-result-card" style="animation-delay: ${index * 0.1}s">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4><a href="${profileLink}" target="_blank">${m.name}</a></h4>
                            ${topicLabelHtml}
                        </div>
                        ${m.title ? `<p class="chat-title">${m.title}</p>` : ""}
                        ${m.labName ? `<p class="chat-lab">🏛️ ${m.labName}</p>` : ""}
                        ${m.researchTopic ? `<p class="chat-topic">🔬 <strong>Topic:</strong> ${m.researchTopic}</p>` : ""}
                        ${m.researchCategory ? `<p class="chat-category">🏷️ <strong>Category:</strong> ${m.researchCategory}</p>` : ""}
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
