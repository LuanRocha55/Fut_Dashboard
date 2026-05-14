const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const csvPath = path.join(__dirname, '../all_players.csv');
const dbPath = path.join(__dirname, 'players.db');

// Remove se já existir para criar do zero
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);

console.log("🚀 Iniciando migração de CSV para SQLite...");

// Criar tabela de jogadores com índices para busca ultra rápida
db.exec(`
  CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    ovr INTEGER,
    position TEXT,
    alt_positions TEXT,
    nation TEXT,
    team TEXT,
    league TEXT,
    age INTEGER,
    foot TEXT,
    playstyles TEXT,
    pac INTEGER,
    sho INTEGER,
    pas INTEGER,
    dri INTEGER,
    def INTEGER,
    phy INTEGER,
    stamina INTEGER,
    acceleration INTEGER,
    sprint_speed INTEGER,
    positioning INTEGER,
    finishing INTEGER,
    shot_power INTEGER,
    long_shots INTEGER,
    volleys INTEGER,
    penalties INTEGER,
    vision INTEGER,
    crossing INTEGER,
    fk_acc INTEGER,
    short_passing INTEGER,
    long_passing INTEGER,
    curve INTEGER,
    agility INTEGER,
    balance INTEGER,
    reactions INTEGER,
    ball_control INTEGER,
    composure INTEGER,
    interceptions INTEGER,
    heading_acc INTEGER,
    def_aware INTEGER,
    stand_tackle INTEGER,
    slide_tackle INTEGER,
    jumping INTEGER,
    strength INTEGER,
    aggression INTEGER
  );
  CREATE INDEX idx_player_name ON players(name);
`);

const csvText = fs.readFileSync(csvPath, 'utf8');
const lines = csvText.split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

const insert = db.prepare(`
  INSERT INTO players (
    name, ovr, position, alt_positions, nation, team, league, age, foot, playstyles,
    pac, sho, pas, dri, def, phy, stamina,
    acceleration, sprint_speed, positioning, finishing, shot_power, long_shots, volleys, penalties,
    vision, crossing, fk_acc, short_passing, long_passing, curve,
    agility, balance, reactions, ball_control, composure,
    interceptions, heading_acc, def_aware, stand_tackle, slide_tackle,
    jumping, strength, aggression
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
    ?, ?, ?, ?, ?, ?, ?, 
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?
  )
`);

db.transaction(() => {
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Regex para lidar com vírgulas dentro de aspas
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
    
    const getVal = (headerName) => {
      const idx = headers.indexOf(headerName);
      return values[idx] || null;
    };

    insert.run(
      getVal('Name'),
      parseInt(getVal('OVR')) || 0,
      getVal('Position'),
      getVal('Alternative positions'),
      getVal('Nation'),
      getVal('Team'),
      getVal('League'),
      parseInt(getVal('Age')) || 0,
      getVal('Preferred foot'),
      getVal('play style'),
      // Stats base
      parseInt(getVal('PAC')) || 0,
      parseInt(getVal('SHO')) || 0,
      parseInt(getVal('PAS')) || 0,
      parseInt(getVal('DRI')) || 0,
      parseInt(getVal('DEF')) || 0,
      parseInt(getVal('PHY')) || 0,
      parseInt(getVal('Stamina')) || 0,
      // Detalhadas
      parseInt(getVal('Acceleration')) || 0,
      parseInt(getVal('Sprint Speed')) || 0,
      parseInt(getVal('Positioning')) || 0,
      parseInt(getVal('Finishing')) || 0,
      parseInt(getVal('Shot Power')) || 0,
      parseInt(getVal('Long Shots')) || 0,
      parseInt(getVal('Volleys')) || 0,
      parseInt(getVal('Penalties')) || 0,
      parseInt(getVal('Vision')) || 0,
      parseInt(getVal('Crossing')) || 0,
      parseInt(getVal('Free Kick Accuracy')) || 0,
      parseInt(getVal('Short Passing')) || 0,
      parseInt(getVal('Long Passing')) || 0,
      parseInt(getVal('Curve')) || 0,
      parseInt(getVal('Agility')) || 0,
      parseInt(getVal('Balance')) || 0,
      parseInt(getVal('Reactions')) || 0,
      parseInt(getVal('Ball Control')) || 0,
      parseInt(getVal('Composure')) || 0,
      parseInt(getVal('Interceptions')) || 0,
      parseInt(getVal('Heading Accuracy')) || 0,
      parseInt(getVal('Def Awareness')) || 0,
      parseInt(getVal('Standing Tackle')) || 0,
      parseInt(getVal('Sliding Tackle')) || 0,
      parseInt(getVal('Jumping')) || 0,
      parseInt(getVal('Strength')) || 0,
      parseInt(getVal('Aggression')) || 0
    );
  }
})();

console.log("✅ Migração concluída com sucesso! players.db criado.");
db.close();
