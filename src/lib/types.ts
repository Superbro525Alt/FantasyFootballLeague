interface PlayerData {
  SeasonStatsTotal: SeasonStats,
  SeasonStatsAverage: SeasonStats
}

interface SeasonStats {
  Year?:    { [key: string]: number | null | string };
  Team?:    { [key: string]: number | null | string };
  "#"?:     { [key: string]: string };
  GM?:      { [key: string]: number | null | string };
  "W-D-L"?: { [key: string]: number | null | string };
  KI?:      { [key: string]: number | null | string };
  MK?:      { [key: string]: number | null | string };
  HB?:      { [key: string]: number | null | string };
  DI?:      { [key: string]: number | null | string };
  GL?:      { [key: string]: number | null | string };
  BH?:      { [key: string]: number | null | string };
  HO?:      { [key: string]: number | null | string };
  TK?:      { [key: string]: number | null | string };
  RB?:      { [key: string]: number | null | string };
  IF?:      { [key: string]: number | null | string };
  CL?:      { [key: string]: number | null | string };
  CG?:      { [key: string]: number | null | string };
  FF?:      { [key: string]: number | null | string };
  FA?:      { [key: string]: number | null | string };
  BR?:      { [key: string]: number | null | string };
  CP?:      { [key: string]: number | null | string };
  UP?:      { [key: string]: number | null | string };
  CM?:      { [key: string]: number | null | string };
  MI?:      { [key: string]: number | null | string };
  "1%"?:    { [key: string]: number | null | string };
  BO?:      { [key: string]: number | null | string };
  GA?:      { [key: string]: number | null | string };
}

export interface TeamData {
  "#"?:    { [key: string]: string };
  Player?: { [key: string]: number | null | string };
  GM?:     { [key: string]: number | null | string };
  KI?:     { [key: string]: number | null | string };
  MK?:     { [key: string]: number | null | string };
  HB?:     { [key: string]: number | null | string };
  DI?:     { [key: string]: number | null | string };
  DA?:     { [key: string]: number | null | string };
  GL?:     { [key: string]: number | null | string };
  BH?:     { [key: string]: number | null | string };
  HO?:     { [key: string]: number | null | string };
  TK?:     { [key: string]: number | null | string };
  RB?:     { [key: string]: number | null | string };
  IF?:     { [key: string]: number | null | string };
  CL?:     { [key: string]: number | null | string };
  CG?:     { [key: string]: number | null | string };
  FF?:     { [key: string]: number | null | string };
  FA?:     { [key: string]: number | null | string };
  BR?:     { [key: string]: number | null | string };
  CP?:     { [key: string]: number | null | string };
  UP?:     { [key: string]: number | null | string };
  CM?:     { [key: string]: number | null | string };
  MI?:     { [key: string]: number | null | string };
  "1%"?:   { [key: string]: number | null | string };
  BO?:     { [key: string]: number | null | string };
  GA?:     { [key: string]: number | null | string };
  "%P"?:   { [key: string]: number | null | string };
  SU?:     { [key: string]: number | null | string };
}

interface Team {
  name: string,
  retirement: number,
  abbrev: string,
  debut: number,
  id: number,
  logo: string
  data?: TeamData
  players?: { [key: string]: PlayerData[] }
}

export type { Team }
