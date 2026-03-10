---
description: How to post a new event report on the website
---

To post a new event report on the SJRC website, follow these steps:

### 1. Create the Report HTML Files
Create two new files in the `events/` directory, one for English and one for Japanese.
*   **Path**: `events/YYYY-MM-DD.html` (English)
*   **Path**: `events/YYYY-MM-DD-ja.html` (Japanese)

> [!TIP]
> Use [events/2026-01-31.html](file:///Users/masa/.gemini/antigravity/scratch/seattle-researchers-community/events/2026-01-31.html) as a template. It uses a modern Glassmorphism design with interactive script boxes.

### 2. Update the Reports Listing Pages
Add a new `<article class="report-card">` to the top of the `.reports-grid` in both listing pages.

#### English Page: [reports.html](file:///Users/masa/.gemini/antigravity/scratch/seattle-researchers-community/reports.html)
Add this block inside the `<div class="reports-grid">`:
```html
<article class="report-card">
    <div class="report-meta recent">Latest Report</div>
    <h3>Event Title</h3>
    <div class="report-date">Month DD, YYYY</div>
    <p>Short summary of the event and presenters...</p>
    <a href="events/YYYY-MM-DD.html" class="read-more">Read Full Report</a>
</article>
```
*Note: Remember to remove the `Latest Report` tag from the previous entry.*

#### Japanese Page: [reports_ja.html](file:///Users/masa/.gemini/antigravity/scratch/seattle-researchers-community/reports_ja.html)
Add the Japanese version inside the `<div class="reports-grid">`:
```html
<article class="report-card">
    <div class="report-meta recent">最新レポート</div>
    <h3>イベントタイトル</h3>
    <div class="report-date">YYYY年MM月DD日開催</div>
    <p>イベントの簡単な概要と登壇者の紹介...</p>
    <a href="events/YYYY-MM-DD-ja.html" class="read-more">レポート詳細を読む</a>
</article>
```

### 3. Register for Chatbot Analysis (Optional)
To make the new report searchable via the AI Assistant on the Knowledge page, update the `eventReports` array in [knowledge.js](file:///Users/masa/.gemini/antigravity/scratch/seattle-researchers-community/knowledge.js):

```javascript
const eventReports = [
    { path: 'events/YYYY-MM-DD.html', title: 'New Event Title' }, // Add this line
    { path: 'events/2026-01-31.html', title: '2026 1st Event Report: From Micro-Evolution to Macro-Waves' }
];
```

### 4. Deploy the Changes
Run the following command in your terminal to publish the update:
```bash
npx firebase deploy
```
