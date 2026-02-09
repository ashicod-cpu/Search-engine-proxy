const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Search proxy endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q, engine = 'google' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    let results;
    
    switch(engine.toLowerCase()) {
      case 'google':
        results = await googleSearch(q);
        break;
      case 'duckduckgo':
        results = await duckduckgoSearch(q);
        break;
      case 'bing':
        results = await bingSearch(q);
        break;
      default:
        results = await googleSearch(q);
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Google Search (using free API)
async function googleSearch(query) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      return mockResults('google', query);
    }

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        q: query,
        key: apiKey,
        cx: searchEngineId,
        num: 10
      }
    });

    return {
      engine: 'google',
      query,
      results: response.data.items?.map(item => ({
        title: item.title,
        url: item.link,
        description: item.snippet,
        favicon: `https://www.google.com/s2/favicons?sz=16&domain=${new URL(item.link).hostname}`
      })) || []
    };
  } catch (error) {
    console.error('Google search error:', error);
    return mockResults('google', query);
  }
}

// DuckDuckGo Search
async function duckduckgoSearch(query) {
  try {
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1
      }
    });

    const results = [];
    if (response.data.RelatedTopics) {
      response.data.RelatedTopics.slice(0, 10).forEach(item => {
        if (item.FirstURL) {
          results.push({
            title: item.Text || item.FirstURL,
            url: item.FirstURL,
            description: item.Text || '',
            favicon: `https://www.google.com/s2/favicons?sz=16&domain=${new URL(item.FirstURL).hostname}`
          });
        }
      });
    }

    return {
      engine: 'duckduckgo',
      query,
      results
    };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return mockResults('duckduckgo', query);
  }
}

// Bing Search
async function bingSearch(query) {
  try {
    const apiKey = process.env.BING_API_KEY;
    
    if (!apiKey) {
      return mockResults('bing', query);
    }

    const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      params: { q: query },
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });

    return {
      engine: 'bing',
      query,
      results: response.data.webPages?.value?.map(item => ({
        title: item.name,
        url: item.url,
        description: item.snippet,
        favicon: `https://www.google.com/s2/favicons?sz=16&domain=${new URL(item.url).hostname}`
      })) || []
    };
  } catch (error) {
    console.error('Bing search error:', error);
    return mockResults('bing', query);
  }
}

// Mock results for demo
function mockResults(engine, query) {
  const mockData = {
    engine,
    query,
    results: [
      {
        title: `${query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
        description: `Learn more about ${query} on Wikipedia.`,
        favicon: 'https://www.google.com/s2/favicons?sz=16&domain=wikipedia.org'
      },
      {
        title: `${query} - Stack Overflow`,
        url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
        description: `Find ${query} discussions and solutions on Stack Overflow.`,
        favicon: 'https://www.google.com/s2/favicons?sz=16&domain=stackoverflow.com'
      },
      {
        title: `${query} - GitHub`,
        url: `https://github.com/search?q=${encodeURIComponent(query)}`,
        description: `Explore ${query} repositories on GitHub.`,
        favicon: 'https://www.google.com/s2/favicons?sz=16&domain=github.com'
      }
    ]
  };
  return mockData;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Search Engine Proxy running on http://localhost:${PORT}`);
});