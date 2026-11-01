import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, CalendarDays, ChevronLeft, ChevronRight, CircleHelp, Flame, Gift, Home, Lightbulb, Medal, Moon, RotateCcw, Settings, Shuffle, Sparkles, Star, Sun, Trophy, UserRound, Volume2, VolumeX, X, Zap } from 'lucide-react';

type Mechanic = 'classic'|'locked'|'frozen'|'countdown'|'multiplier'|'streak';
type Level = { letters: string[]; words: string[]; bonus: string[]; mystery: string; golden: number; difficulty: string; world: string; mechanic: Mechanic; specialIndex: number; timeLimit: number };
type Theme = 'classic'|'honey'|'emerald'|'purple';
type SettingsState = { muted: boolean; haptics: boolean; dark: boolean; textSize: 'small'|'normal'|'large' };
type Progress = {
  level:number; resumeLevel:number; coins:number; solved:string[]; bonus:string[]; completed:number[]; stars:Record<string,number>; dailyCompleted:string[];
  streak:number; bestStreak:number; wordsFound:number; games:number; longest:string; daily:string[];
  achievements:string[]; settings:SettingsState; themes:Theme[]; theme:Theme; onboarding:boolean;
  shuffleFree:number; eventWords:number; noMistakes:number; lastDaily:string; dailyStreak:number; perfect:number;
};

const PUZZLES = [
  ['CAT','CATS','ACT','SAT','SCAT','CAST'],['BOAT','BAT','TAB','OAT','BOA','TOAB'],['FIRE','FIR','IRE','RIFE','FRI'],
  ['STONE','NOTE','TONE','ONES','SENT','NOSE'],['PLANE','PLAN','LEAN','PANE','PEN','PLEA'],['CLOUD','COLD','LOUD','OLD','COULD','COD'],
  ['GRAPE','GEAR','RAGE','PAGE','GAP','PEAR'],['BRIDGE','BIRD','GRID','RIDE','DIRE','BIDE'],['HOUSE','USE','SHE','SHOE','HUES'],
  ['LIGHT','LIT','HIT','GILT','TIL'],['TRAIN','RAIN','RANT','ANTI','TARN','NIT'],['SMILE','LIME','LIES','MILE','ISLE','SLIM'],
  ['PLANT','PLAN','PANT','ANT','NAP','TAN'],['HEART','HEAR','EARTH','HEAT','RATE','HARE'],['WATER','WEAR','RATE','TEAR','WART','RAW'],
  ['CROWN','CORN','OWN','NOW','WORN'],['MUSIC','SUM','SIC','CUM','MUS'],['DREAM','READ','DEAR','MADE','ARM','DARE'],
  ['BRAVE','BEAR','BARE','RAVE','EAR','BRA'],['SWEET','WET','SET','TEES','EWE','WEST'],['CIRCLE','ICE','RICE','LICE','RELIC'],
  ['GARDEN','DANGER','RANGE','GEAR','DEAR','AGED'],['MARKET','MAKE','TAKE','RATE','DARK','TEAM'],['WINTER','WIN','WIRE','TWIN','TIRE','WREN'],
  ['SPRING','RING','GRIN','SING','PINS','GRIP'],['BASKET','BAKE','BASK','TASK','SKATE','TAKE'],['FLOWER','LOW','FLOW','FOWL','ROLE','WOLF'],
  ['GUITAR','AIR','RAG','RIG','TAG'],['SILVER','LIVE','EVIL','LIES','VILE','VEIL'],['ORANGE','RANGE','ANGER','NEAR','EARN','ORGAN'],
  ['COOKIE','COOK','KICK','ICE'],['CHOCOLATE','CHAT','LATE','COAT','ECHO','HEAL'],['KINGDOM','KING','KIND','MIND','DING','DOOM']
];

const WORLDS = [
  ['Cookie Kitchen','🍪',0,49],['Cupcake Café','🧁',50,99],['Chocolate Factory','🍫',100,149],
  ['Donut Street','🍩',150,199],['Honey Bakery','🍯',200,249],['Word Kingdom','👑',250,999999]
] as const;
const LEVEL_COUNT = 1_000_000;

function canBuild(word:string, letters:string[]){
  const have:Record<string,number>={}; for(const c of letters)have[c]=(have[c]||0)+1;
  const need:Record<string,number>={}; for(const c of word)need[c]=(need[c]||0)+1;
  return Object.entries(need).every(([c,n])=>(have[c]||0)>=n);
}
const difficultyTier = (index:number) => index<20?0:index<50?1:index<100?2:index<200?3:index<500?4:index<1000?5:6;
const makeLevel = (raw:string[], index:number):Level => {
  const unique = [...new Set(raw.map(x => x.toUpperCase()))];
  const base = unique[0];
  const tier = difficultyTier(index);
  const letterCap = [5,6,7,8,9,9,9][tier];
  const pool = [...new Set(unique.join(''))];
  const letters = [...new Set([...base,...pool.filter(c => !base.includes(c))])].slice(0, Math.max(base.length,letterCap));
  const valid = unique.filter(w => w.length >= 3 && w.length <= letters.length && canBuild(w,letters));
  const words = [...new Set(valid)].slice(0,6);
  const bonus = [...new Set(unique.filter(w => !words.includes(w)).concat(words.map(w => w.split('').reverse().join(''))))]
    .filter(w => w.length >= 3 && w.length <= letters.length && canBuild(w,letters) && w !== base);
  const world = WORLDS.find(([, , a, b]) => index >= a && index <= b)?.[0] ?? 'Word Kingdom';
  const mechanic:Mechanic = index<20?'classic':(['locked','frozen','countdown','multiplier','streak'][Math.floor((index-20)/12)%5] as Mechanic);
  const first=words[0]??base;
  const candidates=letters.map((_,i)=>i).filter(i=>!first.includes(letters[i]));
  const specialIndex=candidates.length?candidates[(index*7)%candidates.length]:index%letters.length;
  const timeLimit=Math.max(20,60-tier*7+(index%4)*3);
  const difficulty=['Normal','Tricky','Hard','Expert','Master','Grandmaster','Legend'][tier];
  return { letters, words:words.length>=3?words:[...words,base].filter((v,i,a)=>a.indexOf(v)===i), bonus, mystery: words[words.length-1] ?? base, golden:index%letters.length, difficulty, world, mechanic, specialIndex, timeLimit };
};
const getLevel = (i:number):Level => { const index=Math.max(0,Math.min(LEVEL_COUNT-1,Math.floor(i))); return makeLevel(PUZZLES[(index*7 + Math.floor(index/32)) % PUZZLES.length],index); };
const defaultProgress:Progress = {
  level:0, resumeLevel:0, coins:50, solved:[], bonus:[], completed:[], stars:{}, streak:0, bestStreak:0, wordsFound:0, games:0, longest:'',
  daily:[], dailyCompleted:[], achievements:[], settings:{muted:false,haptics:true,dark:false,textSize:'normal'}, themes:['classic','honey','emerald','purple'], theme:'classic',
  onboarding:true, shuffleFree:3, eventWords:0, noMistakes:0, lastDaily:'', dailyStreak:0, perfect:0
};
function todayKey(){ return new Date().toISOString().slice(0,10); }
function dailyIndex(){ return Number(todayKey().replaceAll('-','')) % LEVEL_COUNT; }
function load():Progress {
  try {
    const raw=JSON.parse(localStorage.getItem('word-bites-progress') || 'null');
    if (!raw || typeof raw !== 'object') return {...defaultProgress};
    const level=Number.isFinite(Number(raw.level)) ? Math.max(0, Math.min(LEVEL_COUNT - 1, Number(raw.level))) : 0;
    const legacyThemes:Record<string,Theme>={classic:'classic',honey:'honey',emerald:'emerald',purple:'purple',midnight:'purple',chocolate:'honey',candy:'emerald',winter:'classic',halloween:'purple'};
    const theme:Theme=legacyThemes[String(raw.theme)] ?? 'classic';
    const themes:Theme[]=['classic','honey','emerald','purple'];
    return {
      ...defaultProgress,
      ...raw,
      level,
      resumeLevel:Number.isFinite(Number(raw.resumeLevel)) ? Math.max(0, Math.min(LEVEL_COUNT - 1, Number(raw.resumeLevel))) : level,
      coins:Math.max(0, Number(raw.coins) || defaultProgress.coins),
      solved:Array.isArray(raw.solved) ? raw.solved.filter((x:unknown)=>typeof x==='string') : [],
      bonus:Array.isArray(raw.bonus) ? raw.bonus.filter((x:unknown)=>typeof x==='string') : [],
      completed:Array.isArray(raw.completed) ? raw.completed.filter((x:unknown)=>Number.isInteger(x) && x>=0 && x<LEVEL_COUNT) : [],
      stars:raw.stars && typeof raw.stars==='object' ? raw.stars : {},
      achievements:Array.isArray(raw.achievements) ? raw.achievements.filter((x:unknown)=>typeof x==='string') : [],
      daily:Array.isArray(raw.daily) ? raw.daily.filter((x:unknown)=>typeof x==='string') : [],
      dailyCompleted:Array.isArray(raw.dailyCompleted) ? raw.dailyCompleted.filter((x:unknown)=>typeof x==='string') : [],
      themes,
      theme,
      settings:{...defaultProgress.settings,...(raw.settings && typeof raw.settings==='object' ? raw.settings : {})},
      shuffleFree:Math.max(0, Number(raw.shuffleFree) || 0),
      eventWords:Math.max(0, Number(raw.eventWords) || 0),
      noMistakes:Math.max(0, Number(raw.noMistakes) || 0),
      dailyStreak:Math.max(0, Number(raw.dailyStreak) || 0),
      perfect:Math.max(0, Number(raw.perfect) || 0)
    };
  } catch {
    return {...defaultProgress};
  }
}
function weekEvent(){ return Math.floor(Date.now()/86400000/7); }
function eventGoal(){ return 50 + (weekEvent()%3)*25; }
function related(a:string,b:string){ return a.length>2 && b.length>2 && (a.includes(b) || b.includes(a) || [...a].sort().join('') === [...b].sort().join('')); }

function App(){
  const [p,setP] = useState<Progress>(load);
  const [screen,setScreen] = useState<'home'|'game'|'daily'|'worlds'|'profile'|'achievements'|'settings'|'themes'|'dictionary'|'event'>('home');
  const [level,setLevel] = useState(p.level);
  const [selected,setSelected] = useState<number[]>([]);
  const [order,setOrder] = useState<number[]>([]);
  const [dragging,setDragging] = useState(false);
  const [message,setMessage] = useState('');
  const [combo,setCombo] = useState(0);
  const [chain,setChain] = useState<string[]>([]);
  const [foundAnim,setFoundAnim] = useState('');
  const [showComplete,setShowComplete] = useState(false);
  const [timed,setTimed] = useState(false);
  const [mechanicUnlocked,setMechanicUnlocked] = useState(false);
  const [frozen,setFrozen] = useState(false);
  const finishingRef=useRef(false);
  const [timeLeft,setTimeLeft] = useState(45);
  const [hintUsed,setHintUsed] = useState(false);
  const [mistakes,setMistakes] = useState(0);
  const [dictionaryWord,setDictionaryWord] = useState('');
  const audio=useRef<AudioContext|null>(null);

  const data=getLevel(level);
  const dailyData=getLevel(dailyIndex());
  const target = screen==='daily' ? dailyData : data;
  const solvedHere=p.solved.filter(x=>x.startsWith(level+':')).map(x=>x.slice(String(level).length+1));
  const dailySolved=p.daily.filter(x=>x.startsWith(todayKey()+':')).map(x=>x.slice(11));
  const displaySolved=screen==='daily'?dailySolved:solvedHere;
  const allSolved=target.words.every(w=>displaySolved.includes(w));
  const stars=allSolved ? (hintUsed?Math.max(1,3-(mistakes>0?1:0)):mistakes===0?3:2) : displaySolved.length>=3?1:0;
  const multiplier=combo>=10?2:combo>=5?1.5:combo>=3?1.2:1;
  const currentWord=selected.map(i=>target.letters[order[i] ?? i]).join('');
  const goldenLetter=target.letters[target.golden];
  const isGolden=selected.some(i=>(target.letters[order[i] ?? i]===goldenLetter));
  const activeTheme=p.theme;
  const themeClass='theme-'+activeTheme;
  const save=(next:Progress)=>{
    const safe={...defaultProgress,...next,level:Math.max(0,Math.min(LEVEL_COUNT-1,Number(next.level)||0))};
    setP(safe);
    try { localStorage.setItem('word-bites-progress',JSON.stringify(safe)); } catch { setMessage('Progress could not be saved on this device.'); }
  };
  const commit=(patch:Partial<Progress>)=>save({...p,...patch});
  const beep=(freq:number,duration=.08)=>{if(p.settings.muted)return;try{audio.current ||= new AudioContext();const o=audio.current.createOscillator();const g=audio.current.createGain();o.frequency.value=freq;o.connect(g);g.connect(audio.current.destination);g.gain.value=.035;o.start();o.stop(audio.current.currentTime+duration);}catch{}};
  const buzz=(strong=false)=>{if(p.settings.haptics && 'vibrate' in navigator)navigator.vibrate(strong?[30,30,60]:15);};
  const begin=(n:number,mode:'game'|'daily'='game',isTimed=false)=>{
    const safeLevel=Math.max(0,Math.min(LEVEL_COUNT-1,Number.isFinite(n)?Math.floor(n):0));
    const nextLevel=getLevel(safeLevel);
    const initialOrder=[...Array(nextLevel.letters.length).keys()];
    for(let i=initialOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[initialOrder[i],initialOrder[j]]=[initialOrder[j],initialOrder[i]];}
    finishingRef.current=false;
    if(mode==='game')save({...p,resumeLevel:safeLevel});
    setLevel(safeLevel);setScreen(mode);setSelected([]);setOrder(initialOrder);setMessage('');setCombo(0);setChain([]);setHintUsed(false);setMistakes(0);setShowComplete(false);setTimed(isTimed || nextLevel.mechanic==='countdown');setTimeLeft(isTimed?45:nextLevel.timeLimit);setMechanicUnlocked(nextLevel.mechanic!=='locked');setFrozen(nextLevel.mechanic==='frozen');
    if(nextLevel.mechanic==='frozen'){window.setTimeout(()=>setFrozen(false),2500);}
  };
  const choose=(i:number)=>{
    if(selected.includes(i))return;
    const actual=order[i]??i;
    if(target.mechanic==='locked' && !mechanicUnlocked && actual===target.specialIndex){setMessage('🔒 This letter unlocks after your first word.');buzz(true);return;}
    if(target.mechanic==='frozen' && frozen && actual===target.specialIndex){setMessage('🧊 Frozen letter — thawing...');buzz(true);return;}
    setSelected(s=>[...s,i]);beep(420+i*35);buzz();
  };
  const onMove=(e:React.PointerEvent)=>{if(!dragging)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-letter]') as HTMLElement|null;if(el)choose(Number(el.dataset.letter));};
  const releaseSelection=()=>{if(!dragging)return;setDragging(false);if(selected.length>0)submit();};
  const submit=()=>{
    if(!currentWord)return;
    const isDaily=screen==='daily';
    const key=isDaily?todayKey()+':'+currentWord:level+':'+currentWord;
    const words=target.words, bonuses=target.bonus;
    if(words.includes(currentWord)){
      if(!displaySolved.includes(currentWord)){
        const chainNext=chain.length && related(chain[chain.length-1],currentWord) ? [...chain,currentWord] : [currentWord];
        const chainBonus=chainNext.length>=4?12:chainNext.length>=3?6:chainNext.length>=2?3:0;
        const goldenBonus=isGolden?10:0;
        const mysteryBonus=currentWord===target.mystery && !hintUsed?20:0;
        const mechanicBonus=target.mechanic==='multiplier' && selected.some(i=>(order[i]??i)===target.specialIndex)?Math.max(10,currentWord.length*4):0;
        const streakBonus=target.mechanic==='streak' && combo>=2?combo*2:0;
        const gain=Math.max(2,Math.round(currentWord.length*2*multiplier))+chainBonus+goldenBonus+mysteryBonus+mechanicBonus+streakBonus;
        const nextSolved=isDaily?[...p.daily,key]:[...p.solved,key];
        const nextChain=chainNext;
        const eventWords=isDaily?p.eventWords:p.eventWords+1;
        const next={...p,[isDaily?'daily':'solved']:nextSolved,coins:p.coins+gain,wordsFound:p.wordsFound+(isDaily?0:1),longest:currentWord.length>p.longest.length?currentWord:p.longest,eventWords};
        setChain(nextChain);setCombo(c=>c+1);setMechanicUnlocked(true);setFoundAnim(currentWord);setTimeout(()=>setFoundAnim(''),450);
        setMessage((isGolden?'⭐ Golden +10 · ':'')+(mysteryBonus?'💎 Mystery +20 · ':'')+(mechanicBonus?'⚡ Multiplier +'+mechanicBonus+' · ':'')+(streakBonus?'🔥 Streak +'+streakBonus+' · ':'')+(chainBonus?'🔗 Chain +'+chainBonus+' · ':'')+'+'+gain+' coins');
        save(next);beep(650,.12);buzz(combo>=4);
      } else setMessage('Already found');
    } else if(bonuses.includes(currentWord)){
      const keyb=level+':'+currentWord;
      if(!p.bonus.includes(keyb)){save({...p,bonus:[...p.bonus,keyb],coins:p.coins+8,eventWords:p.eventWords+1});setMessage('✨ Bonus word! +8');beep(820,.14);buzz(true);}
      else setMessage('Bonus already found');
    } else {setMessage(['Try another word 🤔','Not one of today’s words.','Almost! Keep searching.','That’s not in this puzzle.'][mistakes%4]);setCombo(0);setChain([]);setMistakes(m=>m+1);beep(180);}
    setSelected([]);setDragging(false);
  };
  const shuffle=()=>{
    if(p.shuffleFree<=0 && p.coins<5){setMessage('No free shuffles left · 5 coins needed');return;}
    const arr=[...order.length?order:[...Array(target.letters.length).keys()]];
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
    setOrder(arr);setSelected([]);setDragging(false);
    if(p.shuffleFree>0)commit({shuffleFree:p.shuffleFree-1});else commit({coins:p.coins-5});
    setMessage('Letters reshuffled');buzz();
  };
  const hint=(kind:'letter'|'word')=>{
    const tier=difficultyTier(level);
    const cost=(kind==='word'?25:10)+tier*(kind==='word'?8:3);
    if(p.coins<cost){setMessage('Not enough coins');return;}
    const missing=target.words.find(w=>!displaySolved.includes(w));if(!missing)return;
    commit({coins:p.coins-cost});setHintUsed(true);setMessage(kind==='word'?'Hint: '+missing:'Hint: '+missing[0]+' _ _ _');beep(760);
  };
  const finishLevel=()=>{
    if(finishingRef.current)return;
    if(screen==='daily'){
      if(!allSolved||p.dailyCompleted.includes(todayKey()))return;
      const last=p.lastDaily;const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      const ds=last===yesterday?p.dailyStreak+1:1;const ach=[...p.achievements];
      if(ds>=10&&!ach.includes('10-Day Streak'))ach.push('10-Day Streak');
      finishingRef.current=true;
      save({...p,dailyCompleted:[...p.dailyCompleted,todayKey()],dailyStreak:ds,streak:ds,bestStreak:Math.max(p.bestStreak,ds),lastDaily:todayKey(),achievements:ach,coins:p.coins+35});
      setTimed(false);setSelected([]);setDragging(false);setShowComplete(true);return;
    }
    if(!allSolved||p.completed.includes(level))return;
    finishingRef.current=true;
    const completed=[...p.completed,level];const earnedStars=Math.max(p.stars[String(level)]||0,stars);const nextStars={...p.stars,[String(level)]:earnedStars};
    const ach=[...p.achievements];
    if(!ach.includes('First Word'))ach.push('First Word');
    if(completed.length>=100&&!ach.includes('Complete 100 Levels'))ach.push('Complete 100 Levels');
    if(p.wordsFound>=99&&!ach.includes('100 Words Found'))ach.push('100 Words Found');
    if(p.bonus.length>=49&&!ach.includes('50 Bonus Words'))ach.push('50 Bonus Words');
    if(earnedStars===3&&!ach.includes('Perfect Level'))ach.push('Perfect Level');
    const nextNoMistakes=p.noMistakes+(mistakes===0?1:0);
    const nextLevel=Math.min(LEVEL_COUNT-1,Math.max(p.level,level+1));
    save({...p,level:nextLevel,resumeLevel:nextLevel,completed,stars:nextStars,achievements:ach,coins:p.coins+25+earnedStars*5,noMistakes:nextNoMistakes,perfect:p.perfect+(earnedStars===3?1:0)});
    setTimed(false);setSelected([]);setDragging(false);setShowComplete(true);
  };
  useEffect(()=>{if(allSolved)finishLevel();},[allSolved]);
  useEffect(()=>{if(!showComplete||screen!=='game'||level>=LEVEL_COUNT-1)return;const id=window.setTimeout(()=>{setShowComplete(false);begin(Math.min(LEVEL_COUNT-1,level+1));},1200);return()=>window.clearTimeout(id);},[showComplete,screen,level]);
  useEffect(()=>()=>{setFrozen(false)},[level]);
  useEffect(()=>{
    if(!timed||screen!=='game'||allSolved)return;
    const id=window.setInterval(()=>setTimeLeft(t=>{
      if(t<=1){setTimed(false);setMessage('⏰ Time’s up — challenge over');return 0;}
      return t-1;
    }),1000);
    return()=>window.clearInterval(id);
  },[timed,screen,allSolved]);
  useEffect(()=>{const up=()=>releaseSelection();window.addEventListener('pointerup',up);return()=>window.removeEventListener('pointerup',up);},[dragging,selected,currentWord]);
  useEffect(()=>{if(!p.onboarding)return;},[p.onboarding]);

  const completeSummary=<div className="modal-backdrop"><div className="complete-modal"><button className="modal-x" aria-label="Close completion summary" onClick={()=>setShowComplete(false)}><X/></button><div className="mascot celebrate">🍪</div><p className="eyebrow">PUZZLE COMPLETE!</p><div className="big-stars"><Star fill="currentColor"/><Star fill={stars>=2?'currentColor':'none'}/><Star fill={stars>=3?'currentColor':'none'}/></div><h2>{screen==='daily'?'Daily Bite':'Perfectly Baked!'}</h2><p>⭐ {stars}/3 &nbsp; · &nbsp; 🪙 +{screen==='daily'?35:25+stars*5} Coins</p><p>🔥 Streak ×{p.streak} &nbsp; · &nbsp; ✨ {p.bonus.length} Bonus Words</p><button className="primary big" disabled>{screen==='daily'?'Daily puzzle complete':'Loading next puzzle…'} <ChevronRight/></button></div></div>;

  const mascot=(m:string='🍪')=><div className="mascot">{m}</div>;
  const HomeScreen=()=> <div className="home-screen"><div className="bakery-hero-art" aria-hidden="true"><img src="/resources/bakery-hero.svg" alt=""/><span className="floating-spark spark-one">✦</span><span className="floating-spark spark-two">✧</span></div><img className="brand-logo" src="/resources/word-bites-logo.png" alt="Word Bites logo" /><p className="eyebrow">THE WORD PUZZLE GAME</p><p className="tagline">Bite into words. Build your streak.</p><div className="home-coins">🪙 {p.coins} · 🔥 {p.streak} day streak · ⭐ {Object.values(p.stars).reduce((a,b)=>a+b,0)}</div><button className="primary big" onClick={()=>begin(Math.min(LEVEL_COUNT-1,Math.max(p.level,p.resumeLevel)))}><Sparkles/> Play</button><div className="home-grid"><button onClick={()=>begin(dailyIndex(),'daily')}><CalendarDays/><span>Daily Puzzle</span></button><button onClick={()=>setScreen('event')}><Gift/><span>Events</span></button><button onClick={()=>setScreen('worlds')}><Trophy/><span>Worlds</span></button><button onClick={()=>setScreen('profile')}><UserRound/><span>Profile</span></button><button onClick={()=>setScreen('themes')}><Sparkles/><span>Themes</span></button><button onClick={()=>setScreen('settings')}><Settings/><span>Settings</span></button></div><div className="home-foot"><button onClick={()=>setScreen('achievements')}><Medal/> Achievements</button><button onClick={()=>setScreen('dictionary')}><BookOpen/> Dictionary</button><button onClick={()=>commit({settings:{...p.settings,muted:!p.settings.muted}})}>{p.settings.muted?<VolumeX/>:<Volume2/>} Sound</button></div>{p.onboarding&&<Onboarding/>}</div>;
  const Onboarding=()=> <div className="modal-backdrop"><div className="onboard"><div className="mascot">👨‍🍳</div><p className="eyebrow">WELCOME TO WORD BITES</p><h2>Learn the bite in 4 steps</h2><div className="tutorial"><div>1️⃣ <b>Select letters</b><small>Tap or drag across the wheel.</small></div><div>2️⃣ <b>Build a word</b><small>Connect letters in order.</small></div><div>3️⃣ <b>Release your finger</b><small>Lift your finger to automatically check the word.</small></div><div>4️⃣ <b>Complete the puzzle</b><small>Find every normal word for 3 stars.</small></div></div><button className="primary big" onClick={()=>commit({onboarding:false})}>Start Baking 🍪</button></div></div>;
  const GameScreen=()=> <div className="game-screen"><header className="game-head"><button className="icon-btn" onClick={()=>setScreen('home')}><ChevronLeft/></button><div><b>{screen==='daily'?'Daily Puzzle':data.world}</b><small>{screen==='daily'?todayKey():data.difficulty+' · Level '+String(level+1).padStart(3,'0')}</small></div><span className="coin-chip">🪙 {p.coins}</span></header><div className="progress-bar"><i style={{width:Math.min(100,displaySolved.length/target.words.length*100)+'%'}}/></div><div className="game-title-row"><div><h2>{screen==='daily'?'Today’s Bite':'Find the hidden words'}</h2><small className="clue">{target.words.length} words · {target.letters.length} letters · ⭐ Golden: {goldenLetter} · {target.mechanic==='classic'?'Classic':target.mechanic==='locked'?'🔒 Locked':target.mechanic==='frozen'?'🧊 Frozen':target.mechanic==='countdown'?'⏳ Countdown':target.mechanic==='multiplier'?'⚡ Multiplier':'🔥 Streak'}</small></div><span>{displaySolved.length}/{target.words.length} <span className="stars"><StarIcon count={stars}/></span></span></div><div className="word-grid">{target.words.map(w=><button className={'word-slot '+(displaySolved.includes(w)?'found':'')} key={w} onClick={()=>displaySolved.includes(w)&&setDictionaryWord(w)}>{displaySolved.includes(w)?w.split('').map((c,i)=><span key={i}>{c}</span>):w.split('').map((_,i)=><span key={i}>•</span>)}</button>)}</div><div className="play-card"><div className="game-card-decoration" aria-hidden="true"><img src="/resources/bakery-game.svg" alt=""/></div><div className={'current-word '+(foundAnim?'pop':'')}>{currentWord||<span>Swipe through letters</span>}</div>{message&&<div className="message">{message}</div>}{combo>=3&&<div className="combo">🔥 {combo} WORD COMBO · {multiplier.toFixed(1)}×</div>}{timed&&<div className="timer">⏱ {timeLeft}s · Find {Math.min(5,target.words.length)} words</div>}{target.mechanic!=='classic'&&<div className="mechanic-banner">{target.mechanic==='locked'?'🔒 One letter unlocks after your first correct word.':target.mechanic==='frozen'?'🧊 One letter thaws after a short warm-up.':target.mechanic==='countdown'?'⏳ Countdown level — finish before time runs out.':target.mechanic==='multiplier'?'⚡ Find the glowing letter for a larger coin reward.':'🔥 Keep consecutive correct words for extra coins.'}</div>}<div className="wheel" onPointerMove={onMove} onPointerDown={()=>setDragging(true)} onPointerUp={releaseSelection} onPointerCancel={releaseSelection}><svg className="path" viewBox="0 0 100 100"><polyline points={selected.map(i=>{const a=i/order.length*Math.PI*2-Math.PI/2;return (50+Math.cos(a)*34)+','+(50+Math.sin(a)*34)}).join(' ')}/></svg>{order.map((actual,i)=>{const a=i/order.length*Math.PI*2-Math.PI/2;const letter=target.letters[actual];return <button data-letter={i} key={actual} className={'letter '+(selected.includes(i)?'used':'')+(letter===goldenLetter?' golden':'')+((target.mechanic==='locked'&&!mechanicUnlocked&&actual===target.specialIndex)?' locked-letter':'')+((target.mechanic==='frozen'&&frozen&&actual===target.specialIndex)?' frozen-letter':'')+((target.mechanic==='multiplier'&&actual===target.specialIndex)?' multiplier-letter':'')} style={{left:(50+Math.cos(a)*34)+'%',top:(50+Math.sin(a)*34)+'%'}} onPointerDown={e=>{e.stopPropagation();setDragging(true);choose(i)}}>{letter}{letter===goldenLetter&&<sup>⭐</sup>}{target.mechanic==='locked'&&!mechanicUnlocked&&actual===target.specialIndex?<sup>🔒</sup>:target.mechanic==='frozen'&&frozen&&actual===target.specialIndex?<sup>🧊</sup>:target.mechanic==='multiplier'&&actual===target.specialIndex?<sup>×2</sup>:null}</button>})}</div><div className="tool-row"><button onClick={()=>{setSelected([]);setMessage('')}}><RotateCcw/> Clear</button><button onClick={()=>hint('letter')}><Lightbulb/> Reveal letter <small>{10+difficultyTier(level)*3}</small></button><button onClick={()=>hint('word')}><Sparkles/> Reveal word <small>{25+difficultyTier(level)*8}</small></button><button onClick={shuffle}><Shuffle/> Shuffle <small>{p.shuffleFree>0?p.shuffleFree+' free':'5 🪙'}</small></button></div><button className="challenge-btn" onClick={()=>{setTimed(true);setTimeLeft(45);setMessage('Timed Bake started!')}}><Zap/> Timed Challenge</button>{allSolved&&<button className="primary next" onClick={()=>setShowComplete(true)}>🎉 Puzzle complete <ChevronRight/></button>}<div className="word-lengths">{[3,4,5,6,7,8].filter(n=>target.words.some(w=>w.length===n)).map(n=><span key={n}>{n} LETTERS {displaySolved.filter(w=>w.length===n).length? '✓':'?'}</span>)}</div></div><div className="bonus-line">✨ Bonus words: {p.bonus.length} · ⭐ Golden words pay +10 · 💎 Mystery pays +20</div>{dictionaryWord&&<div className="dictionary-pop"><button onClick={()=>setDictionaryWord('')}><X/></button><b>{dictionaryWord}</b><small>{dictionaryWord.length>=5?'Noun / verb — a word discovered in Word Bites.':'Common word — tap words to learn and review them.'}</small></div>}{showComplete&&completeSummary}</div>;
  const StarIcon=({count}:{count:number})=><>{[1,2,3].map(i=><Star key={i} size={14} fill={i<=count?'currentColor':'none'}/>)}</>;
  const Nav=({title}:{title:string})=><header className="sub-nav"><button className="icon-btn back-btn" aria-label="Back to home" onClick={()=>setScreen('home')}><ChevronLeft/></button><h2>{title}</h2><button className="icon-btn" aria-label="Home" onClick={()=>setScreen('home')}><Home/></button></header>;
  const SettingsScreen=()=> <div className="sub-screen"><Nav title="Settings"/><section className="settings-list"><SettingRow icon={p.settings.muted?<VolumeX/>:<Volume2/>} label="Sound" value={!p.settings.muted} onClick={()=>commit({settings:{...p.settings,muted:!p.settings.muted}})}/><SettingRow icon={<Zap/>} label="Haptics" value={p.settings.haptics} onClick={()=>commit({settings:{...p.settings,haptics:!p.settings.haptics}})}/><button className="setting-row" onClick={()=>setScreen('themes')}><span><Sparkles/> Appearance & themes</span><b>{p.theme==='purple'?'PURPLE DARK':p.theme.toUpperCase()}</b></button><div className="setting-row"><span>🔤 Text size</span><select value={p.settings.textSize} onChange={e=>commit({settings:{...p.settings,textSize:e.target.value as SettingsState['textSize']}})}><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option></select></div><button className="wide-btn" onClick={()=>setScreen('themes')}>🎨 Theme</button><button className="wide-btn" onClick={()=>alert('Swipe across letters and release your finger to automatically check the word. Find every normal word for 3 stars.')}>❓ How to play</button><button className="danger-btn" onClick={()=>{if(confirm('Reset all local progress?')){localStorage.removeItem('word-bites-progress');location.reload();}}}>🔄 Reset progress</button></section><div className="offline-note">📴 Offline-first: progress, coins, stars, settings and daily state are saved on this device.</div><div className="cloud-card">☁️ <b>Word Bites Account</b><small>Cross-device cloud sync is prepared for a future account service. Your local progress remains safe meanwhile.</small></div></div>;
  function SettingRow({icon,label,value,onClick}:{icon:React.ReactNode;label:string;value:boolean;onClick:()=>void}){return <button className="setting-row" onClick={onClick}><span>{icon} {label}</span><b>{value?'ON':'OFF'}</b></button>}
  const Themes=()=>{const items:[Theme,string,string,string][]=[['classic','☀️','Light Mode','Bright bakery · Fresh and classic'],['honey','🍯','Honey Gold','Warm cocoa · Golden highlights'],['emerald','💚','Emerald Green','Deep green · Premium glow'],['purple','💜','Electric Purple','Dark mode · Neon violet accents']];return <div className="sub-screen"><Nav title="Themes & Appearance"/><p className="theme-note">Choose an appearance. Every screen, game tile and menu updates together.</p><div className="theme-grid">{items.map(([id,icon,name,desc])=><button type="button" aria-pressed={p.theme===id} className={'theme-card theme-'+id+' '+(p.theme===id?'active':'')} key={id} onClick={()=>commit({theme:id})}><span className="theme-preview-icon">{icon}</span><b>{name}</b><small>{p.theme===id?'✓ Currently selected':'Tap to apply'}</small><em>{desc}</em></button>)}</div></div>};
  const Worlds=()=> <div className="sub-screen"><Nav title="Bakery Worlds"/>{WORLDS.map(([name,emoji,a,b])=>{const unlocked=p.level>=a;return <div className="world-card" key={name}><span>{emoji}</span><div><b>{name}</b><small>Levels {a+1}–{b+1}</small></div><button disabled={!unlocked} onClick={()=>begin(a)}>{unlocked?'Play':'🔒'}</button></div>})}</div>;
  const Profile=()=> <div className="sub-screen"><Nav title="Profile & Stats"/><div className="profile-card">{mascot('👨‍🍳')}<h2>Word Bites Player</h2><p>Level {p.level+1} · 🔥 {p.streak} day streak</p></div><div className="stat-grid">{[['Levels',p.completed.length],['Words',p.wordsFound],['Bonus',p.bonus.length],['Longest',p.longest||'—'],['Best streak',p.bestStreak],['Coins',p.coins],['Perfect',p.perfect],['Event',p.eventWords]].map(([a,b])=><div key={String(a)}><b>{b}</b><span>{a}</span></div>)}</div><div className="account-card">☁️ <b>Word Bites Account</b><small>Level {p.level+1} · ⭐ {Object.values(p.stars).reduce((a,b)=>a+b,0)} · 🔥 {p.streak} · 🪙 {p.coins}</small><button onClick={()=>setMessage('Cloud accounts will preserve this profile across devices when enabled.')}>Cloud sync</button></div></div>;
  const Achievements=()=> <div className="sub-screen"><Nav title="Achievements"/>{[['🏆','First Word','Find your first word'],['🔥','10-Day Streak','Play 10 days in a row'],['🧠','100 Words Found','Discover 100 words'],['💎','50 Bonus Words','Find 50 bonus words'],['👑','Complete 100 Levels','Master 100 levels'],['⭐','Perfect Level','Finish with 3 stars'],['🎯','No Mistakes','Finish a puzzle with no invalid words']].map(([icon,name,desc])=><div className={'achievement '+(p.achievements.includes(name)|| (name==='No Mistakes'&&p.noMistakes>0)?'earned':'')} key={name}><span>{icon}</span><div><b>{name}</b><small>{desc}</small></div><span>{p.achievements.includes(name)||(name==='No Mistakes'&&p.noMistakes>0)?'✓':'🔒'}</span></div>)}</div>;
  const Dictionary=()=> <div className="sub-screen"><Nav title="Word Dictionary"/><div className="dictionary-intro">Tap discovered words during a puzzle to review them here.</div><div className="dictionary-list">{[...new Set(p.solved.map(x=>x.split(':')[1]).concat(p.bonus.map(x=>x.split(':')[1])))].slice(-80).reverse().map(w=><button key={w} onClick={()=>setDictionaryWord(w)}><b>{w}</b><small>{w.length} letters · discovered</small></button>)}</div>{dictionaryWord&&<div className="dictionary-pop"><button onClick={()=>setDictionaryWord('')}><X/></button><b>{dictionaryWord}</b><small>{dictionaryWord.length>=5?'Noun / verb — a discovered word worth remembering.':'Common word — keep exploring related forms.'}</small></div>}</div>;
  const Event=()=>{const goal=eventGoal();const progress=Math.min(goal,p.eventWords);return <div className="sub-screen"><Nav title="Word Bites Events"/><div className="event-hero"><div>🍪</div><p className="eyebrow">WEEKEND BAKE-OFF</p><h2>Find {goal} words this event.</h2><div className="event-progress"><i style={{width:progress/goal*100+'%'}}/></div><b>{progress}/{goal}</b><p>Reward: 🪙 500 Coins + 🏅 Special Badge</p>{progress>=goal?<button className="primary big" onClick={()=>{if(!p.achievements.includes('Weekend Bake-Off'))commit({coins:p.coins+500,achievements:[...p.achievements,'Weekend Bake-Off']});}}>Claim reward</button>:<button className="primary big" onClick={()=>begin(p.level)}>Bake words</button>}</div></div>};

  const content=screen==='home'?<HomeScreen/>:screen==='game'||screen==='daily'?<GameScreen/>:screen==='worlds'?<Worlds/>:screen==='profile'?<Profile/>:screen==='achievements'?<Achievements/>:screen==='settings'?<SettingsScreen/>:screen==='themes'?<Themes/>:screen==='dictionary'?<Dictionary/>:<Event/>;
  return <main className={'app '+themeClass+' text-'+p.settings.textSize} data-theme={activeTheme}>{content}</main>;
}
export default App;