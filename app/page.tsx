"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// --- Types ---
interface Club { id: string; name: string; country?: string; }
interface Player { id: any; name: string; nationality: string; imageUrl?: string; dateOfBirth?: string; }
interface Era { start: number; end: number; display: string; }
interface ChainLink { player: Player; fromClub: Club; toClub: Club; rarity: number; appearances: number; anchorEra: Era; isUnderdog: boolean; }
interface GameStats { 
  played: number; 
  won: number; 
  currentStreak: number; 
  maxStreak: number; 
  history?: { day: number; score: number; links: number; won: boolean }[];
}

const MAX_LINKS = 7;
const ANCHOR_DATE = new Date("2026-01-01");

// ============================================================================
// --- AUTOMATED DAILY PUZZLE POOLS ---
// ============================================================================
const DAILY_POOL = [
  { start: "Manchester City", target: "Juventus" },
  { start: "Real Madrid", target: "Arsenal" },
  { start: "Chelsea", target: "Inter Milan" },
  { start: "Barcelona", target: "Liverpool" },
  { start: "Manchester United", target: "AC Milan" },
  { start: "Bayern Munich", target: "Tottenham Hotspur" },
  { start: "Paris Saint-Germain", target: "Atletico Madrid" },
  { start: "Aston Villa", target: "Borussia Dortmund" },
  { start: "Newcastle United", target: "Ajax" },
  { start: "Arsenal", target: "FC Porto" },
  { start: "Liverpool", target: "Real Madrid" },
  { start: "Juventus", target: "Chelsea" },
  { start: "AC Milan", target: "Paris Saint-Germain" },
  { start: "Inter Milan", target: "Manchester City" },
  { start: "Tottenham Hotspur", target: "Barcelona" },
  { start: "Atletico Madrid", target: "Manchester United" },
  { start: "Borussia Dortmund", target: "Bayern Munich" },
  { start: "Ajax", target: "Aston Villa" },
  { start: "FC Porto", target: "Newcastle United" },
  { start: "Chelsea", target: "Real Madrid" },
  { start: "Manchester United", target: "Juventus" },
  { start: "Arsenal", target: "Barcelona" },
  { start: "Bayern Munich", target: "Liverpool" },
  { start: "Paris Saint-Germain", target: "Manchester City" },
  { start: "Real Madrid", target: "Inter Milan" },
  { start: "Juventus", target: "Tottenham Hotspur" },
  { start: "Barcelona", target: "AC Milan" },
  { start: "Liverpool", target: "Atletico Madrid" },
  { start: "Manchester City", target: "Borussia Dortmund" },
  { start: "Inter Milan", target: "Ajax" },
  { start: "AC Milan", target: "FC Porto" },
  { start: "Tottenham Hotspur", target: "Paris Saint-Germain" },
  { start: "Atletico Madrid", target: "Bayern Munich" },
  { start: "Borussia Dortmund", target: "Chelsea" },
  { start: "Ajax", target: "Manchester United" },
  { start: "FC Porto", target: "Arsenal" },
  { start: "Aston Villa", target: "Juventus" },
  { start: "Newcastle United", target: "Real Madrid" },
  { start: "Manchester City", target: "Barcelona" },
  { start: "Liverpool", target: "Inter Milan" },
  { start: "Chelsea", target: "AC Milan" },
  { start: "Arsenal", target: "Atletico Madrid" },
  { start: "Manchester United", target: "Borussia Dortmund" },
  { start: "Bayern Munich", target: "Ajax" },
  { start: "Paris Saint-Germain", target: "FC Porto" },
  { start: "Real Madrid", target: "Tottenham Hotspur" },
  { start: "Juventus", target: "Paris Saint-Germain" },
  { start: "Barcelona", target: "Bayern Munich" },
  { start: "Inter Milan", target: "Manchester United" },
  { start: "AC Milan", target: "Arsenal" },
  { start: "Atletico Madrid", target: "Chelsea" },
  { start: "Borussia Dortmund", target: "Liverpool" },
  { start: "Ajax", target: "Manchester City" },
  { start: "FC Porto", target: "Real Madrid" },
  { start: "Tottenham Hotspur", target: "Juventus" },
  { start: "Aston Villa", target: "Barcelona" },
  { start: "Newcastle United", target: "Inter Milan" },
  { start: "Manchester City", target: "AC Milan" },
  { start: "Liverpool", target: "Paris Saint-Germain" },
  { start: "Chelsea", target: "Bayern Munich" },
  { start: "Arsenal", target: "Borussia Dortmund" },
  { start: "Manchester United", target: "Ajax" },
  { start: "Real Madrid", target: "FC Porto" },
  { start: "Juventus", target: "Atletico Madrid" },
  { start: "Barcelona", target: "Tottenham Hotspur" },
  { start: "Bayern Munich", target: "Manchester City" },
  { start: "Paris Saint-Germain", target: "Liverpool" },
  { start: "Inter Milan", target: "Chelsea" },
  { start: "AC Milan", target: "Manchester United" },
  { start: "Atletico Madrid", target: "Arsenal" },
  { start: "Borussia Dortmund", target: "Real Madrid" },
  { start: "Ajax", target: "Juventus" },
  { start: "FC Porto", target: "Barcelona" },
  { start: "Tottenham Hotspur", target: "Bayern Munich" },
  { start: "Aston Villa", target: "Paris Saint-Germain" },
  { start: "Newcastle United", target: "Inter Milan" },
  { start: "Manchester City", target: "Atletico Madrid" },
  { start: "Liverpool", target: "Borussia Dortmund" },
  { start: "Chelsea", target: "Ajax" },
  { start: "Arsenal", target: "Juventus" },
  { start: "Manchester United", target: "Real Madrid" },
  { start: "Bayern Munich", target: "Barcelona" },
  { start: "Paris Saint-Germain", target: "Chelsea" },
  { start: "Inter Milan", target: "Liverpool" },
  { start: "AC Milan", target: "Manchester City" },
  { start: "Atletico Madrid", target: "Tottenham Hotspur" },
  { start: "Borussia Dortmund", target: "Arsenal" },
  { start: "Ajax", target: "Bayern Munich" },
  { start: "FC Porto", target: "Manchester United" },
  { start: "Juventus", target: "Real Madrid" }
];

const HARDCORE_POOL = [
  { start: "Shakhtar Donetsk", target: "Flamengo" },
  { start: "Celtic", target: "Boca Juniors" },
  { start: "Marseille", target: "River Plate" },
  { start: "Benfica", target: "Sporting CP" },
  { start: "Bayer Leverkusen", target: "Napoli" },
  { start: "Roma", target: "Rangers" },
  { start: "Sevilla", target: "Ajax" },
  { start: "Villarreal", target: "Fluminense" },
  { start: "Olympique Lyonnais", target: "Galatasaray" },
  { start: "PSV Eindhoven", target: "Palmeiras" },
  { start: "Sporting CP", target: "Corinthians" },
  { start: "FC Porto", target: "Boca Juniors" },
  { start: "Flamengo", target: "Benfica" },
  { start: "Boca Juniors", target: "Marseille" },
  { start: "River Plate", target: "Bayer Leverkusen" },
  { start: "Sporting CP", target: "Roma" },
  { start: "Napoli", target: "Sevilla" },
  { start: "Rangers", target: "Villarreal" },
  { start: "Ajax", target: "Olympique Lyonnais" },
  { start: "Fluminense", target: "PSV Eindhoven" },
  { start: "Galatasaray", target: "Shakhtar Donetsk" },
  { start: "Palmeiras", target: "Celtic" },
  { start: "Corinthians", target: "FC Porto" },
  { start: "Benfica", target: "River Plate" },
  { start: "Marseille", target: "Flamengo" },
  { start: "Bayer Leverkusen", target: "Boca Juniors" },
  { start: "Roma", target: "Sporting CP" },
  { start: "Sevilla", target: "Napoli" },
  { start: "Villarreal", target: "Rangers" },
  { start: "Olympique Lyonnais", target: "Ajax" },
  { start: "PSV Eindhoven", target: "Fluminense" },
  { start: "Shakhtar Donetsk", target: "Galatasaray" },
  { start: "Celtic", target: "Palmeiras" },
  { start: "FC Porto", target: "Corinthians" },
  { start: "Flamengo", target: "Sevilla" },
  { start: "Boca Juniors", target: "Villarreal" },
  { start: "River Plate", target: "Olympique Lyonnais" },
  { start: "Sporting CP", target: "PSV Eindhoven" },
  { start: "Napoli", target: "Shakhtar Donetsk" },
  { start: "Rangers", target: "Celtic" },
  { start: "Ajax", target: "FC Porto" },
  { start: "Fluminense", target: "Flamengo" },
  { start: "Galatasaray", target: "Boca Juniors" },
  { start: "Palmeiras", target: "River Plate" },
  { start: "Corinthians", target: "Sporting CP" },
  { start: "Benfica", target: "Napoli" },
  { start: "Marseille", target: "Rangers" },
  { start: "Bayer Leverkusen", target: "Ajax" },
  { start: "Roma", target: "Fluminense" },
  { start: "Sevilla", target: "Galatasaray" },
  { start: "Villarreal", target: "Palmeiras" },
  { start: "Olympique Lyonnais", target: "Corinthians" },
  { start: "PSV Eindhoven", target: "Benfica" },
  { start: "Shakhtar Donetsk", target: "Marseille" },
  { start: "Celtic", target: "Bayer Leverkusen" },
  { start: "FC Porto", target: "Roma" },
  { start: "Flamengo", target: "Ajax" },
  { start: "Boca Juniors", target: "Fluminense" },
  { start: "River Plate", target: "Galatasaray" },
  { start: "Sporting CP", target: "Palmeiras" },
  { start: "Napoli", target: "Corinthians" },
  { start: "Rangers", target: "Benfica" },
  { start: "Ajax", target: "Marseille" },
  { start: "Fluminense", target: "Bayer Leverkusen" },
  { start: "Galatasaray", target: "Roma" },
  { start: "Palmeiras", target: "Sevilla" },
  { start: "Corinthians", target: "Villarreal" },
  { start: "Benfica", target: "Olympique Lyonnais" },
  { start: "Marseille", target: "PSV Eindhoven" },
  { start: "Bayer Leverkusen", target: "Shakhtar Donetsk" },
  { start: "Roma", target: "Celtic" },
  { start: "Sevilla", target: "FC Porto" },
  { start: "Villarreal", target: "Flamengo" },
  { start: "Olympique Lyonnais", target: "Boca Juniors" },
  { start: "PSV Eindhoven", target: "River Plate" },
  { start: "Shakhtar Donetsk", target: "Sporting CP" },
  { start: "Celtic", target: "Napoli" },
  { start: "FC Porto", target: "Rangers" },
  { start: "Flamengo", target: "Palmeiras" },
  { start: "Boca Juniors", target: "Corinthians" },
  { start: "River Plate", target: "Benfica" },
  { start: "Sporting CP", target: "Marseille" },
  { start: "Napoli", target: "Bayer Leverkusen" },
  { start: "Rangers", target: "Roma" },
  { start: "Ajax", target: "Sevilla" },
  { start: "Fluminense", target: "Villarreal" },
  { start: "Galatasaray", target: "Olympique Lyonnais" },
  { start: "Palmeiras", target: "PSV Eindhoven" },
  { start: "Corinthians", target: "Shakhtar Donetsk" },
  { start: "Benfica", target: "FC Porto" }
];

// ============================================================================
// --- CLUB TIER CONFIGURATION ---
// ============================================================================
const TIER_1_MAJOR = [
  "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United", 
  "Tottenham Hotspur", "Aston Villa", "Newcastle United", 
  "Real Madrid", "Barcelona", "Bayern Munich", "Paris Saint-Germain"
];

const TIER_2_MODERATE = [
  "West Ham United", "Brighton & Hove Albion", "Fulham", "Bournemouth", "Crystal Palace", "Brentford",
  "Juventus", "AC Milan", "Inter Milan",
  "Atletico Madrid", "Sevilla", "Real Sociedad",
  "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig",
  "Olympique Lyonnais", "Marseille", "AS Monaco",
  "Ajax", "FC Porto", "Sporting CP", "Celtic", "Rangers"
];

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

// --- DYNAMIC VIBRANT COLOR ENGINE ---
const getClubStyle = (clubName: string) => {
  const styles: Record<string, string> = {
    "Manchester City": "from-[#6CABDD] to-[#1C2C5B] text-white border-[#6CABDD]/50",
    "Arsenal": "from-[#EF0107] to-[#9C0004] text-white border-white/50",
    "Liverpool": "from-[#C8102E] to-[#8A0A1F] text-white border-[#00B2A9]/50",
    "Chelsea": "from-[#034694] to-[#022A59] text-white border-white/50",
    "Manchester United": "from-[#DA291C] to-[#000000] text-white border-[#FBE122]/50",
    "Tottenham Hotspur": "from-white to-slate-200 text-[#132257] border-[#132257]",
    "Aston Villa": "from-[#670E36] to-[#95BFE5] text-white border-[#95BFE5]/50", 
    "Newcastle United": "from-black to-gray-800 text-white border-white",
    "Real Madrid": "from-white to-slate-100 text-slate-900 border-[#FEBE10]",
    "Barcelona": "from-[#004D98] to-[#A50044] text-white border-[#EDBB00]/50",
    "Bayern Munich": "from-[#DC052D] to-[#98041F] text-white border-white/50",
    "Paris Saint-Germain": "from-[#004170] to-[#002B4A] text-white border-[#DA291C]/50",

    "West Ham United": "from-[#7A263A] to-[#1BB1E7] text-white border-[#1BB1E7]/50",
    "Brighton & Hove Albion": "from-[#0057B8] to-white text-slate-900 border-[#0057B8]/50",
    "Fulham": "from-white to-slate-200 text-slate-900 border-black",
    "Bournemouth": "from-[#B50E12] to-black text-white border-[#B50E12]/50",
    "Crystal Palace": "from-[#1B458F] to-[#A7A5A6] text-white border-[#C4122E]/50",
    "Brentford": "from-[#E30613] to-white text-slate-900 border-black/50",
    
    "Juventus": "from-black to-gray-800 text-white border-white/50",
    "AC Milan": "from-[#FB090B] to-black text-white border-gray-400/50",
    "Inter Milan": "from-[#010E80] to-black text-white border-[#010E80]/50",
    
    "Atletico Madrid": "from-[#CB3524] to-white text-slate-900 border-[#272E61]/50",
    "Sevilla": "from-white to-slate-100 text-slate-900 border-[#D41029]",
    "Real Sociedad": "from-[#0067B1] to-white text-slate-900 border-[#0067B1]/50",
    
    "Borussia Dortmund": "from-[#FDE100] to-[#E6C600] text-black border-black",
    "Bayer Leverkusen": "from-[#E32221] to-black text-white border-[#E32221]/50",
    "RB Leipzig": "from-white to-slate-200 text-[#002D54] border-[#D60C2A]",
    
    "Olympique Lyonnais": "from-white to-slate-100 text-[#003876] border-[#DA291C]/50",
    "Marseille": "from-[#00B9F1] to-white text-slate-900 border-[#00B9F1]/50",
    "AS Monaco": "from-[#E32219] to-white text-slate-900 border-[#E32219]/50",
    
    "Ajax": "from-[#D2122E] to-white text-slate-900 border-[#D2122E]/50",
    "FC Porto": "from-[#00428C] to-white text-slate-900 border-[#00428C]/50",
    "Sporting CP": "from-[#008057] to-white text-slate-900 border-[#008057]/50",
    "Celtic": "from-[#005C3B] to-white text-slate-900 border-[#005C3B]/50",
    "Rangers": "from-[#1B458F] to-[#14336B] text-white border-[#E30613]/50",

    "Shakhtar Donetsk": "from-[#FC4C02] to-black text-white border-[#FC4C02]/50",
    "Flamengo": "from-[#C90E10] to-black text-white border-[#C90E10]/50",
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

const isMajorOrModerate = (name: string) => {
    const canonical = standardizeClubName(name);
    return TIER_1_MAJOR.includes(canonical) || TIER_2_MODERATE.includes(canonical);
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
  if (lower.includes("without club") || lower.includes("retired") || lower.includes("unknown") || lower.includes("career break") || lower.includes("ban")) return false;
  if (/\bu\d{2}\b/.test(lower) || /\bunder[ -]?\d{2}\b/.test(lower)) return false; 
  if (/\byouth\b/.test(lower) || /\byout\b/.test(lower) || /\byth\.?\b/.test(lower) || /\breserves?\b/.test(lower) || /\bacademy\b/.test(lower)) return false;
  if (/\bii\b/.test(lower) || /\s+b$/.test(lower) || /\bpromesas\b/.test(lower) || /\bcastilla\b/.test(lower) || /\bprimavera\b/.test(lower)) return false;
  return true;
};

const calculateSlidingScalePoints = (appearances: number) => {
  if (appearances <= 0) return 0;
  if (appearances <= 5) return 150;
  if (appearances >= 100) return 15;
  let minApps, maxApps, minPts, maxPts;
  if (appearances <= 10) { minApps = 6; maxApps = 10; minPts = 139; maxPts = 125; }
  else if (appearances <= 15) { minApps = 10; maxApps = 15; minPts = 125; maxPts = 117; }
  else if (appearances <= 20) { minApps = 15; maxApps = 20; minPts = 117; maxPts = 110; }
  else if (appearances <= 39) { minApps = 20; maxApps = 39; minPts = 110; maxPts = 80; }
  else { minApps = 39; maxApps = 100; minPts = 80; maxPts = 15; }
  return Math.round(minPts + ((appearances - minApps) * (maxPts - minPts)) / (maxApps - minApps));
};

const getLiveScore = (chainList: ChainLink[]) => {
  const baseScore = chainList.reduce((sum, link) => sum + link.rarity, 0);
  const multiplier = Math.max(1, chainList.length);
  return baseScore * multiplier;
};

export default function Home() {
  const [gameMode, setGameMode] = useState<"DAILY" | "HARD_DAILY" | "UNLIMITED" | "MULTIPLAYER">("DAILY");
  const [startClub, setStartClub] = useState<Club>({ id: "", name: "" });
  const [targetClub, setTargetClub] = useState<Club>({ id: "", name: "" });
  const [currentDay, setCurrentDay] = useState<number>(0);
  
  // Rules are now hardcoded to show automatically on load!
  const [showRules, setShowRules] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<GameStats>({ played: 0, won: 0, currentStreak: 0, maxStreak: 0, history: [] });

  // Standard Solo State
  const [chain, setChain] = useState<ChainLink[]>([]);
  const [anchorEra, setAnchorEra] = useState<Era>({ start: 2018, end: 2018, display: "2018" });
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [gameState, setGameState] = useState<"PLAYING" | "ROUTING" | "WON" | "LOST">("PLAYING");

  // Multiplayer State
  const [showMultiplayerSetup, setShowMultiplayerSetup] = useState(false);
  const [player1Name, setPlayer1Name] = useState("Player 1");
  const [player2Name, setPlayer2Name] = useState("Player 2");
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [multiplayerWinner, setMultiplayerWinner] = useState<string | null>(null);
  const [usedPlayerIds, setUsedPlayerIds] = useState<string[]>([]);
  const [pvpScores, setPvpScores] = useState<{p1: number, p2: number}>({p1: 0, p2: 0});
  
  const [chain1, setChain1] = useState<ChainLink[]>([]);
  const [chain2, setChain2] = useState<ChainLink[]>([]);
  const [anchorEra1, setAnchorEra1] = useState<Era>({ start: 2018, end: 2018, display: "2018" });
  const [anchorEra2, setAnchorEra2] = useState<Era>({ start: 2018, end: 2018, display: "2018" });
  const [failedAttempts1, setFailedAttempts1] = useState<number>(0);
  const [failedAttempts2, setFailedAttempts2] = useState<number>(0);
  const [p1Status, setP1Status] = useState<"PLAYING" | "FINISHED" | "LOST">("PLAYING");
  const [p2Status, setP2Status] = useState<"PLAYING" | "FINISHED" | "LOST">("PLAYING");

  // Derived Active State Accessors (Ensures NO empty club desync bugs)
  const derivedClubSolo = chain.length > 0 ? chain[chain.length - 1].toClub : startClub;
  const derivedClub1 = chain1.length > 0 ? chain1[chain1.length - 1].toClub : startClub;
  const derivedClub2 = chain2.length > 0 ? chain2[chain2.length - 1].toClub : startClub;

  const activeChain = gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? chain1 : chain2) : chain;
  const activeClub = gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? derivedClub1 : derivedClub2) : derivedClubSolo;
  const activeEra = gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? anchorEra1 : anchorEra2) : anchorEra;
  const activeFailed = gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? failedAttempts1 : failedAttempts2) : failedAttempts;

  const setActiveChain = (newChain: ChainLink[]) => {
    if (gameMode !== "MULTIPLAYER") setChain(newChain);
    else currentTurn === 1 ? setChain1(newChain) : setChain2(newChain);
  };
  const setActiveEra = (era: Era) => {
    if (gameMode !== "MULTIPLAYER") setAnchorEra(era);
    else currentTurn === 1 ? setAnchorEra1(era) : setAnchorEra2(era);
  };
  const setActiveFailed = (failed: number) => {
    if (gameMode !== "MULTIPLAYER") setFailedAttempts(failed);
    else currentTurn === 1 ? setFailedAttempts1(failed) : setFailedAttempts2(failed);
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [message, setMessage] = useState(""); 
  const [isScouting, setIsScouting] = useState(false); 
  
  const [routingPlayer, setRoutingPlayer] = useState<Player | null>(null);
  const [routingOptions, setRoutingOptions] = useState<Club[]>([]);
  const [activePlayerPerformances, setActivePlayerPerformances] = useState<any[]>([]);

  // --- INITIAL MOUNT & SAVE RESTORATION ---
  useEffect(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = Math.abs(todayMidnight.getTime() - ANCHOR_DATE.getTime());
    const dayNumber = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    setCurrentDay(dayNumber);

    const savedStats = localStorage.getItem("pipeline_stats");
    if (savedStats) setStats(JSON.parse(savedStats));

    const savedSavesStr = localStorage.getItem("pipeline_saves");
    let initialMode: "DAILY" | "HARD_DAILY" | "UNLIMITED" | "MULTIPLAYER" = "DAILY";
    
    if (savedSavesStr) {
       const savedSaves = JSON.parse(savedSavesStr);
       if (savedSaves.day === dayNumber && savedSaves.lastMode) {
           initialMode = savedSaves.lastMode;
       }
       if (savedSaves.pvpScores) {
           setPvpScores(savedSaves.pvpScores);
       }
    }

    if (initialMode === "UNLIMITED") startUnlimitedMode();
    else if (initialMode === "MULTIPLAYER") setShowMultiplayerSetup(true); 
    else loadAutomatedPuzzle(initialMode, dayNumber);
  }, []);

  const closeRules = () => {
    setShowRules(false);
  };

  // --- PERSISTENCE ENGINE ---
  useEffect(() => {
    if (!currentDay) return;
    
    const existingSaveStr = localStorage.getItem("pipeline_saves");
    let existingSave = existingSaveStr ? JSON.parse(existingSaveStr) : { day: currentDay };
    
    if (existingSave.day !== currentDay) existingSave = { day: currentDay };
    
    if (gameMode !== "UNLIMITED" && gameMode !== "MULTIPLAYER") {
        existingSave[gameMode] = { anchorEra, chain, failedAttempts, gameState };
    }
    
    existingSave.lastMode = gameMode;
    existingSave.pvpScores = pvpScores;
    localStorage.setItem("pipeline_saves", JSON.stringify(existingSave));
  }, [chain, failedAttempts, gameState, anchorEra, gameMode, currentDay, pvpScores]);

  const loadAutomatedPuzzle = (mode: "DAILY" | "HARD_DAILY", dayNum: number) => {
    const isDaily = mode === "DAILY";
    const pool = isDaily ? DAILY_POOL : HARDCORE_POOL;
    const routeIdx = (dayNum - 1) % pool.length;
    const config = pool[routeIdx];
    const sClub = { id: config.start, name: config.start };
    const tClub = { id: config.target, name: config.target };
    
    setStartClub(sClub);
    setTargetClub(tClub);
    setGameMode(mode);

    const savedStr = localStorage.getItem("pipeline_saves");
    if (savedStr) {
       const saved = JSON.parse(savedStr);
       if (saved.day === dayNum && saved[mode]) {
          const s = saved[mode];
          setAnchorEra(s.anchorEra || generateEraConstraint(config.start));
          setChain(s.chain || []);
          setFailedAttempts(s.failedAttempts || 0);
          setGameState(s.gameState || "PLAYING");
          return;
       }
    }

    setAnchorEra(generateEraConstraint(config.start));
    setChain([]);
    setFailedAttempts(0);
    setGameState("PLAYING");
    setMessage("");
    setSearchQuery("");
    setSearchResults([]);
    setIsScouting(false);
  };

  const updateStats = (isWin: boolean, finalScore: number = 0, linksUsed: number = 0) => {
    if (gameMode === "UNLIMITED" || gameMode === "MULTIPLAYER") return; 

    setStats(prev => {
      const currentHistory = prev.history || [];
      const filteredHistory = currentHistory.filter(h => h.day !== currentDay);
      const newHistory = [...filteredHistory, { day: currentDay, score: finalScore, links: linksUsed, won: isWin }];
      if (newHistory.length > 7) newHistory.shift();

      const newStats = {
        played: prev.played + 1,
        won: isWin ? prev.won + 1 : prev.won,
        currentStreak: isWin ? prev.currentStreak + 1 : 0,
        maxStreak: isWin ? Math.max(prev.maxStreak, prev.currentStreak + 1) : prev.maxStreak,
        history: newHistory
      };
      localStorage.setItem("pipeline_stats", JSON.stringify(newStats));
      return newStats;
    });
  };

  const startDailyMode = () => loadAutomatedPuzzle("DAILY", currentDay);
  const startHardDailyMode = () => loadAutomatedPuzzle("HARD_DAILY", currentDay);

  const startUnlimitedMode = () => {
    let randomStart, randomTarget;
    do {
      randomStart = TARGETABLE_CLUBS[Math.floor(Math.random() * TARGETABLE_CLUBS.length)];
      randomTarget = TARGETABLE_CLUBS[Math.floor(Math.random() * TARGETABLE_CLUBS.length)];
    } while (randomStart.id === randomTarget.id);

    setGameMode("UNLIMITED");
    const sClub = { id: randomStart.name, name: randomStart.name };
    const tClub = { id: randomTarget.name, name: randomTarget.name };
    
    setStartClub(sClub);
    setTargetClub(tClub);
    setAnchorEra(generateEraConstraint(randomStart.name));
    setChain([]);
    setFailedAttempts(0);
    setGameState("PLAYING");
    setMessage("");
    setSearchQuery("");
    setSearchResults([]);
    setIsScouting(false);
  };

  const startMultiplayerMode = () => {
    let randomStart, randomTarget;
    do {
      randomStart = TARGETABLE_CLUBS[Math.floor(Math.random() * TARGETABLE_CLUBS.length)];
      randomTarget = TARGETABLE_CLUBS[Math.floor(Math.random() * TARGETABLE_CLUBS.length)];
    } while (randomStart.id === randomTarget.id);

    setGameMode("MULTIPLAYER");
    setShowMultiplayerSetup(false);
    
    const sClub = { id: randomStart.name, name: randomStart.name };
    const tClub = { id: randomTarget.name, name: randomTarget.name };
    const startingEra = generateEraConstraint(randomStart.name);
    
    setStartClub(sClub);
    setTargetClub(tClub);
    
    setChain1([]); setChain2([]);
    setAnchorEra1(startingEra); setAnchorEra2(startingEra);
    setFailedAttempts1(0); setFailedAttempts2(0);
    setP1Status("PLAYING"); setP2Status("PLAYING");
    
    setUsedPlayerIds([]);
    setCurrentTurn(1);
    setMultiplayerWinner(null);
    setGameState("PLAYING");
    setMessage("");
    setSearchQuery("");
    setSearchResults([]);
    setIsScouting(false);
  };

  useEffect(() => {
    const flexScoutQuery = async () => {
      // Use activeClub directly. We know it will never be blank.
      if (searchQuery.trim().length < 3 || gameState !== "PLAYING" || isScouting || !activeClub?.name) {
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

        if (error) { setMessage(`⚠️ Search Error: ${error.message}`); return; }

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
  }, [searchQuery, gameState, isScouting, activeClub]);

  const checkPvPMatchEnd = (newP1Status: string, newP2Status: string, updatedActiveChain: ChainLink[]) => {
      if (newP1Status !== "PLAYING" && newP2Status !== "PLAYING") {
          let winner = null;
          const score1 = currentTurn === 1 ? getLiveScore(updatedActiveChain) : getLiveScore(chain1);
          const score2 = currentTurn === 2 ? getLiveScore(updatedActiveChain) : getLiveScore(chain2);

          if (newP1Status === "FINISHED" && newP2Status === "LOST") winner = player1Name;
          else if (newP2Status === "FINISHED" && newP1Status === "LOST") winner = player2Name;
          else if (newP1Status === "FINISHED" && newP2Status === "FINISHED") {
              if (score1 > score2) winner = player1Name;
              else if (score2 > score1) winner = player2Name;
              else winner = "Tie";
          } else {
              winner = "Nobody";
          }
          
          setMultiplayerWinner(winner);
          setGameState("WON");
          setTimeout(() => setShowStats(true), 1500);
      } else {
          // Pass turn to whoever is still active
          if (newP1Status === "PLAYING" && newP2Status !== "PLAYING") setCurrentTurn(1);
          else if (newP2Status === "PLAYING" && newP1Status !== "PLAYING") setCurrentTurn(2);
          else setCurrentTurn(prev => prev === 1 ? 2 : 1);
      }
  };

  const processFailure = (errorMsg: string) => {
      setMessage(errorMsg);
      const newFailed = activeFailed + 1;
      setActiveFailed(newFailed);
      
      const isBust = activeChain.length + newFailed >= MAX_LINKS;

      if (gameMode === "MULTIPLAYER") {
          let newP1Status = p1Status;
          let newP2Status = p2Status;

          if (isBust) {
              if (currentTurn === 1) newP1Status = "LOST";
              else newP2Status = "LOST";
          }
          if (currentTurn === 1) setP1Status(newP1Status);
          else setP2Status(newP2Status);

          checkPvPMatchEnd(newP1Status, newP2Status, activeChain);
      } else {
          if (isBust) {
              setGameState("LOST");
              updateStats(false, 0, 0);
              setTimeout(() => setShowStats(true), 1500);
          }
      }
      setIsScouting(false);
  };

  const handlePlayerSelect = async (player: Player) => {
    setMessage(""); 
    setSearchResults([]);
    setSearchQuery(""); 
    setIsScouting(true); 

    if (gameMode === "MULTIPLAYER" && usedPlayerIds.includes(String(player.id))) {
        processFailure(`❌ ${player.name} has already been chosen in this match!`);
        return;
    }

    try {
      const { data: transfers, error: txError } = await supabase
        .from("all_transfers")
        .select("from_team_name, to_team_name")
        .eq("player_id", player.id)
        .limit(10000);

      if (txError) { setMessage(`⚠️ Transfer Fetch Error: ${txError.message}`); return; }
      if (!transfers || transfers.length === 0) { 
        processFailure(`❌ ${player.name} has no career transfers in this dataset.`);
        return; 
      }

      const { data: performances } = await supabase.from("player_performances").select("*").eq("player_id", player.id).limit(10000);
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
            if (isValidSeniorTeam(tName)) playerClubNames.add(tName);
          }
        });
      }

      let playedForCurrentClub = false;
      for (const club of playerClubNames) {
        if (checkClubMatch(club, activeClub.name)) {
          playedForCurrentClub = true;
          break;
        }
      }

      if (!playedForCurrentClub) {
        const knownClubs = Array.from(playerClubNames).slice(0, 3).join(", ");
        processFailure(`❌ Incorrect. DB says ${player.name} played for: ${knownClubs}... but not ${activeClub.name}.`);
        return;
      }

      if (cachedPerformances.length > 0) {
          const currentClubPerformances = cachedPerformances.filter(p => {
              const teamVal = p[safeTeamKey];
              return teamVal && checkClubMatch(String(teamVal), activeClub.name);
          });
          
          const sampleRow = cachedPerformances[0];
          const safePitchKey = Object.keys(sampleRow).find(k => k.trim().toLowerCase().includes('pitch') || k.trim().toLowerCase().includes('appearances')) || 'nb_on_pitch';
          const totalCurrentClubApps = currentClubPerformances.reduce((sum, current) => sum + (Number(current[safePitchKey]) || 0), 0);

          if (totalCurrentClubApps <= 0) {
              processFailure(`❌ ${player.name} was at ${activeClub.name}, but registered 0 senior appearances.`);
              return;
          }

          const searchTerms: string[] = [];
          for (let y = activeEra.start; y <= activeEra.end; y++) {
              const yearStr = String(y);
              const shortStr = yearStr.slice(2);
              const nextShort = String(y + 1).slice(2);
              const prevShort = String(y - 1).slice(2);
              searchTerms.push(yearStr, `${yearStr}/${nextShort}`, `${y - 1}/${shortStr}`, `${shortStr}/${nextShort}`, `${prevShort}/${shortStr}`, `${yearStr}/${y + 1}`, `${y - 1}/${yearStr}`);
          }

          const playedInEra = currentClubPerformances.some(p => {
              const rowString = JSON.stringify(p);
              return searchTerms.some(term => rowString.includes(term));
          });

          if (!playedInEra && currentClubPerformances.length > 0) {
              processFailure(`❌ ${player.name} played for ${activeClub.name}, but DB has no record of them there between ${activeEra.display}.`);
              return;
          }
      }
      
      const destinationClubsMap = new Map<string, Club>();
      playerClubNames.forEach(rawClubName => {
          if (!checkClubMatch(rawClubName, activeClub.name)) {
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
        processFailure(`❌ ${player.name} is a dead end.`);
      }
    } catch (e) {
      processFailure("⚠️ Connection error fetching transfer pathways.");
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
        .filter(p => p[safeTeamKey] && checkClubMatch(String(p[safeTeamKey]), activeClub.name))
        .reduce((sum, current) => sum + (Number(current[safePitchKey]) || 0), 0);
    }

    const canonicalCurrent = standardizeClubName(activeClub.name);
    const isUnderdog = !isMajorOrModerate(canonicalCurrent);

    let rarity = calculateSlidingScalePoints(totalCurrentClubApps);
    if (isUnderdog) rarity += 75; 
    
    const newChain = [...activeChain, { player: routingPlayer, fromClub: activeClub, toClub: nextClub, rarity, appearances: totalCurrentClubApps, anchorEra: activeEra, isUnderdog }];
    setActiveChain(newChain);
    
    if (gameMode === "MULTIPLAYER") {
        setUsedPlayerIds(prev => [...prev, String(routingPlayer.id)]);
    }

    const reachedTarget = checkClubMatch(nextClub.name, targetClub.name);
    const isBust = (newChain.length + activeFailed >= MAX_LINKS) && !reachedTarget;

    if (gameMode === "MULTIPLAYER") {
        let newP1Status = p1Status;
        let newP2Status = p2Status;

        if (reachedTarget) {
            if (currentTurn === 1) newP1Status = "FINISHED";
            else newP2Status = "FINISHED";
            setMessage("");
            setGameState("PLAYING"); // Fixes the missing search bar bug!
        } else if (isBust) {
            if (currentTurn === 1) newP1Status = "LOST";
            else newP2Status = "LOST";
            setActiveEra(generateEraConstraint(nextClub.name));
            setGameState("PLAYING"); // Fixes the missing search bar bug!
        } else {
            setActiveEra(generateEraConstraint(nextClub.name));
            setGameState("PLAYING");
        }

        if (currentTurn === 1) setP1Status(newP1Status);
        else setP2Status(newP2Status);

        checkPvPMatchEnd(newP1Status, newP2Status, newChain);

    } else {
        // Solo Mode Logic
        if (reachedTarget) {
          setMessage("");
          setGameState("WON");
          const finalScore = newChain.reduce((sum, link) => sum + link.rarity, 0) * Math.max(1, newChain.length);
          updateStats(true, finalScore, newChain.length); 
          setTimeout(() => setShowStats(true), 1500); 
        } else if (isBust) {
          setGameState("LOST");
          updateStats(false, 0, 0);
          setTimeout(() => setShowStats(true), 1500);
        } else {
          setAnchorEra(generateEraConstraint(nextClub.name)); 
          setGameState("PLAYING");
        }
    }
    
    setRoutingPlayer(null);
    setMessage("");
  };

  const handleShare = () => {
    const targetChain = gameMode === "MULTIPLAYER" ? (multiplayerWinner === player1Name ? chain1 : chain2) : chain;
    const score = getLiveScore(targetChain);
    const grid = Array(MAX_LINKS).fill("⬛").map((_, i) => i < targetChain.length ? "🟩" : "⬛").join("");
    
    let header = "";
    if (gameMode === "MULTIPLAYER") header = `⚔️ The Pipeline: ${player1Name} vs ${player2Name} ⚔️\n🏆 ${multiplayerWinner === 'Tie' ? 'Draw' : multiplayerWinner + ' Won'}!`;
    else if (gameMode === "DAILY") header = `The Pipeline #${currentDay}`;
    else if (gameMode === "HARD_DAILY") header = `The Pipeline [HARDCORE] #${currentDay} 🩸`;
    else header = `The Pipeline (Unlimited Mode)`;

    const currentUrl = 'www.the-pipeline-beta.vercel.app';
    const text = `${header}\n⚽ ${startClub.name} ➡️ ${targetClub.name}\n${gameMode !== "MULTIPLAYER" ? `Score: ${score} 📈\n` : ''}${grid}\n\nPlay: ${currentUrl}`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const totalMovesUsed = activeChain.length + activeFailed;
  const winPercentage = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  const CompactLink = ({ link }: { link: ChainLink }) => {
    const isToUnderdog = !isMajorOrModerate(link.toClub.name);
    return (
      <div className="w-full bg-white/[0.05] backdrop-blur-sm border border-white/10 p-2 md:p-3 rounded-xl flex flex-col items-center text-center shadow-lg relative">
         {link.player.imageUrl ? (
            <img src={link.player.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-800 mb-1.5 shadow-md" />
         ) : (
            <span className="text-2xl mb-1">{getFlag(link.player.nationality)}</span>
         )}
         <span className="font-bold text-white text-[11px] md:text-xs leading-tight line-clamp-1">{link.player.name}</span>
         <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
            {link.appearances} Apps • [{link.anchorEra.display}]
         </span>
         
         <div className="h-4 w-[1px] bg-slate-600 my-1.5"></div>
         
         <div className={`px-2 py-1.5 w-full rounded-md text-[10px] md:text-xs font-bold shadow-inner bg-gradient-to-br ${getClubStyle(link.toClub.name)} border-white/20 border relative`}>
            <span className="line-clamp-1">{link.toClub.name}</span>
            {isToUnderdog && (
               <span className="absolute -top-3 right-0 bg-amber-500 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-md border border-amber-600">
                 Underdog
               </span>
            )}
         </div>
      </div>
    );
  };

  if (!startClub.name && !showMultiplayerSetup) {
    return (
      <main className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Assembling Timeline...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center py-8 px-4 font-sans tracking-tight selection:bg-emerald-500/30">
      
      {/* MULTIPLAYER SETUP MODAL */}
      {showMultiplayerSetup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-indigo-500/30 p-6 md:p-8 rounded-2xl max-w-sm w-full shadow-[0_0_40px_rgba(99,102,241,0.15)] relative font-sans">
            <button 
              onClick={() => {
                 setShowMultiplayerSetup(false);
                 if (gameMode === "MULTIPLAYER") startDailyMode(); // Fallback
              }}
              className="absolute top-5 right-5 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-all"
            >✕</button>
            <h2 className="text-xl font-black text-white mb-6 uppercase flex items-center gap-3">
               <span className="text-indigo-500 text-2xl">⚔️</span> Multiplayer Race
            </h2>
            
            <div className="flex justify-between items-center bg-white/5 border border-white/10 px-4 py-2 rounded-lg mb-4">
               <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">Series Score: <span className="text-indigo-400">{pvpScores.p1}</span> - <span className="text-rose-400">{pvpScores.p2}</span></span>
               <button 
                  onClick={() => setPvpScores({p1: 0, p2: 0})} 
                  className="text-[9px] uppercase font-black text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded border border-red-500/30"
               >
                  Reset
               </button>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
               Pass the device. Both players build distinct pipelines side-by-side. <strong>If one player uses a footballer, the other cannot.</strong> Guess a wrong or duplicate player, and you lose your turn. Highest score at the target wins.
            </p>
            <div className="flex flex-col gap-4 mb-8">
               <div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Player 1 Name</label>
                  <input value={player1Name} onChange={e => setPlayer1Name(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-indigo-500 outline-none mt-1 shadow-inner transition-all" maxLength={15} />
               </div>
               <div>
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Player 2 Name</label>
                  <input value={player2Name} onChange={e => setPlayer2Name(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-rose-500 outline-none mt-1 shadow-inner transition-all" maxLength={15} />
               </div>
            </div>
            <button onClick={startMultiplayerMode} className="w-full bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-90 text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 uppercase tracking-widest">
               Start Race
            </button>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {showStats && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowStats(false)}>
          <div className="bg-[#111827] border border-slate-800 p-6 md:p-8 rounded-2xl max-w-sm w-full shadow-2xl relative font-sans flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
               <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3"><span className="w-2 h-6 bg-cyan-500 rounded-full"></span> Statistics</h2>
               <button onClick={() => setShowStats(false)} className="text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-all">✕</button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center mb-6 shrink-0">
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

            {stats.history && stats.history.length > 0 && (
              <div className="mb-6 overflow-y-auto pr-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Last 7 Games</h3>
                <div className="space-y-2">
                  {stats.history.map((h, i) => {
                    const maxScore = Math.max(...(stats.history || []).map(x => x.score), 100);
                    const widthPercent = h.won ? Math.max(15, (h.score / maxScore) * 100) : 100;
                    return (
                      <div key={i} className="flex items-center text-xs">
                        <div className="w-12 text-slate-400 font-bold">Day {h.day}</div>
                        <div className="flex-1 ml-2">
                          <div className={`h-5 flex items-center px-2 rounded-sm ${h.won ? 'bg-emerald-500 text-slate-900 font-black' : 'bg-red-500/20 text-red-400 font-bold'}`} style={{ width: `${widthPercent}%` }}>
                            {h.won ? h.score : 'FAILED'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="pt-2 shrink-0 border-t border-slate-800 mt-auto">
               {gameState === "WON" && (
                 <button onClick={() => { handleShare(); setShowStats(false); }} className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm md:text-base py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest mb-3 shadow-[0_0_20px_rgba(52,211,153,0.2)] mt-4">
                   Share Results
                 </button>
               )}
               <button onClick={() => setShowStats(false)} className={`w-full bg-white/5 hover:bg-white/10 text-white font-bold text-sm py-4 rounded-xl transition-all border border-white/10 ${gameState !== "WON" && 'mt-4'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RULES MODAL - FIXED */}
      {showRules && (
        <div 
           className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
           onClick={closeRules}
        >
          <div 
             className="bg-[#111827] border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh] font-sans overflow-hidden"
             onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0 bg-[#111827] z-10">
               <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>How to Play
               </h2>
               <button onClick={closeRules} className="text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-all">✕</button>
            </div>
            
            {/* Scrollable Body */}
            <div className="p-6 space-y-6 text-slate-300 text-sm md:text-base leading-relaxed overflow-y-auto">
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
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between"><span className="text-slate-400 mb-1">1 - 5 Appearances</span><span className="font-black text-white text-lg">150 pts</span></div>
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between"><span className="text-slate-400 mb-1">6 - 15 Appearances</span><span className="font-black text-white text-lg">139 - 117 pts</span></div>
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between"><span className="text-slate-400 mb-1">20 - 39 Appearances</span><span className="font-black text-white text-lg">110 - 80 pts</span></div>
                  <div className="bg-[#0f141e] border border-slate-800 p-3 rounded-lg flex flex-col justify-between"><span className="text-slate-400 mb-1">100+ Apps (Legends)</span><span className="font-black text-white text-lg">15 pts</span></div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-r-xl">
                <h3 className="font-black text-amber-400 mb-1 uppercase tracking-wide text-sm flex items-center gap-2">🔥 The Underdog Bonus</h3>
                <p className="text-xs text-slate-300">Step off the beaten path. If you successfully name a player from a <strong>Minor League Club</strong> (outside the Major & Moderate tiers), you will earn an instant <strong className="text-amber-400">+75 Point</strong> jackpot.</p>
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-6 shrink-0 border-t border-slate-800 bg-[#111827] z-10 mt-auto">
               <button onClick={closeRules} className="w-full bg-white hover:bg-slate-200 text-slate-950 font-black text-sm md:text-base py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest shadow-lg">Enter The Pipeline</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER & CONTROLS */}
      <div className="text-center mb-8 w-full max-w-3xl relative px-2">
        <div className="absolute right-2 top-2 flex gap-2">
          <button onClick={() => setShowStats(true)} className="text-slate-400 hover:text-white border border-slate-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors bg-white/5" title="Statistics">📊</button>
          <button onClick={() => setShowRules(true)} className="text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-lg text-sm font-bold transition-colors bg-white/5">Rules</button>
        </div>

        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tighter mb-4 mt-8">
          THE PIPELINE
        </h1>
        
        <div className="flex bg-white/5 rounded-xl p-1 mb-2 border border-white/10 gap-1 w-full max-w-sm mx-auto">
          <button onClick={startDailyMode} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${gameMode === "DAILY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}>Daily</button>
          <button onClick={startHardDailyMode} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${gameMode === "HARD_DAILY" ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}>Hardcore</button>
          <button onClick={startUnlimitedMode} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${gameMode === "UNLIMITED" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}>Unlimited</button>
          <button onClick={() => setShowMultiplayerSetup(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${gameMode === "MULTIPLAYER" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}>Multiplayer</button>
        </div>

        <div className="flex gap-2 justify-center items-center h-8">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 backdrop-blur-sm">
            <span>
              {gameMode === "DAILY" ? `Puzzle #${currentDay}` : 
               gameMode === "HARD_DAILY" ? `Hardcore #${currentDay}` : 
               gameMode === "MULTIPLAYER" ? `Multiplayer Race` : "Unlimited"}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className={`${totalMovesUsed >= MAX_LINKS - 1 ? 'text-red-400' : 'text-emerald-400'}`}>
              Links: {totalMovesUsed}/{MAX_LINKS}
            </span>
            {gameMode !== "MULTIPLAYER" && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="text-amber-400 font-black">Score: {getLiveScore(chain)}</span>
                </>
            )}
          </div>
          
          {(gameMode === "UNLIMITED" || gameMode === "MULTIPLAYER") && gameState === "PLAYING" && (
            <button 
              onClick={gameMode === "MULTIPLAYER" ? () => setShowMultiplayerSetup(true) : startUnlimitedMode}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all active:scale-95 shadow-sm"
              title="Generate New Match"
            >🔀 Randomise</button>
          )}
        </div>
      </div>

      <div className="w-full max-w-3xl relative px-2 flex flex-col items-center">
        
        {/* ========================================================= */}
        {/* MULTIPLAYER PARALLEL SPLIT BOARD UI */}
        {/* ========================================================= */}
        {gameMode === "MULTIPLAYER" ? (
          <div className="w-full flex flex-col items-center">
            
            {/* LIVE SCOREBOARD & TURN INDICATOR */}
            <div className="w-full mb-6 max-w-lg">
              <div className="flex justify-center items-center gap-4 mb-4">
                 <div className={`flex-1 flex flex-col items-center bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-xl transition-all ${currentTurn === 1 && p1Status === "PLAYING" ? 'ring-2 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'opacity-70'}`}>
                    <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest line-clamp-1">{player1Name}</span>
                    <span className="text-2xl md:text-3xl font-black text-white">{getLiveScore(chain1)}</span>
                 </div>
                 <div className="text-slate-600 font-black text-sm md:text-base">VS</div>
                 <div className={`flex-1 flex flex-col items-center bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl transition-all ${currentTurn === 2 && p2Status === "PLAYING" ? 'ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'opacity-70'}`}>
                    <span className="text-[10px] md:text-xs font-black text-rose-400 uppercase tracking-widest line-clamp-1">{player2Name}</span>
                    <span className="text-2xl md:text-3xl font-black text-white">{getLiveScore(chain2)}</span>
                 </div>
              </div>
              
              {gameState === "PLAYING" && (
                  <div className={`w-full py-2.5 rounded-lg text-center font-black uppercase tracking-widest text-xs md:text-sm shadow-md border transition-all duration-300 ${currentTurn === 1 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-rose-500/20 text-rose-400 border-rose-500/50'}`}>
                      {currentTurn === 1 ? player1Name : player2Name}&apos;s Turn
                  </div>
              )}
            </div>

            {/* START TO TARGET GRAPHIC */}
            <div className="flex justify-between items-center mb-8 px-4 w-full max-w-lg mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2">Start Here</span>
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold shadow-xl bg-gradient-to-br ${getClubStyle(startClub.name)} border border-white/20`}>
                  <span className="text-sm md:text-base leading-tight drop-shadow-md">{startClub.name}</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center px-2 mt-6">
                <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-black mb-2 text-slate-400 text-center">Link Players To</span>
                <div className="w-full flex items-center">
                  <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/80 to-emerald-500"></div>
                  <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-emerald-500"></div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2">Target</span>
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold shadow-xl bg-gradient-to-br ${getClubStyle(targetClub.name)} border border-white/20`}>
                  <span className="text-sm md:text-base leading-tight drop-shadow-md">{targetClub.name}</span>
                </div>
              </div>
            </div>

            {/* SPLIT COLUMNS */}
            <div className="grid grid-cols-2 gap-3 md:gap-6 w-full relative mb-8 items-start">
              
              {/* Player 1 Column */}
              <div className={`flex flex-col gap-3 items-center p-2 md:p-3 rounded-2xl border-2 transition-all duration-300 ${currentTurn === 1 && p1Status === "PLAYING" ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="text-[10px] md:text-sm font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full mb-1 line-clamp-1">
                    {player1Name}
                </div>
                {p1Status === "FINISHED" && <div className="text-emerald-400 font-black text-[10px] md:text-xs uppercase bg-emerald-500/20 px-2 py-1 rounded">Finished: {getLiveScore(chain1)} pts</div>}
                {p1Status === "LOST" && <div className="text-rose-400 font-black text-[10px] md:text-xs uppercase bg-rose-500/20 px-2 py-1 rounded">Busted</div>}

                {chain1.map((link, idx) => <CompactLink key={idx} link={link} />)}
                
                {p1Status === "PLAYING" && (
                    <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-center p-1.5 font-bold shadow-lg bg-gradient-to-br ${getClubStyle(derivedClub1.name)} border-2 mt-2 ${currentTurn === 1 ? 'animate-pulse ring-2 ring-indigo-500 ring-offset-4 ring-offset-[#0B0F19]' : 'opacity-50 grayscale-[30%]'}`}>
                        <span className="text-[9px] md:text-sm leading-tight">{derivedClub1.name}</span>
                    </div>
                )}
              </div>

              {/* Player 2 Column */}
              <div className={`flex flex-col gap-3 items-center p-2 md:p-3 rounded-2xl border-2 transition-all duration-300 ${currentTurn === 2 && p2Status === "PLAYING" ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="text-[10px] md:text-sm font-black text-rose-400 uppercase tracking-widest bg-rose-500/20 px-3 py-1 rounded-full mb-1 line-clamp-1">
                    {player2Name}
                </div>
                {p2Status === "FINISHED" && <div className="text-emerald-400 font-black text-[10px] md:text-xs uppercase bg-emerald-500/20 px-2 py-1 rounded">Finished: {getLiveScore(chain2)} pts</div>}
                {p2Status === "LOST" && <div className="text-rose-400 font-black text-[10px] md:text-xs uppercase bg-rose-500/20 px-2 py-1 rounded">Busted</div>}

                {chain2.map((link, idx) => <CompactLink key={idx} link={link} />)}
                
                {p2Status === "PLAYING" && (
                    <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-center p-1.5 font-bold shadow-lg bg-gradient-to-br ${getClubStyle(derivedClub2.name)} border-2 mt-2 ${currentTurn === 2 ? 'animate-pulse ring-2 ring-rose-500 ring-offset-4 ring-offset-[#0B0F19]' : 'opacity-50 grayscale-[30%]'}`}>
                        <span className="text-[9px] md:text-sm leading-tight">{derivedClub2.name}</span>
                    </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* STANDARD SOLO BOARD UI */
          /* ========================================================= */
          <div className="w-full max-w-md flex flex-col items-center">
            
            {/* START TO TARGET GRAPHIC */}
            <div className="flex justify-between items-center mb-10 px-4 w-full max-w-lg mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2">Start Here</span>
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold shadow-xl bg-gradient-to-br ${getClubStyle(startClub.name)} border border-white/20`}>
                  <span className="text-sm md:text-base leading-tight drop-shadow-md">{startClub.name}</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center px-2 mt-6">
                <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-black mb-2 text-slate-400 text-center">Link Players To</span>
                <div className="w-full flex items-center">
                  <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/80 to-emerald-500"></div>
                  <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-emerald-500"></div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2">Target</span>
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold shadow-xl bg-gradient-to-br ${getClubStyle(targetClub.name)} border border-white/20`}>
                  <span className="text-sm md:text-base leading-tight drop-shadow-md">{targetClub.name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-8 w-full">
              {chain.map((link, idx) => {
                const isToUnderdog = !isMajorOrModerate(link.toClub.name);
                return (
                  <div key={idx} className="animate-in slide-in-from-top-4 fade-in duration-500 flex flex-col items-center w-full">
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
                            <span className="text-emerald-500">[{link.anchorEra.display}]</span>
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
                    
                    <div className={`px-4 py-1.5 w-full max-w-[200px] text-center rounded-xl text-sm font-bold shadow-md bg-gradient-to-br ${getClubStyle(link.toClub.name)} border border-white/20 flex flex-col items-center relative`}>
                      <span className="py-1 line-clamp-1">{link.toClub.name}</span>
                      {isToUnderdog && (
                        <span className="absolute -top-3 right-0 bg-amber-500 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-md border border-amber-600">
                          Underdog
                        </span>
                      )}
                    </div>
                    
                    {idx !== chain.length - 1 && <div className="h-6 w-[2px] bg-slate-700 my-1"></div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FEEDBACK MESSAGES */}
        <div className="text-center min-h-[3rem] my-6 flex items-center justify-center text-sm font-bold text-red-400 max-w-md mx-auto leading-snug px-2">
          {message}
        </div>

        {/* GAME CONTROLS & SEARCH */}
        {gameState === "PLAYING" && (
          <div className="w-full max-w-md flex flex-col gap-5">
            <div className="flex justify-center animate-in slide-in-from-bottom-2">
              <div className={`border font-black px-4 py-3 md:px-6 md:py-3 rounded-xl md:rounded-full text-[11px] md:text-sm shadow-lg flex flex-col md:flex-row items-center justify-center text-center gap-1.5 md:gap-2 backdrop-blur-md uppercase tracking-wide transition-colors w-full ${
                  gameMode === "MULTIPLAYER" 
                    ? (currentTurn === 1 ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-400' : 'bg-rose-950/80 border-rose-500/40 text-rose-400')
                    : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
              }`}>
                <span>⚽</span>
                <span>Choose a player who played for <strong>{activeClub.name}</strong> in <strong>{activeEra.display}</strong></span>
              </div>
            </div>
            
            {isScouting ? (
              <div className="w-full bg-white/5 border border-white/10 py-12 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent to-transparent animate-[pulse_2s_ease-in-out_infinite] blur-xl ${gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? 'via-indigo-500/10' : 'via-rose-500/10') : 'via-emerald-500/10'}`}></div>
                
                <svg className={`w-14 h-14 animate-bounce relative z-10 ${gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? 'text-indigo-400' : 'text-rose-400') : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                <p className={`mt-5 font-black uppercase tracking-widest text-sm relative z-10 ${gameMode === "MULTIPLAYER" ? (currentTurn === 1 ? 'text-indigo-400' : 'text-rose-400') : 'text-emerald-400'}`}>
                  Scanning Archives...
                </p>
              </div>
            ) : (
              <div className="relative animate-in fade-in duration-300">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">🔍</div>
                <input
                  type="text"
                  placeholder={`Search players from ${activeClub.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:bg-white/10 transition-all outline-none shadow-2xl placeholder:text-slate-500 ${
                      gameMode === "MULTIPLAYER" 
                          ? (currentTurn === 1 ? 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' : 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500')
                          : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  }`}
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

        {/* ROUTING MODAL */}
        {gameState === "ROUTING" && routingPlayer && (
          <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-amber-500/30 animate-in slide-in-from-bottom-4 shadow-2xl mt-4">
            <p className="mb-4 text-center text-slate-300 text-sm">
              Select destination for <strong className="text-white">{routingPlayer.name}</strong>
            </p>
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
              {routingOptions.map((club, idx) => {
                const canonicalNext = standardizeClubName(club.name);
                const isDestUnderdog = !isMajorOrModerate(canonicalNext);
                
                return (
                  <button 
                    key={idx} 
                    onClick={() => handleRouteSelect(club)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-95 border-2 shadow-lg bg-gradient-to-br ${getClubStyle(club.name)} relative`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-left text-sm md:text-base leading-tight drop-shadow-sm">{club.name}</span>
                      {isDestUnderdog && (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest flex-shrink-0">
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

        {/* GAME OVER STATES */}
        {gameState === "WON" && (
          <div className="w-full max-w-lg bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-3xl flex flex-col items-center mt-4 animate-in zoom-in duration-500 backdrop-blur-md">
            {gameMode === "MULTIPLAYER" ? (
               <>
                 <div className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Match Complete</div>
                 <div className="text-3xl md:text-5xl font-black text-white mb-2 text-center leading-tight">
                    {multiplayerWinner === "Tie" ? "It's a Draw!" : multiplayerWinner === "Nobody" ? "Both Pipelines Burst!" : `${multiplayerWinner} Wins!`}
                 </div>
                 <div className="flex gap-6 my-4 text-lg md:text-xl font-bold bg-white/10 px-6 py-3 rounded-xl border border-white/20">
                    <div className="text-indigo-400">{player1Name}: {getLiveScore(chain1)} pts</div>
                    <div className="w-[2px] bg-white/20"></div>
                    <div className="text-rose-400">{player2Name}: {getLiveScore(chain2)} pts</div>
                 </div>
               </>
            ) : (
               <>
                 <div className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Final Score</div>
                 <div className="text-6xl font-black text-white mb-2">{getLiveScore(chain)}</div>
                 <p className="text-emerald-300/70 text-sm font-medium mb-8 mt-2">
                   Completed in {chain.length} links ({chain.length}x Multiplier)
                 </p>
               </>
            )}
            <div className="flex gap-3 w-full mt-4">
              <button 
                onClick={handleShare} 
                className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-slate-950 font-black py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] transform hover:-translate-y-1"
              >
                Share
              </button>
              {(gameMode === "UNLIMITED" || gameMode === "MULTIPLAYER") && (
                <button 
                  onClick={gameMode === "MULTIPLAYER" ? () => setShowMultiplayerSetup(true) : startUnlimitedMode} 
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-4 rounded-xl transition-all"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        )}

        {/* LOST STATE */}
        {gameState === "LOST" && (
          <div className="w-full max-w-md bg-red-500/10 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center mt-4 animate-in zoom-in backdrop-blur-md">
            <div className="text-4xl mb-4">💀</div>
            <div className="text-xl font-black text-white mb-2 text-center">The Pipeline Burst.</div>
            {gameMode === "MULTIPLAYER" && (
               <div className="text-xl md:text-2xl font-black text-emerald-400 mb-6 text-center leading-tight">{multiplayerWinner} Survives & Wins!</div>
            )}
            <button 
              onClick={() => {
                if (gameMode === "DAILY") startDailyMode();
                else if (gameMode === "HARD_DAILY") startHardDailyMode();
                else if (gameMode === "MULTIPLAYER") setShowMultiplayerSetup(true);
                else startUnlimitedMode();
              }}
              className={`w-full ${gameMode !== "MULTIPLAYER" && 'mt-4'} bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all`}
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </main>
  );
}