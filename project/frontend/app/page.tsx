"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, PlayCircle, Flame, 
  Volume2, PlusCircle, Code, Terminal, Menu, Loader2, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// টাইপস্ক্রিপ্ট ইন্টারফেস (any এরর দূর করার জন্য)
interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

interface SelectedWord {
  word: string;
  phonetic: string;
  definition: string;
  example: string;
}

export default function LearnTubeMain() {
  const [learningMode, setLearningMode] = useState<'language' | 'coding'>('language');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  const [codeNote, setCodeNote] = useState('');
  const [savedCount, setSavedCount] = useState({ vocab: 0, snippets: 0 });
  const [toast, setToast] = useState<string | null>(null);

  const theme = {
    accent: learningMode === 'language' ? '#f5a623' : '#3b82f6',
    accentLight: learningMode === 'language' ? 'rgba(245,166,35,0.15)' : 'rgba(59,130,246,0.15)',
    border: learningMode === 'language' ? 'rgba(245,166,35,0.3)' : 'rgba(59,130,246,0.3)',
    buttonText: learningMode === 'language' ? '#0d0f14' : '#ffffff',
  };

  const fetchStats = async () => {
    const { count: vCount } = await supabase.from('vocabulary').select('*', { count: 'exact', head: true });
    const { count: sCount } = await supabase.from('snippets').select('*', { count: 'exact', head: true });
    setSavedCount({ vocab: vCount || 0, snippets: sCount || 0 });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const lookupWord = async (word: string) => {
    if (learningMode !== 'language') return;
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();
    setIsDictionaryLoading(true);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
      const data = await res.json();
      if (data && data[0]) {
        setSelectedWord({
          word: data[0].word,
          phonetic: data[0].phonetic || "/no phonetic/",
          definition: data[0].meanings[0].definitions[0].definition,
          example: data[0].meanings[0].definitions[0].example || "Study hard to see results."
        });
      }
    } catch {
      console.log("Dictionary lookup failed");
    } finally {
      setIsDictionaryLoading(false);
    }
  };

  const saveToVocab = async () => {
    if (!selectedWord) return;
    const { error: dbError } = await supabase.from('vocabulary').insert([selectedWord]);
    if (!dbError) {
      showToast(`${selectedWord.word} added to your library!`);
      fetchStats();
    }
  };

  const saveSnippet = async () => {
    if (!codeNote || !videoId) return;
    const { error: dbError } = await supabase.from('snippets').insert([{ 
      title: `Note from ${videoId}`, 
      code: codeNote, 
      video_id: videoId 
    }]);
    if (!dbError) {
      showToast("Code snippet saved!");
      setCodeNote('');
      fetchStats();
    }
  };

  const handleSearch = async () => {
    const id = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
    if (!id) return;
    setVideoId(id);
    setIsLoading(true);
    try {
      const response = await fetch(`https://learntube-backend-mqtg.onrender.com/api/transcript?video_url=${videoUrl}`);
      const data = await response.json();
      setTranscript(response.ok ? data.transcript : []);
    } catch {
      console.log("Transcript fetch failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] text-[#e8eaf0] font-sans">
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#1a1e2a] border border-[#4ecb8d4d] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="text-[#4ecb8d]" size={20} />
          <p className="text-sm font-bold tracking-tight">{toast}</p>
        </div>
      )}

      <nav className="flex items-center justify-between px-6 py-4 bg-[#11141b] border-b border-[#1f222c] sticky top-0 z-50 shadow-xl">
        <div className="text-2xl font-black flex items-center gap-1">
          <span style={{ color: theme.accent }}>Learn</span>Tube
        </div>
        
        <div className="hidden lg:flex bg-[#1a1e2a] p-1 rounded-xl border border-[#252836]">
          <button onClick={() => setLearningMode('language')} className={`px-8 py-2 rounded-lg text-xs font-bold transition-all ${learningMode === 'language' ? 'bg-[#f5a623] text-black' : 'text-[#8890a4]'}`}>LANGUAGE</button>
          <button onClick={() => setLearningMode('coding')} className={`px-8 py-2 rounded-lg text-xs font-bold transition-all ${learningMode === 'coding' ? 'bg-[#3b82f6] text-white' : 'text-[#8890a4]'}`}>PROGRAMMING</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2" style={{ backgroundColor: theme.accentLight, borderColor: theme.border, color: theme.accent }}>
            <Flame size={16} fill={theme.accent} /> 5 Day Streak
          </div>
          <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu style={{ color: theme.accent }} /></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="relative mb-10 max-w-3xl mx-auto">
          <input 
            className="w-full bg-[#11141b] border-2 border-[#1f222c] rounded-2xl py-4 pl-6 pr-36 focus:outline-none shadow-2xl transition-all"
            style={{ borderColor: videoUrl ? theme.accent : '#1f222c' }}
            placeholder="Paste video URL..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <button onClick={handleSearch} className="absolute right-2 top-2 bottom-2 px-6 rounded-xl font-black text-xs uppercase" style={{ backgroundColor: theme.accent, color: theme.buttonText }}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Start Study'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-black border border-[#1f222c] rounded-3xl overflow-hidden aspect-video shadow-2xl relative">
              {videoId ? <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} allowFullScreen title="LearnTube Player"></iframe> : 
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20"><PlayCircle size={80} strokeWidth={1} /><p className="mt-4 font-black tracking-[0.3em] text-xs">READY FOR LEARNING</p></div>}
            </div>

            <div className="bg-[#11141b] border border-[#1f222c] rounded-3xl p-6 md:p-8">
              <h3 className="text-[#555d72] uppercase text-[10px] font-black tracking-widest mb-6 flex items-center gap-2">
                {learningMode === 'coding' ? <Terminal size={14} /> : <BookOpen size={14} />}
                {learningMode === 'coding' ? 'Concepts' : 'Click words to translate'}
              </h3>
              
              <div className="text-base md:text-xl leading-[2.3] text-[#8890a4] h-96 overflow-y-auto pr-4 custom-scrollbar">
                {transcript.map((item, i) => (
                  <span key={i} onClick={() => lookupWord(item.text)} className="cursor-pointer hover:text-white px-1 rounded transition-all" style={{ borderBottom: `1px solid ${theme.accent}1a` }}>{item.text} </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl p-0.5" style={{ background: `linear-gradient(to bottom, ${theme.accent}, transparent)` }}>
              <div className="bg-[#11141b] rounded-3xl p-6 md:p-8 min-h-96">
                <div className="flex items-center justify-between mb-8 text-[#555d72]">
                  <h3 className="uppercase text-[10px] font-black tracking-widest">
                    {learningMode === 'coding' ? 'Code Vault' : 'Dictionary'}
                  </h3>
                  {learningMode === 'coding' ? <Code size={20} /> : <Volume2 size={20} />}
                </div>

                {learningMode === 'coding' ? (
                  <div className="space-y-4">
                    <textarea 
                      className="w-full bg-[#0b0d11] border border-[#1f222c] rounded-2xl p-5 text-xs font-mono text-[#4ecb8d] h-56 focus:outline-none"
                      placeholder="// Save code here..."
                      value={codeNote}
                      onChange={(e) => setCodeNote(e.target.value)}
                    />
                    <button onClick={saveSnippet} className="w-full py-4 rounded-2xl font-black text-sm uppercase" style={{ backgroundColor: theme.accent, color: theme.buttonText }}>
                      Save Snippet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isDictionaryLoading ? (
                      <div className="flex flex-col items-center justify-center h-48 opacity-40"><Loader2 className="animate-spin mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest">Searching API...</p></div>
                    ) : selectedWord ? (
                      <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-4xl font-black mb-1 capitalize" style={{ color: theme.accent }}>{selectedWord.word}</h2>
                        <p className="text-[#555d72] text-[10px] font-black tracking-[0.2em] mb-6 uppercase">{selectedWord.phonetic}</p>
                        <div className="space-y-4 text-sm">
                          <p><span className="text-[#555d72] font-bold mr-2">DEF:</span> {selectedWord.definition}</p>
                          <p className="text-[#8890a4] italic"><span className="text-[#555d72] font-bold not-italic mr-2">EX:</span> &quot;{selectedWord.example}&quot;</p>
                        </div>
                        <button onClick={saveToVocab} className="w-full mt-10 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 uppercase" style={{ backgroundColor: theme.accent, color: theme.buttonText }}>
                          <PlusCircle size={18} /> Add to Library
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 opacity-10 text-center">
                        <BookOpen size={64} strokeWidth={1} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select words to learn</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#11141b] border border-[#1f222c] rounded-3xl p-8 shadow-2xl">
               <h3 className="uppercase text-[10px] font-black tracking-widest text-[#555d72] mb-8">Activity</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[#1a1e2a] p-4 rounded-2xl">
                    <span className="text-[10px] font-black text-[#555d72] uppercase tracking-wider">Vocab</span>
                    <span className="text-xl font-black" style={{ color: '#f5a623' }}>{savedCount.vocab}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#1a1e2a] p-4 rounded-2xl">
                    <span className="text-[10px] font-black text-[#555d72] uppercase tracking-wider">Snippets</span>
                    <span className="text-xl font-black" style={{ color: '#3b82f6' }}>{savedCount.snippets}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0b0d11; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f222c; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme.accent}; }
      `}</style>
    </div>
  );
}