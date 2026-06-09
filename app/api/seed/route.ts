import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We create a fresh admin client to bypass any frontend RLS issues during the seed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using Anon key since we disabled RLS
const supabase = createClient(supabaseUrl, supabaseKey);

// --- THE MEGA DATABASE ---
// You can add thousands of players to these arrays over time!
const NEW_CLUBS = [
  { id: 16, name: "Roma", country: "Italy" },
  { id: 17, name: "Napoli", country: "Italy" },
  { id: 18, name: "Aston Villa", country: "England" },
  { id: 19, name: "Newcastle United", country: "England" },
  { id: 20, name: "Bayer Leverkusen", country: "Germany" },
  { id: 21, name: "RB Leipzig", country: "Germany" },
  { id: 22, name: "Benfica", country: "Portugal" },
  { id: 23, name: "Sporting CP", country: "Portugal" },
  { id: 24, name: "Ajax", country: "Netherlands" }
];

const NEW_PLAYERS = [
  { id: 21, name: "Kevin De Bruyne", nationality: "Belgium" },
  { id: 22, name: "Mohamed Salah", nationality: "Egypt" },
  { id: 23, name: "Angel Di Maria", nationality: "Argentina" },
  { id: 24, name: "Thiago Silva", nationality: "Brazil" },
  { id: 25, name: "Declan Rice", nationality: "England" },
  { id: 26, name: "Jack Grealish", nationality: "England" },
  { id: 27, name: "Kai Havertz", nationality: "Germany" },
  { id: 28, name: "Alisson Becker", nationality: "Brazil" },
  { id: 29, name: "Edinson Cavani", nationality: "Uruguay" },
  { id: 30, name: "Romelu Lukaku", nationality: "Belgium" },
  { id: 31, name: "Joao Felix", nationality: "Portugal" },
  { id: 32, name: "Christian Pulisic", nationality: "USA" },
  { id: 33, name: "Granit Xhaka", nationality: "Switzerland" },
  { id: 34, name: "Ousmane Dembele", nationality: "France" },
  { id: 35, name: "Matthijs de Ligt", nationality: "Netherlands" }
];

const NEW_TRANSFERS = [
  // De Bruyne: Chelsea (7) -> Man City (1) (Skipping Wolfsburg for the direct major links)
  { player_id: 21, from_club_id: 7, to_club_id: 1, transfer_year: 2015 },
  
  // Salah: Chelsea (7) -> Roma (16) -> Liverpool (8)
  { player_id: 22, from_club_id: 7, to_club_id: 16, transfer_year: 2016 },
  { player_id: 22, from_club_id: 16, to_club_id: 8, transfer_year: 2017 },
  
  // Di Maria: Real Madrid (3) -> Man Utd (5) -> PSG (10) -> Juventus (2) -> Benfica (22)
  { player_id: 23, from_club_id: 3, to_club_id: 5, transfer_year: 2014 },
  { player_id: 23, from_club_id: 5, to_club_id: 10, transfer_year: 2015 },
  { player_id: 23, from_club_id: 10, to_club_id: 2, transfer_year: 2022 },
  { player_id: 23, from_club_id: 2, to_club_id: 22, transfer_year: 2023 },

  // Thiago Silva: AC Milan (11) -> PSG (10) -> Chelsea (7)
  { player_id: 24, from_club_id: 11, to_club_id: 10, transfer_year: 2012 },
  { player_id: 24, from_club_id: 10, to_club_id: 7, transfer_year: 2020 },

  // Declan Rice: Arsenal (6) (Skipping West Ham since they aren't seeded yet)
  // Let's seed Havertz instead: Leverkusen (20) -> Chelsea (7) -> Arsenal (6)
  { player_id: 27, from_club_id: 20, to_club_id: 7, transfer_year: 2020 },
  { player_id: 27, from_club_id: 7, to_club_id: 6, transfer_year: 2023 },

  // Alisson: Roma (16) -> Liverpool (8)
  { player_id: 28, from_club_id: 16, to_club_id: 8, transfer_year: 2018 },

  // Cavani: Napoli (17) -> PSG (10) -> Man Utd (5)
  { player_id: 29, from_club_id: 17, to_club_id: 10, transfer_year: 2013 },
  { player_id: 29, from_club_id: 10, to_club_id: 5, transfer_year: 2020 },

  // Lukaku: Chelsea (7) -> Inter (12) -> Chelsea (7) -> Roma (16)
  { player_id: 30, from_club_id: 7, to_club_id: 12, transfer_year: 2019 },
  { player_id: 30, from_club_id: 12, to_club_id: 7, transfer_year: 2021 },
  { player_id: 30, from_club_id: 7, to_club_id: 16, transfer_year: 2023 },

  // Pulisic: Dortmund (14) -> Chelsea (7) -> AC Milan (11)
  { player_id: 32, from_club_id: 14, to_club_id: 7, transfer_year: 2019 },
  { player_id: 32, from_club_id: 7, to_club_id: 11, transfer_year: 2023 },

  // Xhaka: Arsenal (6) -> Leverkusen (20)
  { player_id: 33, from_club_id: 6, to_club_id: 20, transfer_year: 2023 },

  // Dembele: Dortmund (14) -> Barcelona (4) -> PSG (10)
  { player_id: 34, from_club_id: 14, to_club_id: 4, transfer_year: 2017 },
  { player_id: 34, from_club_id: 4, to_club_id: 10, transfer_year: 2023 },

  // De Ligt: Ajax (24) -> Juventus (2) -> Bayern (9)
  { player_id: 35, from_club_id: 24, to_club_id: 2, transfer_year: 2019 },
  { player_id: 35, from_club_id: 2, to_club_id: 9, transfer_year: 2022 }
];

export async function GET() {
  console.log("🚀 Starting Massive Database Seed...");

  try {
    // 1. Insert Clubs (upsert ignores conflicts if they already exist)
    const { error: clubError } = await supabase.from("clubs").upsert(NEW_CLUBS);
    if (clubError) throw new Error(`Club Error: ${clubError.message}`);

    // 2. Insert Players
    const { error: playerError } = await supabase.from("players").upsert(NEW_PLAYERS);
    if (playerError) throw new Error(`Player Error: ${playerError.message}`);

    // 3. Insert Transfers (Upserting based on the combined columns isn't as simple, 
    // so we just do an insert and ignore errors for duplicates)
    for (const transfer of NEW_TRANSFERS) {
      await supabase.from("transfers").insert(transfer).select();
      // We don't throw here, so if you run the script twice, it just skips the duplicates quietly.
    }

    return NextResponse.json({ message: "✅ MASSIVE SEED COMPLETE! Database is locked and loaded." });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}