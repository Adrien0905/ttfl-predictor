import json
import os
import time
import requests
import pandas as pd
from datetime import datetime, timedelta
from nba_api.stats.endpoints import leaguedashplayerstats, leaguedashteamstats

def normalize_espn_team(abbr):
    """Convertit les abréviations ESPN au format officiel NBA"""
    mapping = {'GS': 'GSW', 'NO': 'NOP', 'NY': 'NYK', 'SA': 'SAS', 'UTAH': 'UTA', 'WSH': 'WAS'}
    return mapping.get(abbr, abbr)

def update_stats_and_schedule():
    os.makedirs(os.path.join('src', 'data'), exist_ok=True)

    # -------------------------------------------------------------
    # 1. STATS JOUEURS (via NBA API)
    # -------------------------------------------------------------
    print("🏀 1/3 Récupération des stats joueurs (NBA.com)...")
    try:
        stats = leaguedashplayerstats.LeagueDashPlayerStats(per_mode_detailed='PerGame')
        df = stats.get_data_frames()[0]
        
        players_list = []
        for _, row in df.iterrows():
            players_list.append({
                "id": str(row['PLAYER_ID']),
                "name": row['PLAYER_NAME'],
                "teamAbbr": row['TEAM_ABBREVIATION'],
                "pts": float(row['PTS']), "reb": float(row['REB']), "ast": float(row['AST']),
                "stl": float(row['STL']), "blk": float(row['BLK']), "tov": float(row['TOV']),
                "fgm": float(row['FGM']), "fga": float(row['FGA']), 
                "fg3m": float(row['FG3M']), "fg3a": float(row['FG3A']),
                "ftm": float(row['FTM']), "fta": float(row['FTA'])
            })
            
        with open('src/data/players_db.json', 'w', encoding='utf-8') as f:
            json.dump(players_list, f, ensure_ascii=False, indent=2)
        print(f"✅ {len(players_list)} joueurs mis à jour !")
    except Exception as e:
        print(f"⚠️ Impossible de récupérer les stats joueurs : {e}")

    # -------------------------------------------------------------
    # 2. CALENDRIER 30 JOURS (via ESPN)
    # -------------------------------------------------------------
    print("\n📅 2/3 Récupération du calendrier des 30 prochains jours (ESPN)...")
    schedule_db = {}
    base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
    
    start_date = datetime.now()
    for i in range(30):
        current_date = start_date + timedelta(days=i)
        date_espn = current_date.strftime("%Y%m%d")
        date_json = current_date.strftime("%Y-%m-%d")
        
        try:
            res = requests.get(f"{base_url}?dates={date_espn}", timeout=10)
            data = res.json()
            games = data.get('events', [])
            
            games_list = []
            for event in games:
                comps = event.get('competitions', [])[0].get('competitors', [])
                if len(comps) == 2:
                    t1 = normalize_espn_team(comps[0]['team']['abbreviation'])
                    t2 = normalize_espn_team(comps[1]['team']['abbreviation'])
                    games_list.append({"team1": t1, "team2": t2})
            
            if games_list:
                schedule_db[date_json] = {
                    "totalGames": len(games_list),
                    "games": games_list
                }
        except Exception as e:
            pass 

    with open('src/data/schedule_db.json', 'w', encoding='utf-8') as f:
        json.dump(schedule_db, f, ensure_ascii=False, indent=2)
    print(f"✅ Calendrier de {len(schedule_db)} jours sauvegardé !")

    # -------------------------------------------------------------
    # 3. STATS AVANCÉES ÉQUIPES V2 (via NBA API)
    # -------------------------------------------------------------
    print("\n🛡️ 3/3 Récupération des statistiques avancées d'équipe (NBA.com)...")
    try:
        # Pause initiale pour éviter d'enchaîner trop vite après le bloc 1
        time.sleep(1)

        # Advanced (DRtg, Pace, Rebond Défensif)
        df_adv = leaguedashteamstats.LeagueDashTeamStats(measure_type_detailed_defense='Advanced').get_data_frames()[0]
        df_adv = df_adv[['TEAM_ID', 'TEAM_NAME', 'DEF_RATING', 'PACE', 'DREB_PCT']]
        time.sleep(0.6)

        # Four Factors (Fautes concédées, Turnovers provoqués)
        df_four = leaguedashteamstats.LeagueDashTeamStats(measure_type_detailed_defense='Four Factors').get_data_frames()[0]
        df_four = df_four[['TEAM_ID', 'OPP_FTA_RATE', 'OPP_TOV_PCT']]
        time.sleep(0.6)

        # Opponent (Pourcentage 3 points concédé)
        df_opp = leaguedashteamstats.LeagueDashTeamStats(measure_type_detailed_defense='Opponent').get_data_frames()[0]
        df_opp = df_opp[['TEAM_ID', 'OPP_FG3_PCT']]
        time.sleep(0.6)

        # Misc (Points encaissés dans la raquette)
        df_misc = leaguedashteamstats.LeagueDashTeamStats(measure_type_detailed_defense='Misc').get_data_frames()[0]
        df_misc = df_misc[['TEAM_ID', 'OPP_PTS_PAINT']]

        # Fusion des DataFrames
        df_team = pd.merge(df_adv, df_four, on='TEAM_ID')
        df_team = pd.merge(df_team, df_opp, on='TEAM_ID')
        df_team = pd.merge(df_team, df_misc, on='TEAM_ID')

        # Renommage et formatage
        df_team.columns = ['teamId', 'teamName', 'drtg', 'pace', 'defRebPct', 'oppFtaRate', 'oppTovPct', 'oppFg3Pct', 'oppPtsPaint']
        df_team = df_team.round(3)
        
        # Abbréviations manuelles car l'API ne renvoie pas TEAM_ABBREVIATION ici
        team_abbr_map = {
            'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN', 
            'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE', 
            'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET', 
            'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND', 
            'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM', 
            'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN', 
            'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC', 
            'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX', 
            'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS', 
            'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS'
        }
        df_team['teamAbbr'] = df_team['teamName'].map(team_abbr_map)

        team_stats_list = df_team.to_dict(orient='records')

        with open('src/data/team_advanced_stats.json', 'w', encoding='utf-8') as f:
            json.dump(team_stats_list, f, ensure_ascii=False, indent=2)
        print(f"✅ Statistiques de {len(team_stats_list)} équipes sauvegardées !")

    except Exception as e:
        print(f"⚠️ Impossible de récupérer les stats d'équipes : {e}")

if __name__ == "__main__":
    update_stats_and_schedule()