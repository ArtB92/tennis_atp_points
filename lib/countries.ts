/** English country names, as TennisExplorer prints them, to the IOC codes the match data uses. */
const IOC: Record<string, string> = {
  argentina: "ARG", armenia: "ARM", australia: "AUS", austria: "AUT", barbados: "BAR", belarus: "BLR", belgium: "BEL",
  bolivia: "BOL", "bosnia and herzegovina": "BIH", "bosnia & herzegovina": "BIH", brazil: "BRA", bulgaria: "BUL",
  canada: "CAN", chile: "CHI", china: "CHN", "chinese taipei": "TPE", taiwan: "TPE", colombia: "COL", croatia: "CRO",
  cyprus: "CYP", "czech republic": "CZE", czechia: "CZE", denmark: "DEN", "dominican republic": "DOM", ecuador: "ECU",
  egypt: "EGY", estonia: "EST", finland: "FIN", france: "FRA", georgia: "GEO", germany: "GER", "great britain": "GBR",
  "united kingdom": "GBR", greece: "GRE", "hong kong": "HKG", hungary: "HUN", india: "IND", ireland: "IRL", israel: "ISR",
  italy: "ITA", japan: "JPN", kazakhstan: "KAZ", "south korea": "KOR", korea: "KOR", latvia: "LAT", lebanon: "LBN",
  lithuania: "LTU", luxembourg: "LUX", moldova: "MDA", monaco: "MON", morocco: "MAR", mexico: "MEX", netherlands: "NED",
  "new zealand": "NZL", norway: "NOR", paraguay: "PAR", peru: "PER", philippines: "PHI", poland: "POL", portugal: "POR",
  "puerto rico": "PUR", qatar: "QAT", romania: "ROU", russia: "RUS", serbia: "SRB", slovakia: "SVK", slovenia: "SLO",
  "south africa": "RSA", spain: "ESP", sweden: "SWE", switzerland: "SUI", tunisia: "TUN", turkey: "TUR", turkiye: "TUR",
  ukraine: "UKR", uruguay: "URU", usa: "USA", "united states": "USA", uzbekistan: "UZB", venezuela: "VEN",
};

/** IOC code for a country name, or "" when unknown. */
export function countryCode(name: string): string {
  return IOC[name.toLowerCase()] ?? "";
}
