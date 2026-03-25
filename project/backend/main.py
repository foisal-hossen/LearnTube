# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
import re

# ১. অ্যাপ ডিক্লেয়ারেশন
app = FastAPI(title="LearnTube Backend API")

# ২. CORS সেটআপ: এটি ফ্রন্টএন্ড (Next.js) কে ব্যাকএন্ডের সাথে কথা বলতে অনুমতি দেয়
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # আপনার ফ্রন্টএন্ডের অ্যাড্রেস
    allow_credentials=True,
    allow_methods=["*"], # গেট, পোস্ট সব রিকোয়েস্ট অ্যালাউ করবে
    allow_headers=["*"],
)

# সাহায্যকারী ফাংশন: ইউটিউব ইউআরএল থেকে আইডি বের করার জন্য
def extract_video_id(url: str):
    video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    if video_id_match:
        return video_id_match.group(1)
    return None

@app.get("/")
def home():
    return {"message": "Welcome to LearnTube API - High Performance Brain"}

# ৩. মেইন এন্ডপয়েন্ট: ভিডিও আইডি দিলে এটি অটোমেটিক ট্রান্সক্রিপ্ট নিয়ে আসবে
@app.get("/api/transcript")
async def get_video_transcript(video_url: str):
    """
    এই ফাংশনটি ইউটিউব ভিডিও থেকে সাবটাইটেল সংগ্রহ করে।
    এটি ল্যাঙ্গুয়েজ লার্নিং (ট্রান্সক্রিপ্ট) এবং প্রোগ্রামিং (নোটস) দুই ক্ষেত্রেই লাগবে।
    """
    video_id = extract_video_id(video_url)
    
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    try:
        # ইউটিউব থেকে সাবটাইটেল আনা হচ্ছে (ইংরেজি এবং অন্যান্য ভাষার সাপোর্টসহ)
        # ল্যাঙ্গুয়েজ মোডের জন্য এটি অত্যন্ত গুরুত্বপূর্ণ
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'de', 'fr'])
        
        # ডাটাকে আরও সুন্দর ফরম্যাটে সাজানো
        formatted_transcript = []
        for entry in transcript_list:
            formatted_transcript.append({
                "text": entry['text'],
                "start": entry['start'],
                "duration": entry['duration']
            })
            
        return {
            "video_id": video_id,
            "transcript": formatted_transcript,
            "count": len(formatted_transcript)
        }

    except Exception as e:
        # যদি সাবটাইটেল না পাওয়া যায় বা অন্য কোনো এরর হয়
        raise HTTPException(status_code=404, detail="Subtitle not found for this video.")

# ৪. প্রোগ্রামিং মোডের জন্য স্পেশাল ফিচার (Key Terms Extraction - স্যাম্পল লজিক)
@app.get("/api/analyze-dev")
async def analyze_coding_video(video_url: str):
    """
    প্রোগ্রামিং ভিডিওর ট্রান্সক্রিপ্ট থেকে ইম্পর্টেন্ট কী-ওয়ার্ড (যেমন: React, API, Function) 
    আলাদা করার জন্য এটি ব্যবহার করা হবে। (ফিউচার ফেজে এটি AI দিয়ে উন্নত করা হবে)
    """
    # আপাতত স্যাম্পল ডাটা পাঠানো হচ্ছে
    return {
        "status": "Ready for analysis",
        "suggested_tags": ["Programming", "Tutorial", "Coding Logic"]
    }

# ৫. সার্ভার রান করার কমান্ড (টার্মিনালে): uvicorn main:app --reload