import { NextResponse } from 'next/server';

export interface TrendingQuery {
  icon: string;
  text: string;
  category: string;
}

interface RedditPost {
  data: {
    title: string;
  };
}

async function fetchGoogleTrends(): Promise<TrendingQuery[]> {
  const fetchTrends = async (geo: string): Promise<TrendingQuery[]> => {
    try {
      const response = await fetch(`https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from Google Trends RSS for geo: ${geo}`);
      }

      const xmlText = await response.text();
      const items = xmlText.match(/<title>(?!Daily Search Trends)(.*?)<\/title>/g) || [];

      return items.map(item => ({
        icon: 'trending',
        text: item.replace(/<\/?title>/g, ''),
        category: 'trending' // TODO: add category based on the query results
      }));
    } catch (error) {
      console.error(`Failed to fetch Google Trends for geo: ${geo}`, error);
      return [];
    }
  };

  const trendsIN = await fetchTrends('IN');
  const trendsUS = await fetchTrends('US');

  return [...trendsIN, ...trendsUS];
}

async function fetchRedditQuestions(): Promise<TrendingQuery[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/askreddit/hot.json?limit=100',
      {
        headers: {
          'User-Agent': 'MiniPerplx/1.0'
        }
      }
    );
    
    const data = await response.json();
    const maxLength = 50;

    return data.data.children
      .map((post: RedditPost) => ({
        icon: 'question',
        text: post.data.title,
        category: 'community'
      }))
      .filter((query: TrendingQuery) => query.text.length <= maxLength)
      .slice(0, 15);
  } catch (error) {
    console.error('Failed to fetch Reddit questions:', error);
    return [];
  }
}

async function fetchFromMultipleSources() {
  const [googleTrends, 
    // redditQuestions
] = await Promise.all([
    fetchGoogleTrends(),
    // fetchRedditQuestions(),
  ]);

  const allQueries = [...googleTrends, 
    // ...redditQuestions
];
  return allQueries
    .sort(() => Math.random() - 0.5);
}

export async function GET() {
  try {
    const trends = await fetchFromMultipleSources();
    
    if (trends.length === 0) {
      // Fallback queries if both sources fail
      return NextResponse.json([
        {
          icon: 'sparkles',
          text: "What causes the Northern Lights?",
          category: 'science'
        },
        {
          icon: 'code',
          text: "Explain quantum computing",
          category: 'tech'
        },
        {
          icon: 'globe',
          text: "Most beautiful places in Japan",
          category: 'travel'
        }
      ]);
    }
    
    return NextResponse.json(trends);
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    return NextResponse.error();
  }
}