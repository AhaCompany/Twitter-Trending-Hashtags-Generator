const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors()); // To allow cross-origin requests from Vue.js front-end

// Default configuration
const defaultConfig = {
    "TWEET_MAX_CHARS": 280, // Default
    "ENGLISH_ONLY": true, // Boolean true or false
    "TIMEOUT_PAGE_LOAD": 3000,
    "TIMEOUT_COOKIE_CONSENT": 1000,
    "TIMEOUT_TAB_CLICK": 1000
};

// Function to filter English trending topics
const filterEnglishTrends = (trends) => {
    return trends.filter(trend => {
        const trendText = trend.topic;
        // Only include trends with alphanumeric characters, spaces, or hashtags
        return /^[a-zA-Z0-9#\s]+$/.test(trendText);
    });
};

// Function to create hashtags within a character limit
const createHashtags = (trends, maxChars = 280) => {
    // Sort trends by their popularity ('count') in descending order
    const sortedTrends = trends.sort((a, b) => parseInt(b.count) - parseInt(a.count));

    let hashtags = [];
    let totalChars = 0;

    for (let trend of sortedTrends) {
        const trendText = trend.topic;
        // Convert topic to a hashtag (keep letters, numbers, underscores, and Unicode letters)
        // const cleanTrend = trendText.replace(/[^a-zA-Z0-9_#]/g, '');
        const cleanTrend = trendText.replace(/\s+/g, '').replace(/[^\w\u4e00-\u9fff\u0600-\u06ff#]/g, '');
        const hashtag = trendText.startsWith('#') ? cleanTrend : '#' + cleanTrend;
        const hashtagLength = hashtag.length;

        if (totalChars + hashtagLength <= maxChars) {
            hashtags.push(hashtag);
            totalChars += hashtagLength + 1; // Add 1 for space between hashtags
        } else {
            break;
        }
    }

    return hashtags.join(' ');
};

// Function to generate hashtags based on the table data
const generateHashtags = (trendingTopics, ENGLISH_ONLY, TWEET_MAX_CHARS) => {
    let filteredTrends = trendingTopics;

    if (ENGLISH_ONLY) {
        filteredTrends = filterEnglishTrends(trendingTopics);
    }

    const hashtags = createHashtags(filteredTrends, TWEET_MAX_CHARS);
    return hashtags;
};

app.get('/api/generate-hashtags', async (req, res) => {
    // Get parameters from query or use default values
    const config = {
        TWEET_MAX_CHARS: req.query.TWEET_MAX_CHARS || defaultConfig.TWEET_MAX_CHARS,
        ENGLISH_ONLY: req.query.ENGLISH_ONLY === 'true' ? true : defaultConfig.ENGLISH_ONLY,
        TIMEOUT_PAGE_LOAD: req.query.TIMEOUT_PAGE_LOAD || defaultConfig.TIMEOUT_PAGE_LOAD,
        TIMEOUT_COOKIE_CONSENT: req.query.TIMEOUT_COOKIE_CONSENT || defaultConfig.TIMEOUT_COOKIE_CONSENT,
        TIMEOUT_TAB_CLICK: req.query.TIMEOUT_TAB_CLICK || defaultConfig.TIMEOUT_TAB_CLICK
    };

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
  
    try {
        // Navigate to the target website
        await page.goto('https://trends24.in/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");

        // Handle cookie consent
        const cookieConsentSelector = '.fc-button.fc-cta-consent.fc-primary-button'
        await page.waitForSelector(cookieConsentSelector, { timeout: config.TIMEOUT_PAGE_LOAD });
        await page.click(cookieConsentSelector);
        console.log("Cookie consent button clicked.");

        // Wait for the "Table" tab to be clickable
        const tableTabSelector = '#tab-link-table';
        await page.waitForSelector(tableTabSelector, { timeout: config.TIMEOUT_COOKIE_CONSENT });
        await page.click(tableTabSelector);
        console.log("Table tab clicked.");

        // Wait for table rows to be available (after data has loaded)
        await page.waitForSelector('table.the-table tbody tr', { timeout: config.TIMEOUT_TAB_CLICK });
        console.log("Table data loaded.");

        // Extract table data
        const tableData = await page.evaluate(() => {
            const rows = document.querySelectorAll('table.the-table tbody tr');
            const data = [];

            rows.forEach(row => {
                const rank = row.querySelector('.rank')?.textContent.trim();
                const topic = row.querySelector('.topic a')?.textContent.trim();
                const topPosition = row.querySelector('.position')?.textContent.trim();
                const tweetCount = row.querySelector('.count')?.textContent.trim();
                const duration = row.querySelector('.duration')?.textContent.trim();

                if (rank && topic && topPosition && tweetCount && duration) {
                    data.push({ rank, topic, topPosition, tweetCount, duration });
                }
            });

            return data;
        });

        // Generate hashtags from the table data
        const hashtags = generateHashtags(tableData, config.ENGLISH_ONLY, config.TWEET_MAX_CHARS);

        // Send the extracted data along with hashtags in the response
        res.json({ hashtags });
    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send('Error while fetching data.');
    } finally {
        // Close the browser
        await browser.close();
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});