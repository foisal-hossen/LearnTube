"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  BookOpen, PlayCircle, Flame, Volume2, PlusCircle,
  Loader2, CheckCircle2, Search, X, Sun, Moon,
  Clock, Trash2, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────
interface TranscriptItem { text: string; start: number; duration: number; }
interface SelectedWord { word: string; phonetic: string; definition: string; example: string; }
interface VideoResult {
  videoId: string; title: string; channel: string;
  thumbnail: string; description: string; publishedAt: string;
}

const MAX_RECENT = 8;

export default function LearnTubeMain() {
  const [dark, setDark] = useState(true);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Player
  const [videoId, setVideoId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Dictionary
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [savedCount, setSavedCount] = useState({ vocab: 0, snippets: 0 });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  // ── Theme CSS vars ────────────────────────────────────────
  const t = dark ? {
    bg: '#0a0c10', bg2: '#0f1117', bg3: '#161a24', bg4: '#1c2130',
    border: '#232836', border2: '#2d3347',
    text: '#e8eaf2', text2: '#8b93a8', text3: '#4a5168',
    accent: '#f5a623', accentBg: 'rgba(245,166,35,0.1)', accentBorder: 'rgba(245,166,35,0.25)',
    card: '#0f1117', shadow: '0 4px 32px rgba(0,0,0,0.5)',
  } : {
    bg: '#f4f5f7', bg2: '#ffffff', bg3: '#f0f1f4', bg4: '#e8eaf0',
    border: '#dde0ea', border2: '#c8ccda',
    text: '#1a1d28', text2: '#5a6075', text3: '#9097b0',
    accent: '#d4880f', accentBg: 'rgba(212,136,15,0.08)', accentBorder: 'rgba(212,136,15,0.3)',
    card: '#ffffff', shadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('lt_recent');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // Close recent on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchStats = useCallback(async () => {
    const [{ count: v }, { count: s }] = await Promise.all([
      supabase.from('vocab_words').select('*', { count: 'exact', head: true }),
      supabase.from('snippets').select('*', { count: 'exact', head: true }),
    ]);
    setSavedCount({ vocab: v || 0, snippets: s || 0 });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addToRecent = (q: string) => {
    const updated = [q, ...recentSearches.filter(r => r !== q)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem('lt_recent', JSON.stringify(updated));
  };

  const removeRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(r => r !== q);
    setRecentSearches(updated);
    localStorage.setItem('lt_recent', JSON.stringify(updated));
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('lt_recent');
  };

  // ── Search ────────────────────────────────────────────────
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

  const pickRecent = (q: string) => {
    setQuery(q);
    doSearch(q);
  };

  // ── Load video ────────────────────────────────────────────
  const loadVideo = async (video: VideoResult) => {
    setVideoId(video.videoId);
    setVideoTitle(video.title);
    setTranscript([]);
    setLoadingTranscript(true);
    try {
      const res = await fetch(
        `https://learntube-backend-mqtg.onrender.com/api/transcript?video_url=https://www.youtube.com/watch?v=${video.videoId}`
      );
      const data = await res.json();
      setTranscript(res.ok ? data.transcript : []);
    } catch { setTranscript([]); }
    finally { setLoadingTranscript(false); }
  };

  // ── Dictionary ────────────────────────────────────────────
  const lookupWord = async (word: string) => {
    const clean = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
    if (!clean || clean.length < 2) return;
    setDictLoading(true);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
      const data = await res.json();
      if (data?.[0]) {
        setSelectedWord({
          word: data[0].word,
          phonetic: data[0].phonetic || '',
          definition: data[0].meanings[0].definitions[0].definition,
          example: data[0].meanings[0].definitions[0].example || '',
        });
      }
    } catch { /**/ }
    finally { setDictLoading(false); }
  };

  const saveToVocab = async () => {
    if (!selectedWord) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { error } = await supabase.from('vocab_words').insert({
      user_id: user.id,
      word: selectedWord.word,
      phonetic: selectedWord.phonetic,
      definition: selectedWord.definition,
      example: selectedWord.example,
      language: 'en',
      source_video_id: videoId || null,
      source_video_title: videoTitle || null,
    });
    if (!error) { showToast(`"${selectedWord.word}" saved!`); fetchStats(); }
    else if (error.code === '23505') showToast('Already saved!', 'info');
  };

  // ── Styles (CSS-in-JS via inline) ────────────────────────
  const s = {
    page: { minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.3s, color 0.3s' },
    nav: { background: t.bg2, borderBottom: `1px solid ${t.border}`, padding: '0 28px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100, boxShadow: t.shadow },
    logo: { fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '2px', fontFamily: "'Syne', sans-serif" },
    main: { maxWidth: '1400px', margin: '0 auto', padding: '24px 24px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' } as React.CSSProperties,
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={s.page}>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: t.bg3, border: `1px solid ${toast.type === 'success' ? 'rgba(78,203,141,0.4)' : t.border}`, borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: t.shadow, color: toast.type === 'success' ? '#4ecb8d' : t.text2, fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }}>
            <CheckCircle2 size={16} />
            {toast.msg}
          </div>
        )}

        {/* Nav */}
        <nav style={s.nav}>
          <div style={s.logo}>
            <span style={{ color: t.accent }}>Learn</span>
            <span style={{ color: t.text }}>Tube</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Streak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: t.accent }}>
              <Flame size={14} fill={t.accent} />
              5 Day Streak
            </div>

            {/* Dark/Light toggle */}
            <button
              onClick={() => setDark(!dark)}
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg3, color: t.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </nav>

        {/* Main layout */}
        <div style={s.main}>

          {/* ── LEFT: Player + Transcript ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Player */}
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
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.2 }}>
                  <PlayCircle size={72} strokeWidth={1} color={t.text} />
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: t.text }}>READY FOR LEARNING</p>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BookOpen size={13} color={t.text3} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: t.text3, textTransform: 'uppercase' }}>Transcript — Click words to look up</span>
              </div>

              <div style={{ height: '220px', overflowY: 'auto', fontSize: '15px', lineHeight: 2.2, color: t.text2, paddingRight: '8px' }}>
                {loadingTranscript ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', opacity: 0.5 }}>
                    <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>Loading transcript...</span>
                  </div>
                ) : transcript.length > 0 ? (
                  transcript.map((item, i) => (
                    <span
                      key={i}
                      onClick={() => lookupWord(item.text)}
                      style={{ cursor: 'pointer', padding: '1px 3px', borderRadius: '4px', transition: 'all 0.15s', display: 'inline' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.background = t.accentBg; (e.target as HTMLElement).style.color = t.accent; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = t.text2; }}
                    >{item.text} </span>
                  ))
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', opacity: 0.2 }}>
                    <BookOpen size={40} strokeWidth={1} />
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>{videoId ? 'No transcript available' : 'Select a video to see transcript'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Search + Dict + Stats ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Search Card */}
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Search size={13} color={t.text3} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: t.text3, textTransform: 'uppercase' }}>Find Videos</span>
              </div>

              {/* Search Input */}
              <div ref={searchRef} style={{ position: 'relative' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <div
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: t.bg3, border: `1px solid ${query ? t.accentBorder : t.border}`, borderRadius: '10px', padding: '10px 14px', transition: 'border-color 0.2s' }}
                  >
                    <Search size={14} color={t.text3} style={{ flexShrink: 0 }} />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onFocus={() => setShowRecent(true)}
                      placeholder="Search videos..."
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: t.text, fontSize: '14px', fontFamily: 'inherit' }}
                    />
                    {query && (
                      <button type="button" onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text3, display: 'flex', padding: 0 }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !query.trim()}
                    style={{ background: t.accent, color: '#0d0f14', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif", opacity: (!query.trim() || searching) ? 0.5 : 1, transition: 'opacity 0.2s', flexShrink: 0 }}
                  >
                    {searching ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Go'}
                  </button>
                </form>

                {/* Recent searches dropdown */}
                {showRecent && recentSearches.length > 0 && !hasSearched && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', zIndex: 50, boxShadow: t.shadow }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: t.text3, letterSpacing: '1px', textTransform: 'uppercase' }}>Recent</span>
                      <button onClick={clearRecent} style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                        <Trash2 size={11} /> Clear
                      </button>
                    </div>
                    {recentSearches.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => pickRecent(r)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.bg3)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <Clock size={13} color={t.text3} />
                          <span style={{ fontSize: '13px', color: t.text2 }}>{r}</span>
                        </div>
                        <button
                          onClick={(e) => removeRecent(r, e)}
                          style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex', padding: '2px' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {searchError && (
                <div style={{ marginTop: '10px', background: 'rgba(240,90,90,0.1)', border: '1px solid rgba(240,90,90,0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#f05a5a' }}>
                  ⚠ {searchError}
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {results.map(video => (
                    <button
                      key={video.videoId}
                      onClick={() => loadVideo(video)}
                      style={{ display: 'flex', gap: '12px', padding: '10px', borderRadius: '12px', border: `1px solid ${videoId === video.videoId ? t.accentBorder : t.border}`, background: videoId === video.videoId ? t.accentBg : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                      onMouseEnter={e => { if (videoId !== video.videoId) { (e.currentTarget).style.background = t.bg3; } }}
                      onMouseLeave={e => { if (videoId !== video.videoId) { (e.currentTarget).style.background = 'transparent'; } }}
                    >
                      <div style={{ position: 'relative', width: '90px', height: '54px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: t.bg3 }}>
                        <Image src={video.thumbnail} alt={video.title} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: videoId === video.videoId ? t.accent : t.text, lineHeight: 1.4, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</p>
                        <p style={{ fontSize: '11px', color: t.text3 }}>{video.channel}</p>
                      </div>
                    </button>
                  ))}

                  {nextPage && (
                    <button
                      onClick={() => doSearch(query, nextPage)}
                      disabled={searching}
                      style={{ width: '100%', padding: '9px', fontSize: '12px', fontWeight: 600, color: t.text2, background: 'none', border: `1px solid ${t.border}`, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = t.border2)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}
                    >
                      {searching ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <><ChevronRight size={13} /> Load more</>}
                    </button>
                  )}
                </div>
              )}

              {/* Empty */}
              {hasSearched && results.length === 0 && !searching && (
                <div style={{ textAlign: 'center', padding: '28px', opacity: 0.3 }}>
                  <Search size={28} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>No results found</p>
                </div>
              )}
            </div>

            {/* Dictionary Card */}
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px', borderTop: `3px solid ${t.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={13} color={t.text3} />
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: t.text3, textTransform: 'uppercase' }}>Dictionary</span>
                </div>
                {selectedWord && (
                  <button onClick={() => setSelectedWord(null)} style={{ background: 'none', border: 'none', color: t.text3, cursor: 'pointer', display: 'flex' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ minHeight: '140px' }}>
                {dictLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', opacity: 0.4, gap: '10px' }}>
                    <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Looking up...</span>
                  </div>
                ) : selectedWord ? (
                  <div>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: t.accent, fontFamily: "'Syne', sans-serif", marginBottom: '2px' }}>{selectedWord.word}</h2>
                    {selectedWord.phonetic && <p style={{ fontSize: '12px', color: t.text3, marginBottom: '12px', fontFamily: 'monospace' }}>{selectedWord.phonetic}</p>}
                    <p style={{ fontSize: '13px', color: t.text2, lineHeight: 1.7, marginBottom: '8px' }}><span style={{ fontWeight: 700, color: t.text3, marginRight: '6px' }}>DEF</span>{selectedWord.definition}</p>
                    {selectedWord.example && <p style={{ fontSize: '12px', color: t.text3, fontStyle: 'italic', lineHeight: 1.6 }}><span style={{ fontWeight: 700, fontStyle: 'normal', marginRight: '6px' }}>EX</span>&ldquo;{selectedWord.example}&rdquo;</p>}
                    <button
                      onClick={saveToVocab}
                      style={{ width: '100%', marginTop: '14px', padding: '11px', background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '10px', color: t.accent, fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s', fontFamily: "'Syne', sans-serif" }}
                      onMouseEnter={e => (e.currentTarget.style.background = `rgba(245,166,35,0.18)`)}
                      onMouseLeave={e => (e.currentTarget.style.background = t.accentBg)}
                    >
                      <PlusCircle size={15} /> Save to Vocabulary
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', opacity: 0.2, gap: '10px' }}>
                    <BookOpen size={36} strokeWidth={1} />
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Click words in transcript</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity */}
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '18px 20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: t.text3, textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>Activity</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Vocab', value: savedCount.vocab, color: t.accent },
                  { label: 'Snippets', value: savedCount.snippets, color: '#5b8cf5' },
                ].map(item => (
                  <div key={item.label} style={{ background: t.bg3, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${t.border}` }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: t.text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{item.label}</p>
                    <p style={{ fontSize: '28px', fontWeight: 800, color: item.color, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{item.value}</p>
                  </div>
                ))}
              </div>
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
            .main-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}