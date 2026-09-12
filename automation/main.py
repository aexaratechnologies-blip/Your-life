import json, os, re, html, subprocess, textwrap
from pathlib import Path
from datetime import datetime, timezone
import requests, feedparser
from PIL import Image, ImageDraw, ImageFont
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'output'; OUT.mkdir(exist_ok=True)
CFG=json.loads((ROOT/'youtube_automation/config.json').read_text())

def font(size=54):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p,size)
    return ImageFont.load_default()

def trends():
    key=os.environ['YOUTUBE_API_KEY']; yt=build('youtube','v3',developerKey=key)
    r=yt.videos().list(part='snippet,statistics',chart='mostPopular',regionCode='US',maxResults=50).execute()
    items=[]
    for x in r.get('items',[]):
        s=x['snippet']; st=x.get('statistics',{}); title=s['title']; text=(title+' '+s.get('description','')).lower()
        if not any(k in text for k in ['ai','technology','tech','robot','iphone','android','google','apple','openai','chip','space','future','gaming']): continue
        views=int(st.get('viewCount',0)); likes=int(st.get('likeCount',0)); comments=int(st.get('commentCount',0));
        score=(views**0.5)+likes*2+comments*3
        items.append({'title':title,'description':s.get('description',''),'video_id':x['id'],'score':score})
    items.sort(key=lambda z:z['score'],reverse=True); return items[:CFG['videos_per_day']]

def ai_script(topic):
    api=os.getenv('GEMINI_API_KEY')
    prompt=f'''Create an original faceless YouTube script about: {topic}. Do not copy or closely paraphrase the source video. Use public facts only. Return JSON with keys title, description, tags, scenes. scenes is an array of objects with narration and visual_text. Aim for about {CFG["video_duration_minutes"]} minutes. Strong hook, factual middle, concise ending.'''
    if api:
        import google.generativeai as genai
        genai.configure(api_key=api); model=genai.GenerativeModel('gemini-2.0-flash')
        raw=model.generate_content(prompt).text
        raw=re.sub(r'^```json|```$','',raw.strip(),flags=re.M).strip()
        return json.loads(raw)
    return {'title':topic[:90],'description':f'An original breakdown of {topic}. Subscribe for more technology updates.','tags':['technology','AI','tech','future'],'scenes':[{'narration':f"Here is what you need to know about {topic}.", 'visual_text':topic},{'narration':'We are separating the important facts from the hype and explaining why this matters.', 'visual_text':'WHY IT MATTERS'},{'narration':'Follow the channel for more original technology explainers and updates.', 'visual_text':'SUBSCRIBE'}]}

def make_assets(data, idx):
    audio=OUT/f'audio_{idx}.wav'; video=OUT/f'video_{idx}.mp4'; thumb=OUT/f'thumb_{idx}.jpg'; txt=OUT/f'script_{idx}.txt'
    narration=' '.join(s['narration'] for s in data['scenes']); txt.write_text(narration)
    # Free local TTS via espeak-ng; no paid voice service.
    subprocess.run(['espeak-ng','-s','145','-v','en-us','-w',str(audio),narration],check=True)
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(audio)]))
    W,H=1920,1080; img=Image.new('RGB',(W,H)); d=ImageDraw.Draw(img); f=font(72); small=font(40)
    title=data['title']; words=title.split(); lines=[]; line=''
    for w in words:
        if len(line)+len(w)>28: lines.append(line); line=w
        else: line=(line+' '+w).strip()
    if line: lines.append(line)
    y=260
    for line in lines[:5]: d.text((W//2,y),line,font=f,anchor='mm',fill='white'); y+=95
    d.text((W//2,850),'ORIGINAL TECH EXPLAINER',font=small,anchor='mm',fill='white'); img.save(thumb,quality=92)
    # Build a clean motion-style faceless video from text cards + narration.
    scene_count=max(1,len(data['scenes'])); seg=dur/scene_count
    inputs=[]
    for n,s in enumerate(data['scenes']):
        p=OUT/f'card_{idx}_{n}.png'; c=Image.new('RGB',(W,H)); cd=ImageDraw.Draw(c); sf=font(64)
        text=s.get('visual_text','')
        cd.text((W//2,H//2),text,font=sf,anchor='mm',align='center',fill='white',stroke_width=2,stroke_fill='black'); c.save(p); inputs.append(p)
    concat=OUT/f'concat_{idx}.txt'; concat.write_text(''.join(f"file '{p}'\nduration {seg}\n" for p in inputs)+f"file '{inputs[-1]}'\n")
    subprocess.run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(concat),'-i',str(audio),'-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(video)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return video,thumb

def upload(video,thumb,data):
    creds=Credentials(None,refresh_token=os.environ['YOUTUBE_REFRESH_TOKEN'],token_uri='https://oauth2.googleapis.com/token',client_id=os.environ['YOUTUBE_CLIENT_ID'],client_secret=os.environ['YOUTUBE_CLIENT_SECRET'],scopes=['https://www.googleapis.com/auth/youtube.upload'])
    yt=build('youtube','v3',credentials=creds)
    body={'snippet':{'title':data['title'][:100],'description':data['description'][:5000],'tags':data.get('tags',[])[:500],'categoryId':'28'},'status':{'privacyStatus':CFG['visibility'],'selfDeclaredMadeForKids':False}}
    req=yt.videos().insert(part='snippet,status',body=body,media_body=MediaFileUpload(str(video),chunksize=-1,resumable=True)); res=req.execute()
    yt.thumbnails().set(videoId=res['id'],media_body=MediaFileUpload(str(thumb))).execute(); return res['id']

def main():
    ts=trends();
    if not ts: raise RuntimeError('No qualifying trends found')
    for i,t in enumerate(ts[:CFG['videos_per_day']]):
        data=ai_script(t['title']); video,thumb=make_assets(data,i); vid=upload(video,thumb,data); print(f'PUBLISHED {vid} | {data["title"]}')
if __name__=='__main__': main()
