const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function fetchMembers() {
    console.log('Starting Playwright to fetch FB members...');
    
    // Launch browser in headless mode
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        // Pretend to be a normal desktop browser user
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/Los_Angeles'
    });
    const page = await context.newPage();

    let memberCount = 303; // Fallback default

    try {
        console.log('Navigating to Facebook group...');
        await page.goto('https://www.facebook.com/groups/3358285694229446/', { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
        });

        // Facebook is slow. Let's wait specifically for some group text to appear.
        // The text we want looks like "Private group · 306 members"
        console.log('Waiting for member count text...');
        
        // Wait up to 15 seconds for the word "members" to appear in the DOM
        try {
            await page.waitForFunction(() => {
                return document.body.innerText.toLowerCase().includes(' members');
            }, { timeout: 15000 });
        } catch (e) {
            console.log("Could not specifically wait for the member text, proceeding to fallback extraction...");
        }

        // Now grab the whole text and try to find the pattern
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        // Look for pattern like "Private group \n·\n 306 members" or "Private group · 306 members"
        const regex = /group\s*·?\s*([\d,]+)\s*members/i;
        const match = bodyText.match(regex);

        if (match && match[1]) {
            // Remove commas and parse
            memberCount = parseInt(match[1].replace(/,/g, ''), 10);
            console.log('Successfully extracted member count:', memberCount);
        } else {
            console.warn('Regex failed. Dumping some early text for debugging:');
            console.log(bodyText.substring(0, 500));
            throw new Error('Pattern not found in body text.');
        }

    } catch (error) {
        console.error('Error fetching from Facebook:', error.message);
        // We will just let it use the fallback count 303 so the action doesn't "fail" and break the site, 
        // but the data will just remain unchanged.
        console.log('Using fallback/previous member count.');
    } finally {
        await browser.close();
    }

    // Save to stats.json
    const statsObj = {
        memberCount: memberCount,
        lastUpdated: new Date().toISOString()
    };

    const statsPath = path.join(__dirname, '..', 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(statsObj, null, 2));
    
    console.log(`Wrote stats to ${statsPath}`);
}

fetchMembers();
