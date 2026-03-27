// frontend/app/api/youtube/search/route.ts
// YouTube Data API v3 — video search endpoint

import { NextRequest, NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const language = searchParams.get('lang') || 'en'
  const pageToken = searchParams.get('pageToken') || ''

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  // Language based relevance boost
  const langQuery = {
    en: `${query} english`,
    de: `${query} deutsch german`,
    fr: `${query} français french`,
  }[language] ?? query

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: langQuery,
      maxResults: '12',
      key: YOUTUBE_API_KEY,
      videoEmbeddable: 'true',     // শুধু embeddable videos
      safeSearch: 'moderate',
      relevanceLanguage: language,
      ...(pageToken && { pageToken }),
    })

    const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`)

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json(
        { error: err.error?.message || 'YouTube API error' },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Clean response — শুধু দরকারি fields পাঠাও
    const videos = data.items?.map((item: YouTubeItem) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description?.substring(0, 120),
    })) ?? []

    return NextResponse.json({
      videos,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || 0,
    })

  } catch (error) {
    console.error('YouTube search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

// ── Types ──
interface YouTubeItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    description: string
    publishedAt: string
    thumbnails: {
      default?: { url: string }
      medium?: { url: string }
      high?: { url: string }
    }
  }
}