"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// --- Types ---
interface Club { id: string; name: string; country?: string; }
interface Player { id: any; name: string; nationality: string; imageUrl?: string; dateOfBirth?: string; }
interface ChainLink { player: Player; fromClub: Club; toClub: Club; rarity: number; appearances: number; }

const MAX_LINKS = 7;

// --- Game Data ---
const DAILY_PUZZLE = { 
  day: 12, 
  start: { id: "Manchester City", name: "Manchester City" }, 
  target: { id: "Juventus", name: "Juventus" } 
};

const HARD_DAILY_PUZZLE = { 
  day: 12, 
  start: { id: "Shakhtar Donetsk", name: "Shakhtar Donetsk" }, 
  target: { id: "Flamengo", name: "Flamengo" } 
};

const MAJOR_CLUBS: Club[] = [
  { id: "Manchester City", name: "Manchester City" },
  { id: "Juventus", name: "Juventus" },
  { id: "Real Madrid", name: "Real Madrid" },
  { id: "Barcelona", name: "Barcelona" },
  { id: "Chelsea", name: "Chelsea" },
  { id: "Arsenal", name: "Arsenal" },
  { id: "Manchester United", name: "Manchester United" },
  { id: "Liverpool", name: "Liverpool" },
  { id: "Bayern Munich", name: "Bayern Munich" },
  { id: "Paris Saint-Germain", name: "Paris Saint-Germain" },
  { id: "AC Milan", name: "AC Milan" },
  { id: "Inter Milan", name: "Inter Milan" },
  { id: "Borussia Dortmund", name: "Borussia Dortmund" },
  { id: "Atletico Madrid", name: "Atletico Madrid" }
];

// --- Helpers ---
const cleanPlayerName = (name: string) => {
  if (!name) return "";
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
};

const getFlag = (nationality: string) => {
  const flags: Record<string, string> = {
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Argentina": "🇦🇷", "Portugal": "🇵🇹", "Brazil": "🇧🇷",
    "France": "🇫🇷", "Germany": "🇩🇪", "Spain": "🇪🇸", "Italy": "🇮🇹",
    "Belgium": "🇧🇪", "Netherlands": "🇳🇱", "Norway": "🇳🇴", "Sweden": "🇸🇪",
    "Uruguay": "🇺🇾", "Egypt": "🇪🇬", "USA": "🇺🇸", "Switzerland": "🇨🇭",
    "Poland": "🇵🇱", "Gabon": "🇬🇦", "Chile": "🇨🇱"
  };
  return flags[nationality] || "🌍";
};

const getClubStyle = (clubName: string) => {
  const styles: Record<string, string> = {
    "Manchester City": "from-cyan-400 to-blue-500 text-white border-cyan-400/50",
    "Juventus": "from-gray-800 to-black text-white border-gray-500/50",
    "Real Madrid": "from-slate-100 to-white text-slate-900 border-amber-200",
    "Barcelona": "from-blue-800 to-red-700 text-white border-yellow-400/50",
    "Chelsea": "from-blue-600 to-blue-800 text-white border-blue-400/50",
    "Arsenal": "from-red-600 to-red-800 text-white border-amber-300/50",
    "Manchester United": "from-red-600 to-red-900 text-white border-black/50",
    "Liverpool": "from-red-500 to-red-700 text-white border-teal-400/30",
    "Bayern Munich": "from-red-600 to-red-800 text-white border-blue-900/50",
    "Paris Saint-Germain": "from-blue-900 to-blue-950 text-white border-red-500/50",
    "AC Milan": "from-red-600 to-black text-white border-gray-400/50",
    "Inter Milan": "from-blue-600 to-black text-white border-yellow-500/50",
    "Borussia Dortmund": "from-yellow-400 to-yellow-500 text-black border-black/50",
    "Atletico Madrid": "from-red-600 to-white text-slate-900 border-blue-800/50",
    "Shakhtar Donetsk": "from-orange-500 to-black text-white border-orange-400/50",
    "Flamengo": "from-red-600 to-black text-white border-red-500/50"
  };
  return styles[clubName] || "from-slate-700 to-slate-800 text-white border-slate-600";
};

// Supercharged Fuzzy Matcher
const checkClubMatch = (dbClub: string, targetClub: string) => {
  if (!dbClub || !targetClub) return false;
  
  const db = dbClub.toLowerCase().replace(/[^a-z]/g, "");
  const target = targetClub.toLowerCase().replace(/[^a-z]/g, "");
  
  if (db === target) return true;
  if (db.includes(target) || target.includes(db)) return true;

  const rawDb = dbClub.toLowerCase();
  if (targetClub === "Manchester City" && (rawDb.includes("man city") || rawDb.includes("mancity"))) return true;
  if (targetClub === "Manchester United" && (rawDb.includes("man utd") || rawDb.includes("mufc"))) return true;
  if (targetClub === "Paris Saint-Germain" && (rawDb.includes("psg") || rawDb.includes("paris sg"))) return true;
  if (targetClub === "Inter Milan" && (rawDb === "inter" || rawDb.includes("intermilan"))) return true;
  if (targetClub === "AC Milan" && (rawDb === "milan" || rawDb.includes("acmilan"))) return true;
  
  return false;
};

// Dynamic Exponential Sliding Scale Scoring Engine
const calculateSlidingScalePoints = (appearances: number) => {
  if (appearances <= 0) return 90; 
  
  const baseBaseline = 15;
  const maxBonusMultiplier = 75;
  const decayConstant = 0.04;

  const calculatedPoints = baseBaseline + maxBonusMultiplier * Math.exp(-decayConstant * appearances);
  
  return Math.round(calculatedPoints);
};

export default function Home() {
  const [gameMode, setGameMode] = useState<"DAILY" | "HARD_DAILY" | "UNLIMITED">("DAILY");
  const [startClub, setStartClub] = useState<Club>(DAILY_PUZZLE.start);
  const [targetClub, setTargetClub] = useState<Club>(DAILY_PUZZLE.target);
  const [showRules, setShowRules] = useState(true);

  const [currentClub, setCurrentClub] = useState<Club>(DAILY_PUZZLE.start);
  const [chain, setChain] = useState<ChainLink[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [message, setMessage] = useState(""); 
  const [gameState, setGameState] = useState<"PLAYING" | "ROUTING" | "WON" | "LOST">("PLAYING");
  
  const [routingPlayer, setRoutingPlayer] = useState<Player | null>(null);
  const [routingOptions, setRoutingOptions] = useState<Club[]>([]);
  
  const [activePlayerPerformances, setActivePlayerPerformances] = useState<any[]>([]);

  const startDailyMode = () => {
    setGameMode("DAILY");
    setStartClub(DAILY_PUZZLE.start);
    setTargetClub(DAILY_PUZZLE.target);
    setCurrentClub(DAILY_PUZZLE.start);
    resetBoard();
  };

  const startHardDailyMode = () => {
    setGameMode("HARD_DAILY");
    setStartClub(HARD_DAILY_PUZZLE.start);
    setTargetClub(HARD_DAILY_PUZZLE.target);
    setCurrentClub(HARD_DAILY_PUZZLE.start);
    resetBoard();
  };

  const startUnlimitedMode = () => {
    let randomStart, randomTarget;
    do {
      randomStart = MAJOR_CLUBS[Math.floor(Math.random() * MAJOR_CLUBS.length)];
      randomTarget = MAJOR_CLUBS[Math.floor(Math.random() * MAJOR_CLUBS.length)];
    } while (randomStart.id === randomTarget.id);

    setGameMode("UNLIMITED");
    setStartClub(randomStart);
    setTargetClub(randomTarget);
    setCurrentClub(randomStart);
    resetBoard();
  };

  const resetBoard = () => {
    setChain([]);
    setFailedAttempts(0);
    setGameState("PLAYING");
    setMessage("");
    setSearchQuery("");
    setSearchResults([]);
    setActivePlayerPerformances([]);
  };

  useEffect(() => {
    const flexScoutQuery = async () => {
      if (searchQuery.trim().length < 3 || gameState !== "PLAYING") {
        setSearchResults([]);
        return;
      }
      
      const cleanSearch = searchQuery.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      try {
        const { data, error } = await supabase
          .from("players")
          .select("id, player_name, country_of_birth, player_image_url, date_of_birth")
          .ilike("search_name", `%${cleanSearch}%`)
          // FIX: Changed nullsLast to nullsFirst: false to satisfy TypeScript!
          .order("date_of_birth", { ascending: true, nullsFirst: false }) 
          .limit(20);

        if (error) {
          setMessage(`⚠️ Search Error: ${error.message}`);
          return;
        }

        if (data) {
          setSearchResults(data.map(p => ({
            id: p.id, 
            name: cleanPlayerName(p.player_name), 
            nationality: p.country_of_birth || "Unknown",
            imageUrl: p.player_image_url,
            dateOfBirth: p.date_of_birth
          })));
        }
      } catch (e) {
        setMessage("⚠️ Connection error while searching.");
      }
    };
    const delay = setTimeout(() => flexScoutQuery(), 400);
    return () => clearTimeout(delay);
  }, [searchQuery, gameState]);

  const handlePlayerSelect = async (player: Player) => {
    setMessage(`Scouting ${player.name}...`);
    setSearchResults([]);
    setSearchQuery(""); 

    try {
      const { data: transfers, error: txError } = await supabase
        .from("all_transfers")
        .select("from_team_name, to_team_name")
        .eq("player_id", player.id);

      if (txError) {
        setMessage(`⚠️ Transfer Fetch Error: ${txError.message}`);
        return;
      }

      if (!transfers || transfers.length === 0) {
        setMessage(`❌ ${player.name} has no career transfers in this dataset.`);
        return;
      }

      // Fast, direct ID match using ALL columns to avoid CSV spacing bugs
      const { data: performances, error: perfError } = await supabase
        .from("player_performances")
        .select("*")
        .eq("player_id", player.id);

      if (perfError) {
        console.error("Supabase Error:", perfError.message);
      }

      const cachedPerformances = performances || [];
      setActivePlayerPerformances(cachedPerformances);

      const playerClubNames = new Set<string>();
      transfers.forEach(t => { 
        if (t.from_team_name) playerClubNames.add(t.from_team_name); 
        if (t.to_team_name) playerClubNames.add(t.to_team_name); 
      });
      
      if (cachedPerformances.length > 0) {
        const sampleRow = cachedPerformances[0];
        const safeTeamKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase() === 'team_name') || 'team_name';
        cachedPerformances.forEach(p => {
          if (p[safeTeamKey]) playerClubNames.add(String(p[safeTeamKey]));
        });
      }

      let playedForCurrentClub = false;
      for (const club of playerClubNames) {
        if (checkClubMatch(club, currentClub.name)) {
          playedForCurrentClub = true;
          break;
        }
      }

      if (!playedForCurrentClub) {
        setFailedAttempts(prev => prev + 1);
        const knownClubs = Array.from(playerClubNames).slice(0, 3).join(", ");
        setMessage(`❌ Incorrect. DB says ${player.name} played for: ${knownClubs}... but not ${currentClub.name}.`);
        checkLossCondition();
        return;
      }
      
      const destinationClubs: Club[] = [];
      playerClubNames.forEach(clubName => {
          if (!checkClubMatch(clubName, currentClub.name)) {
              destinationClubs.push({ id: clubName, name: clubName });
          }
      });

      if (destinationClubs.length > 0) {
        setRoutingPlayer(player);
        const uniqueClubs = Array.from(new Set(destinationClubs.map(c => c.name))).map(name => ({id: name, name}));
        setRoutingOptions(uniqueClubs);
        setGameState("ROUTING");
        setMessage("");
      } else {
        setMessage(`❌ ${player.name} is a dead end.`);
      }
    } catch (e) {
      setMessage("⚠️ Connection error fetching transfer pathways.");
    }
  };

  const handleRouteSelect = (nextClub: Club) => {
    if (!routingPlayer) return;
    
    let totalDestinationApps = 0;

    if (activePlayerPerformances.length > 0) {
      const sampleRow = activePlayerPerformances[0];
      const safeTeamKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase() === 'team_name') || 'team_name';
      const safePitchKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase().includes('pitch') || k.trim().toLowerCase().includes('appearances')) || 'nb_on_pitch';

      totalDestinationApps = activePlayerPerformances
        .filter(p => p[safeTeamKey] && checkClubMatch(String(p[safeTeamKey]), nextClub.name))
        .reduce((sum, current) => sum + (Number(current[safePitchKey]) || 0), 0);
    }

    const rarity = calculateSlidingScalePoints(totalDestinationApps);
    
    const newChain = [
      ...chain, 
      { player: routingPlayer, fromClub: currentClub, toClub: nextClub, rarity, appearances: totalDestinationApps }
    ];
    
    setChain(newChain);
    
    if (checkClubMatch(nextClub.name, targetClub.name)) {
      setCurrentClub(nextClub);
      setMessage("");
      setGameState("WON");
    } else {
      setCurrentClub(nextClub);
      setGameState("PLAYING");
      checkLossCondition();
    }
    
    setRoutingPlayer(null);
    setMessage("");
  };

  const checkLossCondition = () => {
    if (chain.length + failedAttempts + 1 >= MAX_LINKS && gameState !== "WON") {
      setGameState("LOST");
      setMessage("");
    }
  };

  const calculateScore = () => {
    const baseScore = chain.reduce((sum, link) => sum + link.rarity, 0);
    const multiplier = chain.length; 
    return baseScore * Math.max(1, multiplier);
  };

  const handleShare = () => {
    const score = calculateScore();
    const grid = Array(MAX_LINKS).fill("⬛").map((_, i) => i < chain.length ? "🟩" : "⬛").join("");
    
    let header = "";
    if (gameMode === "DAILY") header = `The Pipeline #${DAILY_PUZZLE.day}`;
    else if (gameMode === "HARD_DAILY") header = `The Pipeline [HARDCORE] #${HARD_DAILY_PUZZLE.day} 🩸`;
    else header = `The Pipeline (Unlimited Mode)`;

    const text = `${header}\n⚽ ${startClub.name} ➡️ ${targetClub.name}\n\nScore: ${score} 📈\n${grid}\n\nPlay: thepipeline.com`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const totalMovesUsed = chain.length + failedAttempts;

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center py-8 px-4 font-sans selection:bg-emerald-500/30">
      
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white text-xl transition-colors"
            >
              ✕
            </button>
            
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6 tracking-tight uppercase">
              How to Play
            </h2>
            
            <div className="space-y-5 text-slate-300 font-medium text-sm sm:text-base">
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 text-xs shrink-0 mt-0.5">1</div>
                  <p><strong className="text-white">Connect the Clubs:</strong> Link the starting giant to the target squad using valid shared player careers.</p>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 text-xs shrink-0 mt-0.5">2</div>
                  <p><strong className="text-white">Route their History:</strong> Search a baller from your active club, then select which team to travel to based on their real career record.</p>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 text-xs shrink-0 mt-0.5">3</div>
                  <p><strong className="text-white">Watch Your Links:</strong> You have a hard ceiling of <strong className="text-red-400">{MAX_LINKS} total moves</strong>. Wrong guesses burn a slot instantly!</p>
                </div>
              </div>

              <hr className="border-slate-800 my-1" />

              <div className="bg-gradient-to-br from-amber-950/30 to-cyan-950/30 border border-amber-500/20 rounded-2xl p-5 space-y-2.5">
                <h3 className="text-amber-400 font-black text-base uppercase tracking-wider flex items-center gap-2">
                  <span>📈</span> The Obscurity Sliding Scale
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Points are calculated dynamically on a rolling mathematical curve based on the player's history at the destination club:
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside pl-1">
                  <li><strong className="text-amber-300">0 - 1 Match Appearances:</strong> Maximizes the curve yielding <strong className="text-white">+90 points</strong>.</li>
                  <li><strong className="text-amber-200">15 - 30 Appearances:</strong> Smoothly drops down giving <strong className="text-white">~56 to 37 points</strong>.</li>
                  <li><strong className="text-cyan-400">100+ Appearances (Legends):</strong> Flattens down to a steady baseline reward of <strong className="text-white">15 points</strong>.</li>
                </ul>
                <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-800/60">
                  💡 Strategy Tip: Chaining longer paths increases your multiplier, but hunting down forgotten short-term spells breaks the high score board!
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowRules(false)}
              className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-lg py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.99]"
            >
              Enter The Pipeline
            </button>
          </div>
        </div>
      )}

      <div className="text-center mb-8 w-full max-w-md relative">
        <button 
          onClick={() => setShowRules(true)}
          className="absolute right-0 top-2 text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
        >
          Rules
        </button>

        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tighter mb-4 mt-8">
          THE PIPELINE
        </h1>
        
        <div className="flex bg-white/5 rounded-xl p-1 mb-4 border border-white/10 gap-1">
          <button 
            onClick={startDailyMode}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${gameMode === "DAILY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            Daily
          </button>
          <button 
            onClick={startHardDailyMode}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${gameMode === "HARD_DAILY" ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            Hardcore
          </button>
          <button 
            onClick={startUnlimitedMode}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${gameMode === "UNLIMITED" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            Unlimited
          </button>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 backdrop-blur-sm">
          <span>
            {gameMode === "DAILY" ? `Puzzle #${DAILY_PUZZLE.day}` : 
             gameMode === "HARD_DAILY" ? `Hardcore #${HARD_DAILY_PUZZLE.day}` : 
             "Random Draw"}
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span className={`${totalMovesUsed >= MAX_LINKS - 1 ? 'text-red-400' : 'text-emerald-400'}`}>
            Links: {totalMovesUsed}/{MAX_LINKS}
          </span>
        </div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="flex justify-between items-center mb-10 px-2">
          <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold shadow-xl bg-gradient-to-br ${getClubStyle(startClub.name)} border-2`}>
            {startClub.name}
          </div>
          <div className="flex-1 flex items-center justify-center px-4 opacity-50">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>
          </div>
          <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold shadow-xl bg-gradient-to-br ${getClubStyle(targetClub.name)} border-2`}>
            {targetClub.name}
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {chain.map((link, idx) => (
            <div key={idx} className="animate-in slide-in-from-top-4 fade-in duration-500 flex flex-col items-center">
              <div className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 p-4 rounded-2xl flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                  {link.player.imageUrl ? (
                    <img src={link.player.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-800" />
                  ) : (
                    <span className="text-2xl">{getFlag(link.player.nationality)}</span>
                  )}
                  
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-100 leading-tight">{link.player.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                      ⚽ {link.appearances} {link.appearances === 1 ? 'App' : 'Apps'} at destination
                    </span>
                  </div>
                </div>
                
                <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg">
                  +{link.rarity}
                </span>
              </div>
              
              <div className="h-6 w-[2px] bg-emerald-500/50 my-1"></div>
              
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-md bg-gradient-to-br ${getClubStyle(link.toClub.name)} border`}>
                {link.toClub.name}
              </div>
              
              {idx !== chain.length - 1 && <div className="h-6 w-[2px] bg-slate-700 my-1"></div>}
            </div>
          ))}
        </div>

        <div className="text-center h-8 mb-2 flex items-center justify-center text-sm font-medium text-amber-400/90">
          {message}
        </div>

        {gameState === "PLAYING" && (
          <div className="relative animate-in fade-in duration-300">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">🔍</div>
            <input
              type="text"
              placeholder={`Search players from ${currentClub.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:border-emerald-500 focus:bg-white/10 focus:ring-1 focus:ring-emerald-500 transition-all outline-none shadow-2xl placeholder:text-slate-500"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-20 w-full bg-[#151b2b] border border-white/10 rounded-2xl mt-2 shadow-2xl overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto">
                {searchResults.map((player) => (
                  <li 
                    key={player.id} 
                    onClick={() => handlePlayerSelect(player)} 
                    className="px-5 py-4 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-800" />
                    ) : (
                      <span className="text-xl">{getFlag(player.nationality)}</span>
                    )}
                    
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-medium leading-tight">{player.name}</span>
                      {player.dateOfBirth && (
                        <span className="text-slate-500 text-xs font-semibold">Born: {player.dateOfBirth}</span>
                      )}
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {gameState === "ROUTING" && routingPlayer && (
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-amber-500/30 animate-in slide-in-from-bottom-4 shadow-2xl">
            <p className="mb-4 text-center text-slate-300 text-sm">
              Select destination for <strong className="text-white">{routingPlayer.name}</strong>
            </p>
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
              {routingOptions.map((club, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleRouteSelect(club)}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-95 border-2 shadow-lg bg-gradient-to-br ${getClubStyle(club.name)}`}
                >
                  <span>Travel to {club.name}</span>
                  <span>✈️</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === "WON" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-3xl flex flex-col items-center mt-4 animate-in zoom-in duration-500 backdrop-blur-md">
            <div className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Final Score</div>
            <div className="text-6xl font-black text-white mb-2">{calculateScore()}</div>
            <p className="text-emerald-300/70 text-sm font-medium mb-8">
              Completed in {chain.length} links ({chain.length}x Multiplier)
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={handleShare} 
                className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-slate-950 font-black py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] transform hover:-translate-y-1"
              >
                Share
              </button>
              {gameMode === "UNLIMITED" && (
                <button 
                  onClick={startUnlimitedMode} 
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-4 rounded-xl transition-all"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        )}

        {gameState === "LOST" && (
          <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center mt-4 animate-in zoom-in backdrop-blur-md">
            <div className="text-4xl mb-4">💀</div>
            <div className="text-xl font-black text-white mb-6 text-center">The Pipeline Burst.</div>
            <button 
              onClick={() => {
                if (gameMode === "DAILY") startDailyMode();
                else if (gameMode === "HARD_DAILY") startHardDailyMode();
                else startUnlimitedMode();
              }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </main>
  );
}