"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  PlayCircle, Loader2, CheckCircle2,
  Search, X, Sun, Moon, Clock, Trash2, ChevronRight
} from 'lucide-react';

interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  description: string;
  publishedAt: string;
}

const MAX_RECENT = 8;

export default function LearnTubeMain() {
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [videoId, setVideoId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const t = dark ? {
    bg: '#0a0c10', bg2: '#0f1117', bg3: '#161a24',
    border: '#232836', border2: '#2d3347',
    text: '#e8eaf2', text2: '#8b93a8', text3: '#4a5168',
    accent: '#f5a623', accentBg: 'rgba(245,166,35,0.1)', accentBorder: 'rgba(245,166,35,0.25)',
    shadow: '0 4px 32px rgba(0,0,0,0.5)',
  } : {
    bg: '#f4f5f7', bg2: '#ffffff', bg3: '#f0f1f4',
    border: '#dde0ea', border2: '#c8ccda',
    text: '#1a1d28', text2: '#5a6075', text3: '#9097b0',
    accent: '#d4880f', accentBg: 'rgba(212,136,15,0.08)', accentBorder: 'rgba(212,136,15,0.3)',
    shadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    const saved = localStorage.getItem('lt_recent');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowRecent(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const addToRecent = useCallback((q: string) => {
    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(r => r !== q)].slice(0, MAX_RECENT);
      localStorage.setItem('lt_recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(r => r !== q);
      localStorage.setItem('lt_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('lt_recent');
  };

  const doSearch = useCallback(async (q: string, pageToken?: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError('');
    setShowRecent(false);
    try {
      const params = new URLSearchParams({ q, lang: 'en', ...(pageToken && { pageToken }) });
      const res = await fetch(`/api/youtube/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(prev => pageToken ? [...prev, ...data.videos] : data.videos);
      setNextPage(data.nextPageToken || null);
      setHasSearched(true);
      addToRecent(q);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [addToRecent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) doSearch(query);
  };

  const loadVideo = (video: VideoResult) => {
    setVideoId(video.videoId);
    setVideoTitle(video.title);
    showToast(`▶ ${video.title.slice(0, 45)}...`);
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.3s, color 0.3s' }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: t.bg3, border: `1px solid rgba(78,203,141,0.35)`, borderRadius: '12px', padding: '11px 20px', display: 'flex', alignItems: 'center', gap: '9px', boxShadow: t.shadow, color: '#4ecb8d', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
            <CheckCircle2 size={15} />{toast}
          </div>
        )}

        {/* Nav */}
        <nav style={{ background: t.bg2, borderBottom: `1px solid ${t.border}`, padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: t.shadow }}>
          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', fontFamily: "'Syne', sans-serif", display: 'flex', gap: '2px' }}>
            <span style={{ color: t.accent }}>Learn</span>
            <span style={{ color: t.text }}>Tube</span>
          </div>
          <button
            onClick={() => setDark(!dark)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg3, color: t.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </nav>

        {/* Main grid */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>

          {/* LEFT: Player */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${t.border}`, position: 'relative' }}>
              {videoId ? (
                <iframe
                  key={videoId}
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                  allowFullScreen
                  title={videoTitle}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.15 }}>
                  <PlayCircle size={72} strokeWidth={1} color={t.text} />
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: t.text, textTransform: 'uppercase' }}>Ready for learning</p>
                </div>
              )}
            </div>

            {videoTitle && (
              <div style={{ padding: '12px 16px', background: t.bg2, borderRadius: '12px', border: `1px solid ${t.border}` }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>{videoTitle}</p>
              </div>
            )}
          </div>

          {/* RIGHT: Search */}
          <div>
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                <Search size={12} color={t.text3} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: t.text3, textTransform: 'uppercase' }}>Find Videos</span>
              </div>

              <div ref={searchRef} style={{ position: 'relative' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: t.bg3, border: `1px solid ${query ? t.accentBorder : t.border}`, borderRadius: '10px', padding: '10px 14px', transition: 'border-color 0.2s' }}>
                    <Search size={13} color={t.text3} style={{ flexShrink: 0 }} />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onFocus={() => setShowRecent(true)}
                      placeholder="Search videos..."
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: t.text, fontSize: '14px', fontFamily: 'inherit' }}
                    />
                    {query && (
                      <button type="button" onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text3, display: 'flex', padding: 0 }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !query.trim()}
                    style={{ background: t.accent, color: '#0d0f14', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif", opacity: (!query.trim() || searching) ? 0.45 : 1, transition: 'opacity 0.2s', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {searching ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Go'}
                  </button>
                </form>

                {/* Recent dropdown */}
                {showRecent && recentSearches.length > 0 && !hasSearched && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', zIndex: 50, boxShadow: t.shadow }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px 8px', borderBottom: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: t.text3, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Recent</span>
                      <button onClick={clearRecent} style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                        <Trash2 size={11} /> Clear
                      </button>
                    </div>
                    {recentSearches.map((r, i) => (
                      <div key={i} onClick={() => { setQuery(r); doSearch(r); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.bg3)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <Clock size={12} color={t.text3} />
                          <span style={{ fontSize: '13px', color: t.text2 }}>{r}</span>
                        </div>
                        <button onClick={e => removeRecent(r, e)} style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', padding: '2px' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {searchError && (
                <div style={{ marginTop: '10px', background: 'rgba(240,90,90,0.1)', border: '1px solid rgba(240,90,90,0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#f05a5a' }}>
                  ⚠ {searchError}
                </div>
              )}

              {results.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '560px', overflowY: 'auto', paddingRight: '2px' }}>
                  {results.map(video => (
                    <button key={video.videoId} onClick={() => loadVideo(video)}
                      style={{ display: 'flex', gap: '11px', padding: '10px', borderRadius: '11px', border: `1px solid ${videoId === video.videoId ? t.accentBorder : t.border}`, background: videoId === video.videoId ? t.accentBg : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}
                      onMouseEnter={e => { if (videoId !== video.videoId) e.currentTarget.style.background = t.bg3; }}
                      onMouseLeave={e => { if (videoId !== video.videoId) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ position: 'relative', width: '88px', height: '52px', borderRadius: '7px', overflow: 'hidden', flexShrink: 0, background: t.bg3 }}>
                        <Image src={video.thumbnail} alt={video.title} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: videoId === video.videoId ? t.accent : t.text, lineHeight: 1.4, marginBottom: '3px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</p>
                        <p style={{ fontSize: '11px', color: t.text3 }}>{video.channel}</p>
                      </div>
                    </button>
                  ))}

                  {nextPage && (
                    <button onClick={() => doSearch(query, nextPage)} disabled={searching}
                      style={{ width: '100%', padding: '9px', fontSize: '12px', fontWeight: 600, color: t.text2, background: 'none', border: `1px solid ${t.border}`, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '2px' }}>
                      {searching ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <><ChevronRight size={13} />Load more</>}
                    </button>
                  )}
                </div>
              )}

              {hasSearched && results.length === 0 && !searching && (
                <div style={{ textAlign: 'center', padding: '32px', opacity: 0.25 }}>
                  <Search size={28} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>No results</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
          @media (max-width: 900px) {
            div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}