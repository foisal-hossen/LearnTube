'use client'
// frontend/components/VideoSearch.tsx
// YouTube search UI — type করো, result দেখো, click করলে player এ load হবে

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'

interface Video {
  videoId: string
  title: string
  channel: string
  thumbnail: string
  publishedAt: string
  description: string
}

interface VideoSearchProps {
  onSelect: (video: Video) => void
  selectedVideoId?: string
}

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'fr', label: '🇫🇷 French' },
]

// Suggested searches by language
const SUGGESTIONS: Record<string, string[]> = {
  en: ['BBC English learning', 'English pronunciation', 'English conversation practice', 'English grammar basics', 'TED talks beginners'],
  de: ['Deutsch lernen A1', 'Easy German', 'Deutsche Welle Deutsch', 'German for beginners', 'Deutsch Aussprache'],
  fr: ['Français facile', 'Learn French A1', 'FrenchPod101', 'French conversation', 'Parler français'],
}

export default function VideoSearch({ onSelect, selectedVideoId }: VideoSearchProps) {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('en')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string, lang: string, pageToken?: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ q, lang, ...(pageToken && { pageToken }) })
      const res = await fetch(`/api/youtube/search?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Search failed')

      if (pageToken) {
        setVideos(prev => [...prev, ...data.videos])
      } else {
        setVideos(data.videos)
      }

      setNextPageToken(data.nextPageToken)
      setHasSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    search(query, language)
  }

  function handleSuggestion(s: string) {
    setQuery(s)
    search(s, language)
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    if (query) search(query, lang)
  }

  function loadMore() {
    if (nextPageToken) search(query, language, nextPageToken)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-[#13161e] border border-[#252836] rounded-xl px-4 py-2.5 focus-within:border-[#f5a623] transition-colors">
          {/* Search icon */}
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search videos to learn from..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setVideos([]); setHasSearched(false) }} className="text-gray-500 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {/* Language selector */}
        <select
          value={language}
          onChange={e => handleLanguageChange(e.target.value)}
          className="bg-[#13161e] border border-[#252836] rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none cursor-pointer hover:border-gray-500 transition-colors"
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-[#f5a623] text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#e8955a] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block"/>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {/* Suggestions — search করা না হলে দেখাবে */}
      {!hasSearched && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Quick searches</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS[language].map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-xs px-3 py-1.5 bg-[#1a1e2a] border border-[#252836] rounded-lg text-gray-400 hover:text-[#f5a623] hover:border-[#f5a623]/40 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Results Grid */}
      {videos.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
            {videos.length} results for &quot;{query}&quot;
          </p>
          <div className="grid grid-cols-1 gap-3">
            {videos.map(video => (
              <VideoCard
                key={video.videoId}
                video={video}
                isSelected={selectedVideoId === video.videoId}
                onSelect={onSelect}
              />
            ))}
          </div>

          {/* Load more */}
          {nextPageToken && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full mt-3 py-2.5 text-sm text-gray-400 border border-[#252836] rounded-xl hover:border-gray-500 hover:text-gray-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more results'}
            </button>
          )}
        </div>
      )}

      {/* Empty state after search */}
      {hasSearched && videos.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm">No results found. Try different keywords.</p>
        </div>
      )}
    </div>
  )
}

// ── Video Card ──────────────────────────────────────────────
function VideoCard({ video, isSelected, onSelect }: {
  video: Video
  isSelected: boolean
  onSelect: (v: Video) => void
}) {
  return (
    <button
      onClick={() => onSelect(video)}
      className={`flex gap-3 p-3 rounded-xl border text-left transition-all w-full group
        ${isSelected
          ? 'border-[#f5a623]/60 bg-[#f5a623]/5'
          : 'border-[#252836] hover:border-gray-600 hover:bg-[#1a1e2a]'
        }`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-[120px] h-[68px] rounded-lg overflow-hidden bg-[#1a1e2a]">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover"
          unoptimized
        />
        {/* Play overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity
          ${isSelected ? 'bg-[#f5a623]/20 opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center
            ${isSelected ? 'bg-[#f5a623]' : 'bg-white/90'}`}>
            <svg className={`w-3 h-3 ml-0.5 ${isSelected ? 'text-black' : 'text-black'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className={`text-sm font-medium leading-tight line-clamp-2 mb-1
          ${isSelected ? 'text-[#f5a623]' : 'text-white group-hover:text-gray-100'}`}>
          {video.title}
        </p>
        <p className="text-xs text-gray-500">{video.channel}</p>
      </div>
    </button>
  )
}