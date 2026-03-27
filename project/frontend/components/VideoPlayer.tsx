'use client'
// frontend/components/VideoPlayer.tsx
// Distraction-free YouTube player

import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
  videoId: string | null
  videoTitle?: string
  onTimeUpdate?: (seconds: number) => void
}

export default function VideoPlayer({ videoId, videoTitle, onTimeUpdate }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track watch time every 30 seconds
  useEffect(() => {
    if (!videoId || !onTimeUpdate) return

    const interval = setInterval(() => {
      onTimeUpdate(30) // 30 seconds passed
    }, 30_000)

    return () => clearInterval(interval)
  }, [videoId, onTimeUpdate])

  if (!videoId) {
    return (
      <div className="aspect-video bg-[#0a0c12] rounded-xl border border-[#252836] flex flex-col items-center justify-center gap-3 text-gray-600">
        <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        <p className="text-sm">Search and select a video to start learning</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`rounded-xl overflow-hidden border border-[#252836] bg-black ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''}`}>
      {/* Player */}
      <div className="aspect-video relative">
        <iframe
          key={videoId}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&color=white`}
          title={videoTitle || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Video title bar */}
      {videoTitle && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#13161e] border-t border-[#252836]">
          <p className="text-sm font-medium text-white truncate pr-4">{videoTitle}</p>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Fullscreen close */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}