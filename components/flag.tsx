/** IOC country codes (as the match data writes them) to ISO 3166 codes for flag images. */
const ISO: Record<string, string> = {
  ARG: "ar", ARM: "am", AUS: "au", AUT: "at", BAR: "bb", BEL: "be", BIH: "ba", BLR: "by", BOL: "bo", BRA: "br",
  BUL: "bg", CAN: "ca", CHI: "cl", CHN: "cn", COL: "co", CRO: "hr", CYP: "cy", CZE: "cz", DEN: "dk", DOM: "do",
  ECU: "ec", EGY: "eg", ESP: "es", EST: "ee", FIN: "fi", FRA: "fr", GBR: "gb", GEO: "ge", GER: "de", GRE: "gr",
  HKG: "hk", HUN: "hu", IND: "in", IRL: "ie", ISR: "il", ITA: "it", JPN: "jp", KAZ: "kz", KOR: "kr", LAT: "lv",
  LBN: "lb", LTU: "lt", LUX: "lu", MAR: "ma", MDA: "md", MEX: "mx", MON: "mc", NED: "nl", NOR: "no", NZL: "nz",
  PAR: "py", PER: "pe", PHI: "ph", POL: "pl", POR: "pt", PUR: "pr", QAT: "qa", ROU: "ro", RSA: "za", RUS: "ru",
  SLO: "si", SRB: "rs", SUI: "ch", SVK: "sk", SWE: "se", TPE: "tw", TUN: "tn", TUR: "tr", UKR: "ua", URU: "uy",
  USA: "us", UZB: "uz", VEN: "ve",
};

export function Flag({ country, className = "text-[14px]" }: { country: string; className?: string }) {
  const iso = ISO[country];
  if (!iso) return null;
  return (
    <span
      role="img"
      aria-label={country}
      title={country}
      className={`fi fi-${iso} h-[1em] shrink-0 rounded-[2px] bg-cover shadow-[0_0_0_1px_rgb(0_0_0/0.12)] ${className}`}
    />
  );
}
