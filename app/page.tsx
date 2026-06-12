"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// --- Types ---
interface Club { id: string; name: string; country?: string; }
interface Player { id: any; name: string; nationality: string; imageUrl?: string; dateOfBirth?: string; }
interface Era { start: number; end: number; display: string; }
interface ChainLink { player: Player; fromClub: Club; toClub: Club; rarity: number; appearances: number; anchorEra: Era; isUnderdog: boolean; }
interface GameStats { played: number; won: number; currentStreak: number; maxStreak: number; }

const MAX_LINKS = 7;

// ============================================================================
// --- TIER 1: MAJOR CLUBS -> 1-Year Strict Constraint ---
// (Current Top Premier League + Absolute Global Powerhouses)
// ============================================================================
const TIER_1_MAJOR = [
  "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United", 
  "Tottenham Hotspur", "Aston Villa", "Newcastle United", 
  "Real Madrid", "Barcelona", "Bayern Munich", "Paris Saint-Germain"
];

// ============================================================================
// --- TIER 2: MODERATE CLUBS -> 5-Year Forgiving Constraint ---
// (Other CL Winners + Top 3 from Top 5 European Leagues)
// ============================================================================
const TIER_2_MODERATE = [
  "AC Milan", "Inter Milan", "Juventus", "Borussia Dortmund", "Hamburger SV",
  "Ajax", "Feyenoord", "PSV Eindhoven", "Benfica", "FC Porto",
  "Nottingham Forest", "Celtic", "Marseille", "Red Star Belgrade", "Steaua Bucuresti",
  "Atletico Madrid", "Napoli", "Bayer Leverkusen", "RB Leipzig", 
  "Olympique Lyonnais", "AS Monaco", "LOSC Lille"
];

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

const TARGETABLE_CLUBS: Club[] = [...TIER_1_MAJOR, ...TIER_2_MODERATE].map(name => ({ id: name, name }));

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
    "Flamengo": "from-red-600 to-black text-white border-red-500/50",
    "Aston Villa": "from-[#38003c] to-[#95BFE5] text-white border-[#95BFE5]/50",
    "Tottenham Hotspur": "from-slate-100 to-white text-slate-900 border-indigo-900",
    "Newcastle United": "from-gray-900 to-black text-white border-white/50"
  };

  if (styles[clubName]) return styles[clubName];

  const vibrantGradients = [
    "from-emerald-500 to-teal-700 text-white border-emerald-400/50",
    "from-rose-500 to-red-700 text-white border-rose-400/50",
    "from-amber-400 to-orange-600 text-slate-900 border-amber-300/50",
    "from-violet-600 to-purple-800 text-white border-violet-400/50",
    "from-sky-400 to-blue-600 text-white border-sky-300/50",
    "from-fuchsia-500 to-pink-700 text-white border-fuchsia-400/50",
    "from-lime-400 to-green-600 text-slate-900 border-lime-300/50",
    "from-indigo-500 to-blue-800 text-white border-indigo-400/50"
  ];

  let hash = 0;
  for (let i = 0; i < clubName.length; i++) {
    hash = clubName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % vibrantGradients.length;
  
  return vibrantGradients[index];
};

const getCanonicalName = (rawName: string) => {
  if (!rawName) return "";
  let lower = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  if (lower.includes("tottenham") || lower === "spurs") return "Tottenham Hotspur";
  if (lower.includes("sheff utd") || lower.includes("sheffield utd") || lower === "sheffield") return "Sheffield United";
  if (lower.includes("man city") || lower.includes("mancity") || (lower.includes("manchester") && lower.includes("city"))) return "Manchester City";
  if (lower.includes("man utd") || lower.includes("man united") || lower.includes("mufc") || (lower.includes("manchester") && lower.includes("united"))) return "Manchester United";
  if (lower.includes("nottm forest") || lower.includes("nottingham")) return "Nottingham Forest";
  if (lower.includes("wolverhampton") || lower === "wolves") return "Wolverhampton Wanderers";
  if (lower.includes("brighton") || lower.includes("hove albion")) return "Brighton & Hove Albion";
  if (lower.includes("west ham")) return "West Ham United";
  if (lower.includes("newcastle") && !lower.includes("jets")) return "Newcastle United";
  if (lower.includes("aston villa") || lower === "villa") return "Aston Villa";
  if (lower.includes("leicester")) return "Leicester City";
  if (lower.includes("leeds")) return "Leeds United";
  if (lower.includes("crystal palace")) return "Crystal Palace";
  if (lower.includes("qpr") || lower.includes("queens park")) return "Queens Park Rangers";
  
  if (lower.includes("m'gladbach") || lower.includes("monchengladbach")) return "Borussia Mönchengladbach";
  if (lower.includes("psg") || lower.includes("paris sg") || lower.includes("paris saint")) return "Paris Saint-Germain";
  if (lower.includes("bayern") && (lower.includes("munich") || lower.includes("munchen") || lower === "fc bayern")) return "Bayern Munich";
  if (lower === "juve" || lower.includes("juventus")) return "Juventus";
  if (lower === "inter" || lower.includes("inter milan") || lower.includes("internazionale")) return "Inter Milan";
  if (lower === "milan" || lower.includes("ac milan") || lower.includes("acmilan")) return "AC Milan";
  if (lower.includes("atletico") && lower.includes("madrid")) return "Atletico Madrid";
  if (lower.includes("dortmund") || lower === "bvb") return "Borussia Dortmund";
  if (lower.includes("bayer leverkusen") || lower === "leverkusen") return "Bayer Leverkusen";
  if (lower.includes("lyon") && !lower.includes("boca")) return "Olympique Lyonnais";
  if (lower.includes("marseille") && !lower.includes("consolat")) return "Marseille";
  if (lower.includes("shakhtar")) return "Shakhtar Donetsk";
  if (lower.includes("sevilla") && !lower.includes("atletico")) return "Sevilla";
  if (lower.includes("sporting") && (lower.includes("cp") || lower.includes("lisbon") || lower === "sporting")) return "Sporting CP";

  let clean = rawName.trim();
  clean = clean.replace(/^(FC|CA|UD|CD|AC|AS|SV|KV|VfL|VfB|1\.\s?FC)\s+/i, "");
  clean = clean.replace(/\s+(FC|CF|UD|CD|AFC|SAD|United|City|Town|Rovers|Wanderers|Athletic|Albion)$/i, "");

  return clean.trim();
};

const standardizeClubName = (rawName: string) => {
  const canonical = getCanonicalName(rawName);
  const foundMajor = TARGETABLE_CLUBS.find(c => checkClubMatch(canonical, c.name));
  return foundMajor ? foundMajor.name : canonical;
};

const generateEraConstraint = (clubName: string): Era => {
  const canonicalName = standardizeClubName(clubName);
  const isTier1 = TIER_1_MAJOR.includes(canonicalName);
  const isTier2 = TIER_2_MODERATE.includes(canonicalName);
  
  const roll = Math.random() * 100;

  if (isTier1) {
    let startYear;
    if (roll <= 59) startYear = Math.floor(Math.random() * (2024 - 2016 + 1)) + 2016; 
    else if (roll <= 87) startYear = Math.floor(Math.random() * (2015 - 2009 + 1)) + 2009;
    else startYear = Math.floor(Math.random() * (2008 - 2003 + 1)) + 2003;
    
    return { start: startYear, end: startYear, display: String(startYear) };

  } else if (isTier2) {
    let startYear;
    if (roll <= 59) startYear = Math.floor(Math.random() * (2024 - 2016 + 1)) + 2016; 
    else if (roll <= 87) startYear = Math.floor(Math.random() * (2015 - 2009 + 1)) + 2009;
    else startYear = Math.floor(Math.random() * (2008 - 2003 + 1)) + 2003;

    const safeStart = Math.min(startYear, 2019); 
    return { start: safeStart, end: safeStart + 5, display: `${safeStart} - ${safeStart + 5}` };

  } else {
    const endYear = Math.floor(Math.random() * (2024 - 2022 + 1)) + 2022; 
    const startYear = Math.max(2003, endYear - 14); 
    
    return { start: startYear, end: endYear, display: `${startYear} - ${endYear}` };
  }
};

const checkClubMatch = (dbClub: string, targetClub: string) => {
  if (!dbClub || !targetClub) return false;
  
  const canonicalDb = getCanonicalName(dbClub).toLowerCase();
  const canonicalTarget = getCanonicalName(targetClub).toLowerCase();

  if (canonicalDb === canonicalTarget) return true;

  const baseDb = canonicalDb.replace(/[^a-z]/g, "");
  const baseTarget = canonicalTarget.replace(/[^a-z]/g, "");
  
  if (baseDb === baseTarget) return true;
  if (baseDb.includes(baseTarget) || baseTarget.includes(baseDb)) return true;
  
  return false;
};

const isValidSeniorTeam = (clubName: string) => {
  const lower = clubName.toLowerCase();
  
  if (lower.includes("without club")) return false;
  if (lower.includes("retired")) return false;
  if (lower.includes("unknown")) return false;
  if (lower.includes("career break")) return false;
  if (lower.includes("ban")) return false;

  if (/\bu\d{2}\b/.test(lower)) return false; 
  if (/\bunder[ -]?\d{2}\b/.test(lower)) return false; 
  
  if (/\byouth\b/.test(lower)) return false;
  if (/\byout\b/.test(lower)) return false; 
  if (/\byth\.?\b/.test(lower)) return false;
  if (/\breserves?\b/.test(lower)) return false;
  if (/\bacademy\b/.test(lower)) return false;
  
  if (/\bii\b/.test(lower)) return false; 
  if (/\s+b$/.test(lower)) return false; 
  if (/\bpromesas\b/.test(lower)) return false;
  if (/\bcastilla\b/.test(lower)) return false;
  if (/\bprimavera\b/.test(lower)) return false;
  
  return true;
};

const calculateSlidingScalePoints = (appearances: number) => {
  if (appearances <= 0) return 0;
  if (appearances <= 5) return 150;
  if (appearances >= 100) return 15;

  let minApps, maxApps, minPts, maxPts;

  if (appearances <= 10) {
    minApps = 6; maxApps = 10; minPts = 139; maxPts = 125;
  } else if (appearances <= 15) {
    minApps = 10; maxApps = 15; minPts = 125; maxPts = 117;
  } else if (appearances <= 20) {
    minApps = 15; maxApps = 20; minPts = 117; maxPts = 110;
  } else if (appearances <= 39) {
    minApps = 20; maxApps = 39; minPts = 110; maxPts = 80;
  } else {
    minApps = 39; maxApps = 100; minPts = 80; maxPts = 15;
  }

  const points = minPts + ((appearances - minApps) * (maxPts - minPts)) / (maxApps - minApps);
  return Math.round(points);
};

export default function Home() {
  const [gameMode, setGameMode] = useState<"DAILY" | "HARD_DAILY" | "UNLIMITED">("DAILY");
  const [startClub, setStartClub] = useState<Club>(DAILY_PUZZLE.start);
  const [targetClub, setTargetClub] = useState<Club>(DAILY_PUZZLE.target);
  
  const [showRules, setShowRules] = useState(true);
  const [showStats, setShowStats] = useState(false);
  
  const [stats, setStats] = useState<GameStats>({ played: 0, won: 0, currentStreak: 0, maxStreak: 0 });

  const [currentClub, setCurrentClub] = useState<Club>(DAILY_PUZZLE.start);
  const [anchorEra, setAnchorEra] = useState<Era>({ start: 2018, end: 2018, display: "2018" });
  const [chain, setChain] = useState<ChainLink[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [message, setMessage] = useState(""); 
  const [gameState, setGameState] = useState<"PLAYING" | "ROUTING" | "WON" | "LOST">("PLAYING");
  const [isScouting, setIsScouting] = useState(false); 
  
  const [routingPlayer, setRoutingPlayer] = useState<Player | null>(null);
  const [routingOptions, setRoutingOptions] = useState<Club[]>([]);
  
  const [activePlayerPerformances, setActivePlayerPerformances] = useState<any[]>([]);

  useEffect(() => {
    const savedStats = localStorage.getItem("pipeline_stats");
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  const updateStats = (isWin: boolean) => {
    if (gameMode === "UNLIMITED") return; 

    setStats(prev => {
      const newStats = {
        played: prev.played + 1,
        won: isWin ? prev.won + 1 : prev.won,
        currentStreak: isWin ? prev.currentStreak + 1 : 0,
        maxStreak: isWin ? Math.max(prev.maxStreak, prev.currentStreak + 1) : prev.maxStreak
      };
      localStorage.setItem("pipeline_stats", JSON.stringify(newStats));
      return newStats;
    });
  };

  const startDailyMode = () => {
    setGameMode("DAILY");
    setStartClub(DAILY_PUZZLE.start);
    setTargetClub(DAILY_PUZZLE.target);
    setCurrentClub(DAILY_PUZZLE.start);
    setAnchorEra({ start: 2018, end: 2018, display: "2018" }); 
    resetBoard();
  };

  const startHardDailyMode = () => {
    setGameMode("HARD_DAILY");
    setStartClub(HARD_DAILY_PUZZLE.start);
    setTargetClub(HARD_DAILY_PUZZLE.target);
    setCurrentClub(HARD_DAILY_PUZZLE.start);
    setAnchorEra({ start: 2014, end: 2014, display: "2014" }); 
    resetBoard();
  };

  const startUnlimitedMode = () => {
    let randomStart, randomTarget;
    do {
      randomStart = TARGETABLE_CLUBS[Math.floor(Math.random() * TARGETABLE_CLUBS.length)];
      randomTarget = TARGETABLE_CLUBS[Math.floor(Math.random() * TARGETABLE_CLUBS.length)];
    } while (randomStart.id === randomTarget.id);

    setGameMode("UNLIMITED");
    setStartClub(randomStart);
    setTargetClub(randomTarget);
    setCurrentClub(randomStart);
    setAnchorEra(generateEraConstraint(randomStart.name));
    resetBoard();
  };

  useEffect(() => {
    if (chain.length === 0 && gameMode === "DAILY") setAnchorEra({ start: 2018, end: 2018, display: "2018" });
  }, []);

  const resetBoard = () => {
    setChain([]);
    setFailedAttempts(0);
    setGameState("PLAYING");
    setMessage("");
    setSearchQuery("");
    setSearchResults([]);
    setActivePlayerPerformances([]);
    setIsScouting(false);
  };

  useEffect(() => {
    const flexScoutQuery = async () => {
      if (searchQuery.trim().length < 3 || gameState !== "PLAYING" || isScouting) {
        setSearchResults([]);
        return;
      }
      
      const cleanSearch = searchQuery.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      try {
        const { data, error } = await supabase
          .from("players")
          .select("id, player_name, country_of_birth, player_image_url, date_of_birth")
          .ilike("search_name", `%${cleanSearch}%`)
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
  }, [searchQuery, gameState, isScouting]);

  const handlePlayerSelect = async (player: Player) => {
    setMessage(""); 
    setSearchResults([]);
    setSearchQuery(""); 
    setIsScouting(true); 

    try {
      const { data: transfers, error: txError } = await supabase
        .from("all_transfers")
        .select("from_team_name, to_team_name")
        .eq("player_id", player.id)
        .limit(10000);

      if (txError) {
        setMessage(`⚠️ Transfer Fetch Error: ${txError.message}`);
        return;
      }

      if (!transfers || transfers.length === 0) {
        setMessage(`❌ ${player.name} has no career transfers in this dataset.`);
        return;
      }

      const { data: performances, error: perfError } = await supabase
        .from("player_performances")
        .select("*")
        .eq("player_id", player.id)
        .limit(10000);

      if (perfError) {
        console.error("Supabase Error:", perfError.message);
      }

      const cachedPerformances = performances || [];
      setActivePlayerPerformances(cachedPerformances);

      const playerClubNames = new Set<string>();
      
      transfers.forEach(t => { 
        if (t.from_team_name && isValidSeniorTeam(t.from_team_name)) playerClubNames.add(t.from_team_name); 
        if (t.to_team_name && isValidSeniorTeam(t.to_team_name)) playerClubNames.add(t.to_team_name); 
      });
      
      let safeTeamKey = 'team_name';
      
      if (cachedPerformances.length > 0) {
        const sampleRow = cachedPerformances[0];
        safeTeamKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase() === 'team_name') || 'team_name';
        
        cachedPerformances.forEach(p => {
          if (p[safeTeamKey]) {
            const tName = String(p[safeTeamKey]);
            if (isValidSeniorTeam(tName)) {
              playerClubNames.add(tName);
            }
          }
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

      if (cachedPerformances.length > 0) {
          const currentClubPerformances = cachedPerformances.filter(p => {
              const teamVal = p[safeTeamKey];
              return teamVal && checkClubMatch(String(teamVal), currentClub.name);
          });
          
          const sampleRow = cachedPerformances[0];
          const safePitchKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase().includes('pitch') || k.trim().toLowerCase().includes('appearances')) || 'nb_on_pitch';
          
          const totalCurrentClubApps = currentClubPerformances.reduce((sum, current) => sum + (Number(current[safePitchKey]) || 0), 0);

          if (totalCurrentClubApps <= 0) {
              setFailedAttempts(prev => prev + 1);
              setMessage(`❌ ${player.name} was at ${currentClub.name}, but registered 0 senior appearances.`);
              checkLossCondition();
              return;
          }

          const searchTerms: string[] = [];
          for (let y = anchorEra.start; y <= anchorEra.end; y++) {
              const yearStr = String(y);
              const shortStr = yearStr.slice(2);
              const nextShort = String(y + 1).slice(2);
              const prevShort = String(y - 1).slice(2);
              
              searchTerms.push(
                  yearStr,
                  `${yearStr}/${nextShort}`,
                  `${y - 1}/${shortStr}`,
                  `${shortStr}/${nextShort}`,
                  `${prevShort}/${shortStr}`,
                  `${yearStr}/${y + 1}`,
                  `${y - 1}/${yearStr}`
              );
          }

          const playedInEra = currentClubPerformances.some(p => {
              const rowString = JSON.stringify(p);
              return searchTerms.some(term => rowString.includes(term));
          });

          if (!playedInEra && currentClubPerformances.length > 0) {
              setFailedAttempts(prev => prev + 1);
              setMessage(`❌ ${player.name} played for ${currentClub.name}, but DB has no record of them there between ${anchorEra.display}.`);
              checkLossCondition();
              return;
          }
      }
      
      const destinationClubsMap = new Map<string, Club>();
      
      playerClubNames.forEach(rawClubName => {
          if (!checkClubMatch(rawClubName, currentClub.name)) {
              const canonicalName = standardizeClubName(rawClubName);
              if (!destinationClubsMap.has(canonicalName)) {
                  destinationClubsMap.set(canonicalName, { id: canonicalName, name: canonicalName });
              }
          }
      });

      const uniqueOptions = Array.from(destinationClubsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      if (uniqueOptions.length > 0) {
        setRoutingPlayer(player);
        setRoutingOptions(uniqueOptions);
        setGameState("ROUTING");
        setMessage("");
      } else {
        setMessage(`❌ ${player.name} is a dead end.`);
      }
    } catch (e) {
      setMessage("⚠️ Connection error fetching transfer pathways.");
    } finally {
      setIsScouting(false); 
    }
  };

  const handleRouteSelect = (nextClub: Club) => {
    if (!routingPlayer) return;
    
    let totalCurrentClubApps = 0;

    if (activePlayerPerformances.length > 0) {
      const sampleRow = activePlayerPerformances[0];
      const safeTeamKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase() === 'team_name') || 'team_name';
      const safePitchKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase().includes('pitch') || k.trim().toLowerCase().includes('appearances')) || 'nb_on_pitch';

      totalCurrentClubApps = activePlayerPerformances
        .filter(p => p[safeTeamKey] && checkClubMatch(String(p[safeTeamKey]), currentClub.name))
        .reduce((sum, current) => sum + (Number(current[safePitchKey]) || 0), 0);
    }

    const canonicalCurrent = standardizeClubName(currentClub.name);
    const isTier1 = TIER_1_MAJOR.includes(canonicalCurrent);
    const isTier2 = TIER_2_MODERATE.includes(canonicalCurrent);
    const isUnderdog = !isTier1 && !isTier2;

    let rarity = calculateSlidingScalePoints(totalCurrentClubApps);
    if (isUnderdog) rarity += 75; 
    
    const newChain = [
      ...chain, 
      { player: routingPlayer, fromClub: currentClub, toClub: nextClub, rarity, appearances: totalCurrentClubApps, anchorEra, isUnderdog }
    ];
    
    setChain(newChain);
    
    if (checkClubMatch(nextClub.name, targetClub.name)) {
      setCurrentClub(nextClub);
      setMessage("");
      setGameState("WON");
      updateStats(true); 
      setTimeout(() => setShowStats(true), 1500); 
    } else {
      setCurrentClub(nextClub);
      setAnchorEra(generateEraConstraint(nextClub.name)); 
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
      updateStats(false); 
      setTimeout(() => setShowStats(true), 1500); 
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

    const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'thepipeline.com';

    const text = `${header}\n⚽ ${startClub.name} ➡️ ${targetClub.name}\n\nScore: ${score} 📈\n${grid}\n\nPlay: ${currentUrl}`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const totalMovesUsed = chain.length + failedAttempts;
  const winPercentage = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center py-8 px-4 font-sans selection:bg-emerald-500/30">
      
      {/* STATS MODAL */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 p-6 md:p-8 rounded-2xl max-w-sm w-full shadow-2xl relative font-sans">
            <button 
              onClick={() => setShowStats(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-all"
            >
              ✕
            </button>
            
            <h2 className="text-xl md:text-2xl font-black text-white mb-6 tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-6 bg-cyan-500 rounded-full"></span>
              Statistics
            </h2>

            <div className="grid grid-cols-4 gap-2 text-center mb-8">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{stats.played}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Played</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{winPercentage}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Win %</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{stats.currentStreak}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Current<br/>Streak</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{stats.maxStreak}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Max<br/>Streak</span>
              </div>
            </div>

            {gameState === "WON" && (
              <button 
                onClick={() => {
                  handleShare();
                  setShowStats(false);
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm md:text-base py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest mb-3 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
              >
                Share Results
              </button>
            )}

            <button 
              onClick={() => setShowStats(false)}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold text-sm py-4 rounded-xl transition-all border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 p-6 md:p-8 rounded-2xl max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto font-sans">
            
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-all"
            >
              ✕
            </button>
            
            <h2 className="text-xl md:text-2xl font-black text-white mb-6 tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              How to Play
            </h2>
            
            <div className="space-y-6 text-slate-300 text-sm md:text-base leading-relaxed">
              
              <div className="grid gap-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <h3 className="font-bold text-white mb-1 uppercase tracking-wider text-xs text-emerald-400">The Objective</h3>
                  <p>Connect the starting club to the target club by linking players who share a career history. You have a maximum of <strong className="text-red-400">{MAX_LINKS} moves</strong>.</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <h3 className="font-bold text-white mb-1 uppercase tracking-wider text-xs text-amber-400">Dynamic Era Constraints</h3>
                  <p>The game adjusts difficulty based on club prestige:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs md:text-sm text-slate-400">
                    <li><strong className="text-slate-200">Tier 1 (Major):</strong> Exact 1-Year constraint.</li>
                    <li><strong className="text-slate-200">Tier 2 (Moderate):</strong> Forgiving 5-Year constraint.</li>
                    <li><strong className="text-slate-200">Tier 3 (Minor):</strong> Generous 15-Year Era constraint.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-white mb-3 uppercase tracking-wider text-xs text-cyan-400 border-b border-white/10 pb-2">Scoring System</h3>
                <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-400 mb-1">1 - 5 Appearances</span>
                    <span className="font-black text-white text-lg">150 pts</span>
                  </div>
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-400 mb-1">6 - 15 Appearances</span>
                    <span className="font-black text-white text-lg">139 - 117 pts</span>
                  </div>
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-400 mb-1">20 - 39 Appearances</span>
                    <span className="font-black text-white text-lg">110 - 80 pts</span>
                  </div>
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-400 mb-1">100+ Apps (Legends)</span>
                    <span className="font-black text-white text-lg">15 pts</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-r-xl">
                <h3 className="font-black text-amber-400 mb-1 uppercase tracking-wide text-sm flex items-center gap-2">
                  🔥 The Underdog Bonus
                </h3>
                <p className="text-xs text-slate-300">
                  Step off the beaten path. If you successfully name a player from a <strong>Minor League Club</strong> (outside the Major & Moderate tiers), you will earn an instant <strong className="text-amber-400">+75 Point</strong> jackpot.
                </p>
              </div>

            </div>

            <button 
              onClick={() => setShowRules(false)}
              className="mt-8 w-full bg-white hover:bg-slate-200 text-slate-950 font-black text-sm md:text-base py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest"
            >
              Enter The Pipeline
            </button>
          </div>
        </div>
      )}

      <div className="text-center mb-8 w-full max-w-md relative">
        <div className="absolute right-0 top-2 flex gap-2">
          <button 
            onClick={() => setShowStats(true)}
            className="text-slate-400 hover:text-white border border-slate-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors bg-white/5"
            title="Statistics"
          >
            📊
          </button>
          <button 
            onClick={() => setShowRules(true)}
            className="text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-lg text-sm font-bold transition-colors bg-white/5"
          >
            Rules
          </button>
        </div>

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
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider flex items-center gap-1.5">
                      <span>⚽ {link.appearances} {link.appearances === 1 ? 'App' : 'Apps'} for {link.fromClub.name}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span className="text-emerald-500">[{link.anchorEra.display === "ANY TIME" ? "ANY TIME" : link.anchorEra.display}]</span>
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg">
                    +{link.rarity} pts
                  </span>
                </div>
              </div>
              
              <div className="h-6 w-[2px] bg-emerald-500/50 my-1"></div>
              
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-md bg-gradient-to-br ${getClubStyle(link.toClub.name)} border flex items-center gap-2`}>
                <span>{link.toClub.name}</span>
                {link.isUnderdog && (
                  <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                    Underdog
                  </span>
                )}
              </div>
              
              {idx !== chain.length - 1 && <div className="h-6 w-[2px] bg-slate-700 my-1"></div>}
            </div>
          ))}
        </div>

        <div className="text-center min-h-[3rem] mb-4 flex items-center justify-center text-sm font-bold text-red-400 max-w-sm mx-auto leading-snug px-2">
          {message}
        </div>

        {gameState === "PLAYING" && (
          <div className="w-full flex flex-col gap-5">
            <div className="flex justify-center animate-in slide-in-from-bottom-2">
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-black px-5 py-2.5 rounded-xl text-sm shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center gap-2 backdrop-blur-md uppercase tracking-wide">
                {anchorEra.display === "ANY TIME" ? (
                  <>
                    <span>🌍</span>
                    <span><strong>No Time Constraint</strong></span>
                  </>
                ) : (
                  <>
                    <span>⏳</span>
                    <span>Must have played in <strong>{anchorEra.display}</strong></span>
                  </>
                )}
              </div>
            </div>
            
            {isScouting ? (
              <div className="w-full bg-white/5 border border-white/10 py-12 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent animate-[pulse_2s_ease-in-out_infinite] blur-xl"></div>
                
                <svg className="w-14 h-14 text-emerald-400 animate-bounce relative z-10 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                <p className="mt-5 text-emerald-400 font-black uppercase tracking-widest text-sm relative z-10">
                  Scanning Archives...
                </p>
              </div>
            ) : (
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
          </div>
        )}

        {gameState === "ROUTING" && routingPlayer && (
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-amber-500/30 animate-in slide-in-from-bottom-4 shadow-2xl mt-4">
            <p className="mb-4 text-center text-slate-300 text-sm">
              Select destination for <strong className="text-white">{routingPlayer.name}</strong>
            </p>
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
              {routingOptions.map((club, idx) => {
                const canonicalNext = standardizeClubName(club.name);
                const isTier1Dest = TIER_1_MAJOR.includes(canonicalNext);
                const isTier2Dest = TIER_2_MODERATE.includes(canonicalNext);
                const isDestUnderdog = !isTier1Dest && !isTier2Dest;
                
                return (
                  <button 
                    key={idx} 
                    onClick={() => handleRouteSelect(club)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-95 border-2 shadow-lg bg-gradient-to-br ${getClubStyle(club.name)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span>Travel to {club.name}</span>
                      {isDestUnderdog && (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                          Underdog
                        </span>
                      )}
                    </div>
                    <span>✈️</span>
                  </button>
                );
              })}
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