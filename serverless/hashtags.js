const puppeteer = require('puppeteer');

const defaultConfig = {
    "TWEET_MAX_CHARS": 280, 
    "ENGLISH_ONLY": true, 
    "TIMEOUT_PAGE_LOAD": 3000,
    "TIMEOUT_COOKIE_CONSENT": 1000,
    "TIMEOUT_TAB_CLICK": 1000
};

const filterEnglishTrends = (trends) => {
    return trends.filter(trend => {
        const trendText = trend.topic;
        return /^[a-zA-Z0-9#\s]+$/.test(trendText);
    });
};

const createHashtags = (trends, maxChars = 280) => {
    const sortedTrends = trends.sort((a, b) => parseInt(b.count) - parseInt(a.count));

    let hashtags = [];
    let totalChars = 0;

    for (let trend of sortedTrends) {
        const trendText = trend.topic;
        const cleanTrend = trendText.replace(/\s+/g, '').replace(/[^\w\u4e00-\u9fff\u0600-\u06ff#]/g, '');
        const hashtag = trendText.startsWith('#') ? cleanTrend : '#' + cleanTrend;
        const hashtagLength = hashtag.length;

        if (totalChars + hashtagLength <= maxChars) {
            hashtags.push(hashtag);
            totalChars += hashtagLength + 1; 
        } else {
            break;
        }
    }

    return hashtags.join(' ');
};

const generateHashtags = (trendingTopics, ENGLISH_ONLY, TWEET_MAX_CHARS) => {
    let filteredTrends = trendingTopics;

    if (ENGLISH_ONLY) {
        filteredTrends = filterEnglishTrends(trendingTopics);
    }

    return createHashtags(filteredTrends, TWEET_MAX_CHARS);
};

exports.handler = async (event, context) => {
    const queryParams = new URLSearchParams(event.queryStringParameters);
    
    const config = {
        TWEET_MAX_CHARS: queryParams.get('TWEET_MAX_CHARS') || defaultConfig.TWEET_MAX_CHARS,
        ENGLISH_ONLY: queryParams.get('ENGLISH_ONLY') === 'true' ? true : defaultConfig.ENGLISH_ONLY,
        TIMEOUT_PAGE_LOAD: queryParams.get('TIMEOUT_PAGE_LOAD') || defaultConfig.TIMEOUT_PAGE_LOAD,
        TIMEOUT_COOKIE_CONSENT: queryParams.get('TIMEOUT_COOKIE_CONSENT') || defaultConfig.TIMEOUT_COOKIE_CONSENT,
        TIMEOUT_TAB_CLICK: queryParams.get('TIMEOUT_TAB_CLICK') || defaultConfig.TIMEOUT_TAB_CLICK
    };

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://trends24.in/', { waitUntil: 'networkidle2' });

        const agreeButtonSelector = 'button.css-47sehv span';
        await page.waitForSelector(agreeButtonSelector, { timeout: config.TIMEOUT_PAGE_LOAD });
        await page.click(agreeButtonSelector);        

        const tableTabSelector = '#tab-link-table';
        await page.waitForSelector(tableTabSelector, { timeout: config.TIMEOUT_COOKIE_CONSENT });
        await page.click(tableTabSelector);

        await page.waitForSelector('table.the-table tbody tr', { timeout: config.TIMEOUT_TAB_CLICK });

        const tableData = await page.evaluate(() => {
            const rows = document.querySelectorAll('table.the-table tbody tr');
            const data = [];
            rows.forEach(row => {
                const rank = row.querySelector('.rank')?.textContent.trim();
                const topic = row.querySelector('.topic a')?.textContent.trim();
                const tweetCount = row.querySelector('.count')?.textContent.trim();

                if (rank && topic && tweetCount) {
                    data.push({ rank, topic, tweetCount });
                }
            });
            return data;
        });

        const hashtags = generateHashtags(tableData, config.ENGLISH_ONLY, config.TWEET_MAX_CHARS);

        return {
            statusCode: 200,
            body: JSON.stringify({ hashtags })
        };
    } catch (error) {
        console.error("An error occurred:", error);
        return {
            statusCode: 500,
            body: 'Error while fetching data.'
        };
    } finally {
        await browser.close();
    }
};