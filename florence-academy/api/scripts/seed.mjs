// Seed the Data API with a realistic demo cohort so the internal Control Tower
// renders a believable funnel. Talks to a RUNNING API over HTTP using an M2M
// client (default: the demo client). Deterministic (seeded RNG) so reruns look
// the same - but candidates have no natural key, so run against a fresh API
// (the in-memory store resets on restart) to avoid duplicates.
//
//   node scripts/seed.mjs
//   API_URL=http://localhost:8088 SEED_CLIENT_SECRET=… node scripts/seed.mjs

const BASE = (process.env.API_URL || "http://localhost:8088").replace(/\/$/, "");
const CLIENT_ID = process.env.SEED_CLIENT_ID || "demo-crm";
const CLIENT_SECRET = process.env.SEED_CLIENT_SECRET || "overnight-demo-secret";

// mulberry32 - tiny deterministic PRNG (so the demo data is reproducible).
let _s = 0xc0ffee;
const rnd = () => {
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const weighted = (pairs) => {
  let r = rnd();
  for (const [v, w] of pairs) if ((r -= w) < 0) return v;
  return pairs[0][0];
};

// v0 University Affiliate Network - Philippines directory. Eligible-only; no
// logos, no contact emails, no email-domain auto-verification (deliberately -
// each domain must be confirmed before it goes in). Edit names/slugs here when
// they change; the public picker reads them via GET /v1/schools.
const PH_SCHOOLS = [
  { slug: "FLR-PH-SILLIMAN", name: "Silliman University", city: "Dumaguete City" },
  { slug: "FLR-PH-SLU-BAGUIO", name: "Saint Louis University", city: "Baguio City" },
  { slug: "FLR-PH-TRINITY-STLUKES", name: "Trinity University of Asia - St. Luke's College of Nursing", city: "Quezon City" },
  { slug: "FLR-PH-UST", name: "University of Santo Tomas", city: "Manila" },
  { slug: "FLR-PH-STPAUL-TUG", name: "St. Paul University", city: "Tuguegarao City" },
  { slug: "FLR-PH-CPU", name: "Central Philippine University", city: "Iloilo City" },
  { slug: "FLR-PH-CDU", name: "Cebu Doctors' University", city: "Mandaue City" },
  { slug: "FLR-PH-DLSU-DASMA", name: "De La Salle University - Dasmariñas Health Sciences", city: "Dasmariñas City" },
  { slug: "FLR-PH-STMARYS", name: "Saint Mary's University", city: "Bayombong" },
  { slug: "FLR-PH-SAN-PEDRO", name: "San Pedro College", city: "Davao City" },
  { slug: "FLR-PH-DAVAO-DRS", name: "Davao Doctors College", city: "Davao City" },
  { slug: "FLR-PH-LORMA", name: "Lorma College", city: "La Union" },
  { slug: "FLR-PH-OLFU-QC", name: "Our Lady of Fatima University - Quezon City", city: "Quezon City" },
  { slug: "FLR-PH-OLFU-VAL", name: "Our Lady of Fatima University - Valenzuela", city: "Valenzuela" },
  { slug: "FLR-PH-MEDINA", name: "Medina College", city: "Pagadian City" },
  { slug: "FLR-PH-SWU", name: "Southwestern University", city: "Cebu City" },
  { slug: "FLR-PH-WMSU", name: "Western Mindanao State University", city: "Zamboanga City" },
  { slug: "FLR-PH-MMSU", name: "Mariano Marcos State University", city: "Batac" },
  { slug: "FLR-PH-MSU-ILIGAN", name: "Mindanao State University - Iligan", city: "Iligan City" },
  { slug: "FLR-PH-MSU-MARAWI", name: "Mindanao State University - Marawi", city: "Marawi City" },
  { slug: "FLR-PH-UC-BAGUIO", name: "University of the Cordilleras", city: "Baguio City" },
  { slug: "FLR-PH-CNU", name: "Cebu Normal University", city: "Cebu City" },
  { slug: "FLR-PH-WVSU", name: "West Visayas State University", city: "Iloilo City" },
  { slug: "FLR-PH-CGHC", name: "Chinese General Hospital Colleges", city: "Manila" },
  // ── Wikipedia: "List of colleges of nursing in the Philippines" (deduped) ────
  { slug: "FLR-PH-ADAMSON", name: "Adamson University", city: "Manila" },
  { slug: "FLR-PH-AGO-FDN", name: "Ago Foundation College", city: "Naga City" },
  { slug: "FLR-PH-AGO-MED", name: "Ago Medical and Educational Center", city: "Legazpi, Albay" },
  { slug: "FLR-PH-AMANDO-COPE", name: "Amando Cope College", city: "Tabaco City, Albay" },
  { slug: "FLR-PH-AUF", name: "Angeles University Foundation", city: "Angeles City" },
  { slug: "FLR-PH-AKLAN-STATE", name: "Aklan State University", city: "Banga, Aklan" },
  { slug: "FLR-PH-UST-LEGAZPI", name: "University of Santo Tomas - Legazpi", city: "Legazpi, Albay" },
  { slug: "FLR-PH-ARAULLO", name: "Araullo University", city: "Cabanatuan" },
  { slug: "FLR-PH-ARELLANO", name: "Arellano University", city: "Manila" },
  { slug: "FLR-PH-ACT", name: "Asian College of Technology", city: "Cebu City" },
  { slug: "FLR-PH-APCAS", name: "Asia Pacific College of Advanced Studies", city: "Tabaco City, Albay" },
  { slug: "FLR-PH-ADDU", name: "Ateneo de Davao University", city: "Davao City" },
  { slug: "FLR-PH-ADNU", name: "Ateneo de Naga University", city: "Naga City" },
  { slug: "FLR-PH-ADZU", name: "Ateneo de Zamboanga University", city: "Zamboanga City" },
  { slug: "FLR-PH-BCU", name: "Baguio Central University", city: "Baguio City" },
  { slug: "FLR-PH-BALIUAG", name: "Baliuag University", city: "Baliuag, Bulacan" },
  { slug: "FLR-PH-BPSU", name: "Bataan Peninsula State University", city: "Balanga" },
  { slug: "FLR-PH-BSU", name: "Benguet State University", city: "La Trinidad, Benguet" },
  { slug: "FLR-PH-BICOL-COLLEGE", name: "Bicol College", city: "Legazpi, Albay" },
  { slug: "FLR-PH-BICOL-U", name: "Bicol University", city: "Legazpi, Albay" },
  { slug: "FLR-PH-BROKENSHIRE", name: "Brokenshire College", city: "Davao City" },
  { slug: "FLR-PH-BUKIDNON-STATE", name: "Bukidnon State University", city: "Malaybalay" },
  { slug: "FLR-PH-BULACAN-STATE", name: "Bulacan State University", city: "Malolos" },
  { slug: "FLR-PH-CAPITOL-MED", name: "Capitol Medical Center Colleges", city: "Quezon City" },
  { slug: "FLR-PH-CIT", name: "Cebu Institute of Technology", city: "Cebu City" },
  { slug: "FLR-PH-CSHC", name: "Cebu Sacred Heart College", city: "Cebu City" },
  { slug: "FLR-PH-CTU", name: "Cebu Technological University", city: "Cebu City" },
  { slug: "FLR-PH-CEU", name: "Centro Escolar University", city: "Manila" },
  { slug: "FLR-PH-CKC", name: "Christ the King College", city: "Calbayog" },
  { slug: "FLR-PH-CSLR-SAMAR", name: "Colegio de San Lorenzo Ruiz de Manila of Northern Samar", city: "Catarman" },
  { slug: "FLR-PH-COLEGIO-KIDAPAWAN", name: "Colegio de Kidapawan", city: "Kidapawan City" },
  { slug: "FLR-PH-COR-JESU", name: "Cor Jesu College", city: "Digos City" },
  { slug: "FLR-PH-DMSF", name: "Davao Medical School Foundation", city: "Davao City" },
  { slug: "FLR-PH-DLSMHSI", name: "De La Salle Medical and Health Sciences Institute", city: "Dasmariñas" },
  { slug: "FLR-PH-DLSL", name: "De La Salle Lipa", city: "Lipa City" },
  { slug: "FLR-PH-DCSR", name: "Dominican College of Santa Rosa", city: "Santa Rosa, Laguna" },
  { slug: "FLR-PH-LANTING", name: "Dr. Carlos S. Lanting College", city: "Quezon City" },
  { slug: "FLR-PH-EAC", name: "Emilio Aguinaldo College", city: "Manila" },
  { slug: "FLR-PH-FEU-NURSING", name: "Far Eastern University Institute of Nursing", city: "Manila" },
  { slug: "FLR-PH-FSU-BUTUAN", name: "Father Saturnino Urios University", city: "Butuan" },
  { slug: "FLR-PH-FCAT", name: "Fernandez College of Arts and Technology", city: "Baliuag" },
  { slug: "FLR-PH-OLFU-MAIN", name: "Our Lady of Fatima University", city: "Quezon City" },
  { slug: "FLR-PH-GCIC", name: "Global City Innovative College", city: "Taguig" },
  { slug: "FLR-PH-LACSON", name: "Dr. Gloria D. Lacson College", city: "San Leonardo, Nueva Ecija" },
  { slug: "FLR-PH-GSC-CABA", name: "Good Samaritan Colleges Cabanatuan", city: "Cabanatuan" },
  { slug: "FLR-PH-HCC-BUTUAN", name: "Holy Child College of Butuan", city: "Butuan" },
  { slug: "FLR-PH-HIC-TACLOBAN", name: "Holy Infant College", city: "Tacloban" },
  { slug: "FLR-PH-HOLY-NAME", name: "Holy Name University", city: "Tagbilaran" },
  { slug: "FLR-PH-IFUGAO-ISCAF", name: "Ifugao State College", city: "Lamut, Ifugao" },
  { slug: "FLR-PH-IDC", name: "Iloilo Doctors College", city: "Iloilo City" },
  { slug: "FLR-PH-ICC-ALBAY", name: "Immaculate Conception College - Albay", city: "Albay" },
  { slug: "FLR-PH-ICC-CABA", name: "Immaculate Conception College - Cabanatuan", city: "Cabanatuan" },
  { slug: "FLR-PH-JOSE-FELICIANO", name: "Jose C. Feliciano College", city: "Pampanga" },
  { slug: "FLR-PH-JRU", name: "Jose Rizal University", city: "Mandaluyong" },
  { slug: "FLR-PH-KESTER-GRANT", name: "Kester Grant College", city: "Iligan" },
  { slug: "FLR-PH-LSU-OZAMIZ", name: "La Salle University - Ozamiz City", city: "Ozamiz" },
  { slug: "FLR-PH-LA-FORTUNA", name: "La Fortuna College", city: "Cabanatuan" },
  { slug: "FLR-PH-LICEO-CAGAYAN", name: "Liceo de Cagayan University", city: "Cagayan de Oro" },
  { slug: "FLR-PH-LOURDES", name: "Lourdes College", city: "Cagayan de Oro" },
  { slug: "FLR-PH-LIT-LAGUNA", name: "Lyceum Institute of Technology", city: "Laguna" },
  { slug: "FLR-PH-LB", name: "Lyceum of Batangas", city: "Batangas City" },
  { slug: "FLR-PH-LPU-MANILA", name: "Lyceum of the Philippines University", city: "Manila" },
  { slug: "FLR-PH-LYC-CABRINI", name: "Lyceum - St. Cabrini College of Allied Medicine", city: "Batangas" },
  { slug: "FLR-PH-MAMC", name: "Manila Adventist Medical Center and Colleges", city: "Pasay" },
  { slug: "FLR-PH-MCU", name: "Manila Central University", city: "Caloocan" },
  { slug: "FLR-PH-TYTANA", name: "Manila Tytana Colleges", city: "Pasay" },
  { slug: "FLR-PH-MATI-DRS", name: "Mati Doctors College", city: "Mati" },
  { slug: "FLR-PH-METRO-MED", name: "Metropolitan Medical Center College", city: "Manila" },
  { slug: "FLR-PH-MMFC", name: "Mindanao Medical Foundation College", city: "Davao City" },
  { slug: "FLR-PH-MSHC-ILIGAN", name: "Mindanao Sanitarium and Hospital College", city: "Iligan" },
  { slug: "FLR-PH-MISAMIS-U", name: "Misamis University", city: "Ozamiz" },
  { slug: "FLR-PH-MVC", name: "Mountain View College", city: "Valencia, Bukidnon" },
  { slug: "FLR-PH-NCF", name: "Naga College Foundation", city: "Naga City" },
  { slug: "FLR-PH-NEU", name: "New Era University", city: "Quezon City" },
  { slug: "FLR-PH-NEC-SANTIAGO", name: "Northeastern College", city: "Santiago City" },
  { slug: "FLR-PH-NVC", name: "North Valley College", city: "Davao City" },
  { slug: "FLR-PH-NDDU", name: "Notre Dame of Dadiangas University", city: "General Santos" },
  { slug: "FLR-PH-NDJ", name: "Notre Dame of Jolo College", city: "Jolo, Sulu" },
  { slug: "FLR-PH-NDKC", name: "Notre Dame of Kidapawan College", city: "Kidapawan City" },
  { slug: "FLR-PH-NDMU", name: "Notre Dame of Marbel University", city: "Koronadal" },
  { slug: "FLR-PH-NDU", name: "Notre Dame University", city: "Cotabato City" },
  { slug: "FLR-PH-NEDC-CABA", name: "Nueva Ecija Doctors College", city: "Cabanatuan" },
  { slug: "FLR-PH-NEUST-CABA", name: "Nueva Ecija University of Science and Technology", city: "Cabanatuan" },
  { slug: "FLR-PH-NDMC-MIDSAYAP", name: "Notre Dame of Midsayap College", city: "Midsayap" },
  { slug: "FLR-PH-OLIVAREZ", name: "Olivarez College", city: "Parañaque" },
  { slug: "FLR-PH-OLPC-ISABELA", name: "Our Lady of the Pillar Colleges", city: "Cauayan, Isabela" },
  { slug: "FLR-PH-PLM", name: "Pamantasan ng Lungsod ng Maynila", city: "Manila" },
  { slug: "FLR-PH-PLMar", name: "Pamantasan ng Lungsod ng Marikina", city: "Marikina" },
  { slug: "FLR-PH-PNC", name: "Pamantasan ng Cabuyao", city: "Cabuyao" },
  { slug: "FLR-PH-PRIFI", name: "Philippine Rehabilitation Institute Foundation", city: "Manila" },
  { slug: "FLR-PH-PCHS", name: "Philippine College of Health Sciences", city: "Manila" },
  { slug: "FLR-PH-PINES-CITY", name: "Pines City Colleges", city: "Baguio City" },
  { slug: "FLR-PH-PCDS", name: "Polytechnic College of Davao del Sur", city: "Digos City" },
  { slug: "FLR-PH-NNSCST", name: "Northern Negros State College of Science and Technology", city: "Sagay City" },
  { slug: "FLR-PH-DRT-TACLOBAN", name: "Doña Remedios Trinidad Romualdez Medical Foundation", city: "Tacloban" },
  { slug: "FLR-PH-RTR-MAKATI", name: "Remedios Trinidad Romualdez Memorial Schools", city: "Makati" },
  { slug: "FLR-PH-SJDEF", name: "San Juan De Dios Educational Foundation", city: "Pasay" },
  { slug: "FLR-PH-ST-ANTHONY-ANTIQUE", name: "St. Anthony's College", city: "Antique" },
  { slug: "FLR-PH-ST-FERDINAND-ILAGAN", name: "St. Ferdinand College", city: "Ilagan, Isabela" },
  { slug: "FLR-PH-SJC-CAVITE", name: "St. Joseph College Cavite City", city: "Cavite City" },
  { slug: "FLR-PH-SMC-TAGUM", name: "Saint Mary's College of Tagum", city: "Tagum" },
  { slug: "FLR-PH-SPU-ILOILO", name: "St. Paul University Iloilo", city: "Iloilo City" },
  { slug: "FLR-PH-SPU-PHILS", name: "St. Paul University Philippines", city: "Tuguegarao City" },
  { slug: "FLR-PH-SLSU", name: "Southern Luzon State University", city: "Lucban" },
  { slug: "FLR-PH-SPAC", name: "South Philippine Adventist College", city: "Matanao, Davao del Sur" },
  { slug: "FLR-PH-SISC", name: "Southville International School and Colleges", city: "Las Piñas" },
  { slug: "FLR-PH-STI-SAN-PABLO", name: "STI College San Pablo", city: "San Pablo, Laguna" },
  { slug: "FLR-PH-SPCF", name: "Systems Plus College Foundation", city: "Angeles City" },
  { slug: "FLR-PH-TABACO-COLLEGE", name: "Tabaco College", city: "Tabaco City, Albay" },
  { slug: "FLR-PH-TANCHULING", name: "Tanchuling College", city: "Legazpi City, Albay" },
  { slug: "FLR-PH-TSU", name: "Tarlac State University", city: "Tarlac City" },
  { slug: "FLR-PH-TCMC", name: "Tomas Claudio Memorial College", city: "Morong, Rizal" },
  { slug: "FLR-PH-TDR", name: "Tomas del Rosario College", city: "Balanga, Bataan" },
  { slug: "FLR-PH-UMANILA", name: "Universidad de Manila", city: "Manila" },
  { slug: "FLR-PH-USTA-ISABEL", name: "Universidad de Sta. Isabel", city: "Naga City" },
  { slug: "FLR-PH-UZ", name: "Universidad de Zamboanga", city: "Zamboanga City" },
  { slug: "FLR-PH-UBAGUIO", name: "University of Baguio", city: "Baguio City" },
  { slug: "FLR-PH-UBATANGAS", name: "University of Batangas", city: "Batangas City" },
  { slug: "FLR-PH-UCEBU", name: "University of Cebu", city: "Cebu City" },
  { slug: "FLR-PH-UILOILO", name: "University of Iloilo", city: "Iloilo City" },
  { slug: "FLR-PH-ULASALETTE", name: "University of La Salette", city: "Santiago City" },
  { slug: "FLR-PH-UMINDANAO", name: "University of Mindanao", city: "Davao City" },
  { slug: "FLR-PH-UPHSD-MOLINO", name: "University of Perpetual Help System Dalta - Molino", city: "Bacoor" },
  { slug: "FLR-PH-USA-ILOILO", name: "University of San Agustin", city: "Iloilo City" },
  { slug: "FLR-PH-USC-CEBU", name: "University of San Carlos", city: "Cebu City" },
  { slug: "FLR-PH-USJR", name: "University of San Jose-Recoletos", city: "Cebu City" },
  { slug: "FLR-PH-USEP", name: "University of Southeastern Philippines", city: "Davao City" },
  { slug: "FLR-PH-USPF", name: "University of Southern Philippines Foundation", city: "Cebu City" },
  { slug: "FLR-PH-USLS", name: "University of St. La Salle", city: "Bacolod" },
  { slug: "FLR-PH-UERMMMC", name: "UERMMMC College of Nursing", city: "Quezon City" },
  { slug: "FLR-PH-UIC", name: "University of the Immaculate Conception", city: "Davao City" },
  { slug: "FLR-PH-UPM", name: "University of the Philippines Manila", city: "Manila" },
  { slug: "FLR-PH-UV-CEBU", name: "University of the Visayas", city: "Cebu City" },
  { slug: "FLR-PH-VSU", name: "Visayas State University", city: "Baybay City, Leyte" },
  { slug: "FLR-PH-WESLEYAN", name: "Wesleyan University Philippines", city: "Cabanatuan" },
  { slug: "FLR-PH-XU-ADCC", name: "Xavier University - Ateneo de Cagayan", city: "Cagayan de Oro" },
];

// ── Kenya - NCK Approved Training Institutions ───────────────────────────────
// Source: Nursing Council of Kenya approved-institutions list (provided by
// operator). county[] left blank where the source listed a county tag (used as
// "city" here since the API has no county field). Numbered 1-171 per NCK.
const KE_SCHOOLS = [
  { slug: "FLR-KE-AGA-KHAN-UNI", name: "Aga Khan University", city: "Nairobi" },
  { slug: "FLR-KE-AIC-KAPSOWAR", name: "AIC Kapsowar School of Nursing", city: "Elgeyo Marakwet" },
  { slug: "FLR-KE-AIC-KIJABE", name: "AIC Kijabe College of Health Sciences", city: "Kiambu" },
  { slug: "FLR-KE-AIC-LITEIN", name: "AIC Litein School of Nursing", city: "Kericho" },
  { slug: "FLR-KE-AMREF", name: "AMREF International University", city: "Nairobi" },
  { slug: "FLR-KE-BARATON", name: "University of Eastern Africa, Baraton", city: "Nandi" },
  { slug: "FLR-KE-McAULEY", name: "Catherine McAuley Nursing School", city: "Nairobi" },
  { slug: "FLR-KE-ST-ELIZABETH-MUKUMU", name: "St. Elizabeth Medical and Technical College, Mukumu", city: "Kakamega" },
  { slug: "FLR-KE-CECILY-McDONELL", name: "Cecily McDonnell College of Health Sciences (Nairobi Hospital)", city: "Nairobi" },
  { slug: "FLR-KE-CHERANGANY", name: "Cherangany Hospital Training College", city: "Trans Nzoia" },
  { slug: "FLR-KE-CHUKA-KMTC", name: "Chuka KMTC", city: "Tharaka Nithi" },
  { slug: "FLR-KE-CHUKA-UNI", name: "Chuka University", city: "Chuka" },
  { slug: "FLR-KE-CLIVE-IRVINE", name: "Clive Irvine College of Nursing", city: "Tharaka Nithi" },
  { slug: "FLR-KE-CONSOLATA-WAMBA", name: "Consolata Wamba School of Nursing", city: "Samburu" },
  { slug: "FLR-KE-DAYSTAR", name: "Daystar University", city: "Nairobi" },
  { slug: "FLR-KE-DEDAN-KIMATHI", name: "Dedan Kimathi University", city: "Nyeri" },
  { slug: "FLR-KE-EDINBURG-COLLEGE", name: "Edinburg College", city: "Murang'a" },
  { slug: "FLR-KE-EGERTON", name: "Egerton University", city: "Nakuru" },
  { slug: "FLR-KE-EQUIP-AFRICA", name: "Equip Africa College of Medical and Health Sciences", city: "Trans Nzoia" },
  { slug: "FLR-KE-FAFA-MTC", name: "Fafa MTC", city: "Kakamega" },
  { slug: "FLR-KE-FIDENZA-KYENI", name: "Fidenza School of Nursing - Kyeni", city: "Embu" },
  { slug: "FLR-KE-FORTIS-MTC", name: "Fortis Medical Training College", city: "Nairobi" },
  { slug: "FLR-KE-GERTRUDES", name: "Gertrude's Institute of Child Health and Research", city: "Nairobi" },
  { slug: "FLR-KE-GOSHEN-MED", name: "Goshen Medical College", city: "Kiambu" },
  { slug: "FLR-KE-GREAT-LAKES", name: "Great Lakes University", city: "Kisumu" },
  { slug: "FLR-KE-HUNTERS-COL", name: "Hunters College of Health Sciences", city: "Embu" },
  { slug: "FLR-KE-IMPERIAL-MED", name: "Imperial College of Medical and Health Sciences", city: "Kiambu" },
  { slug: "FLR-KE-JOOTRH-NURSING", name: "Jaramogi Oginga Odinga Teaching and Referral Hospital School of Nursing", city: "Kisumu" },
  { slug: "FLR-KE-JOAN-NURSING", name: "Joan School of Nursing", city: "Kisumu" },
  { slug: "FLR-KE-JOHN-CHARLES-MTC", name: "John Charles Medical Training College", city: "Nairobi" },
  { slug: "FLR-KE-JKUAT", name: "Jomo Kenyatta University of Agriculture and Technology", city: "Kiambu" },
  { slug: "FLR-KE-JORDAN-MED", name: "Jordan Hospital Medical College", city: "Kitui" },
  { slug: "FLR-KE-KABARAK", name: "Kabarak University", city: "Nakuru" },
  { slug: "FLR-KE-KABIANGA", name: "Kabianga University", city: "Kericho" },
  { slug: "FLR-KE-KAIMOSI", name: "Kaimosi Friends University College", city: "Vihiga" },
  { slug: "FLR-KE-KARATINA", name: "Karatina University", city: "Nyeri" },
  { slug: "FLR-KE-KAREN-MTC", name: "Karen Hospital Medical Training College", city: "Nairobi" },
  { slug: "FLR-KE-KENYA-HIGHLANDS", name: "Kenya Highlands University", city: "Kericho" },
  { slug: "FLR-KE-KEMU", name: "Kenya Methodist University", city: "Meru" },
  { slug: "FLR-KE-KNH-NURSING", name: "Kenyatta National Hospital School of Nursing", city: "Nairobi" },
  { slug: "FLR-KE-KU", name: "Kenyatta University", city: "Nairobi" },
  { slug: "FLR-KE-KUTRRH", name: "Kenyatta University Teaching, Referral & Research Hospital", city: "Nairobi" },
  { slug: "FLR-KE-KIBABII", name: "Kibabii University", city: "Bungoma" },
  { slug: "FLR-KE-KIJABE-MED", name: "Kijabe Medical School", city: "Kiambu" },
  { slug: "FLR-KE-KIRINYAGA-UNI", name: "Kirinyaga University", city: "Kirinyaga" },
  { slug: "FLR-KE-KISARUNI", name: "Kisaruni Legacy College (formerly WE College School of Nursing)", city: "Narok" },
  { slug: "FLR-KE-KISII-UNI", name: "Kisii University", city: "Kisii" },
  { slug: "FLR-KE-KMTC-BOMET", name: "KMTC Bomet", city: "Bomet" },
  { slug: "FLR-KE-KMTC-BONDO", name: "KMTC Bondo", city: "Siaya" },
  { slug: "FLR-KE-KMTC-BUNGOMA", name: "KMTC Bungoma", city: "Bungoma" },
  { slug: "FLR-KE-KMTC-BUSIA", name: "KMTC Busia", city: "Busia" },
  { slug: "FLR-KE-KMTC-CHWELE", name: "KMTC Chwele", city: "Bungoma" },
  { slug: "FLR-KE-KMTC-ELDORET", name: "KMTC Eldoret", city: "Eldoret" },
  { slug: "FLR-KE-KMTC-EMBU", name: "KMTC Embu", city: "Embu" },
  { slug: "FLR-KE-KMTC-GARISSA", name: "KMTC Garissa", city: "Garissa" },
  { slug: "FLR-KE-KMTC-GATUNDU", name: "KMTC Gatundu", city: "Kiambu" },
  { slug: "FLR-KE-KMTC-HOMABAY", name: "KMTC Homa Bay", city: "Homa Bay" },
  { slug: "FLR-KE-KMTC-ISIOLO", name: "KMTC Isiolo", city: "Isiolo" },
  { slug: "FLR-KE-KMTC-ITEN", name: "KMTC Iten", city: "Elgeyo Marakwet" },
  { slug: "FLR-KE-KMTC-KABARNET", name: "KMTC Kabarnet", city: "Baringo" },
  { slug: "FLR-KE-KMTC-KAKAMEGA", name: "KMTC Kakamega", city: "Kakamega" },
  { slug: "FLR-KE-KMTC-KAPENGURIA", name: "KMTC Kapenguria", city: "West Pokot" },
  { slug: "FLR-KE-KMTC-KAPKATET", name: "KMTC Kapkatet", city: "Kericho" },
  { slug: "FLR-KE-KMTC-KAPTUMO", name: "KMTC Kaptumo", city: "Nandi" },
  { slug: "FLR-KE-KMTC-KILIFI", name: "KMTC Kilifi", city: "Kilifi" },
  { slug: "FLR-KE-KMTC-KISII", name: "KMTC Kisii", city: "Kisii" },
  { slug: "FLR-KE-KMTC-KISUMU", name: "KMTC Kisumu", city: "Kisumu" },
  { slug: "FLR-KE-KMTC-KITALE", name: "KMTC Kitale", city: "Trans Nzoia" },
  { slug: "FLR-KE-KMTC-KITUI", name: "KMTC Kitui", city: "Kitui" },
  { slug: "FLR-KE-KMTC-KOMBEWA", name: "KMTC Kombewa", city: "Kisumu" },
  { slug: "FLR-KE-KMTC-KURIA", name: "KMTC Kuria", city: "Migori" },
  { slug: "FLR-KE-KMTC-LAKE-VICTORIA", name: "KMTC Lake Victoria", city: "Kisumu" },
  { slug: "FLR-KE-KMTC-LAMU", name: "KMTC Lamu", city: "Lamu" },
  { slug: "FLR-KE-KMTC-LODWAR", name: "KMTC Lodwar", city: "Turkana" },
  { slug: "FLR-KE-KMTC-LOITOKTOK", name: "KMTC Loitokitok", city: "Kajiado" },
  { slug: "FLR-KE-KMTC-MACHAKOS", name: "KMTC Machakos", city: "Machakos" },
  { slug: "FLR-KE-KMTC-MAKINDU", name: "KMTC Makindu", city: "Makueni" },
  { slug: "FLR-KE-KMTC-MAKUENI", name: "KMTC Makueni", city: "Makueni" },
  { slug: "FLR-KE-KMTC-MATHARI", name: "KMTC Mathari", city: "Nairobi" },
  { slug: "FLR-KE-KMTC-MBOONI", name: "KMTC Mbooni", city: "Makueni" },
  { slug: "FLR-KE-KMTC-MERU", name: "KMTC Meru", city: "Meru" },
  { slug: "FLR-KE-KMTC-MIGORI", name: "KMTC Migori", city: "Migori" },
  { slug: "FLR-KE-KMTC-MOMBASA", name: "KMTC Mombasa", city: "Mombasa" },
  { slug: "FLR-KE-KMTC-MOSORIOT", name: "KMTC Mosoriot", city: "Nandi" },
  { slug: "FLR-KE-KMTC-MSAMBWENI", name: "KMTC Msambweni", city: "Kwale" },
  { slug: "FLR-KE-KMTC-MURANGA", name: "KMTC Murang'a", city: "Murang'a" },
  { slug: "FLR-KE-KMTC-MWINGI", name: "KMTC Mwingi", city: "Kitui" },
  { slug: "FLR-KE-KMTC-NAIROBI", name: "KMTC Nairobi", city: "Nairobi" },
  { slug: "FLR-KE-KMTC-NAKURU", name: "KMTC Nakuru", city: "Nakuru" },
  { slug: "FLR-KE-KMTC-NAVAKHOLO", name: "KMTC Navakholo", city: "Kakamega" },
  { slug: "FLR-KE-KMTC-NYAMIRA", name: "KMTC Nyamira", city: "Nyamira" },
  { slug: "FLR-KE-KMTC-NYANDARUA", name: "KMTC Nyandarua", city: "Nyandarua" },
  { slug: "FLR-KE-KMTC-NYERI", name: "KMTC Nyeri", city: "Nyeri" },
  { slug: "FLR-KE-KMTC-OLOITOKTOK", name: "KMTC Oloitokitok", city: "Kajiado" },
  { slug: "FLR-KE-KMTC-PORT-REITZ", name: "KMTC Port Reitz", city: "Mombasa" },
  { slug: "FLR-KE-KMTC-SIAYA", name: "KMTC Siaya", city: "Siaya" },
  { slug: "FLR-KE-KMTC-SIGOWETT", name: "KMTC Sigowett", city: "Kericho" },
  { slug: "FLR-KE-KMTC-TESO", name: "KMTC Teso", city: "Busia" },
  { slug: "FLR-KE-KMTC-THIKA", name: "KMTC Thika", city: "Kiambu" },
  { slug: "FLR-KE-KMTC-VIHIGA", name: "KMTC Vihiga", city: "Vihiga" },
  { slug: "FLR-KE-KMTC-VOI", name: "KMTC Voi", city: "Taita Taveta" },
  { slug: "FLR-KE-KMTC-WAJIR", name: "KMTC Wajir", city: "Wajir" },
  { slug: "FLR-KE-KMTC-WEBUYE", name: "KMTC Webuye", city: "Webuye" },
  { slug: "FLR-KE-LAKE-LAWRENZO", name: "Lake Lawrenzo Medical Training College", city: "Nakuru" },
  { slug: "FLR-KE-LEBEN", name: "Leben College of Health Sciences", city: "Kakamega" },
  { slug: "FLR-KE-LUKENYA", name: "Lukenya Training Institute", city: "Machakos" },
  { slug: "FLR-KE-MP-SHAH", name: "M.P. Shah College of Health Sciences", city: "Nairobi" },
  { slug: "FLR-KE-MAASAI-MARA", name: "Maasai Mara University", city: "Narok" },
  { slug: "FLR-KE-MACMILLAN", name: "Macmillan Medical Training College", city: "Nairobi" },
  { slug: "FLR-KE-MAHANAIM", name: "Mahanaim Educational Institute", city: "Nairobi" },
  { slug: "FLR-KE-MAMA-NGINA", name: "Mama Ngina University", city: "Kiambu" },
  { slug: "FLR-KE-MARY-ANN-VANDAM", name: "Mary Ann Vandam School of Nursing", city: "Siaya" },
  { slug: "FLR-KE-MASENO-SON", name: "Maseno School of Nursing", city: "Kisumu" },
  { slug: "FLR-KE-MASENO-UNI", name: "Maseno University", city: "Kisumu" },
  { slug: "FLR-KE-MMUST", name: "Masinde Muliro University of Science and Technology", city: "Kakamega" },
  { slug: "FLR-KE-MAUA-METHODIST", name: "Maua Methodist College of Health Sciences", city: "Meru" },
  { slug: "FLR-KE-MUST", name: "Meru University of Science and Technology", city: "Meru" },
  { slug: "FLR-KE-MTRH", name: "Moi Teaching and Referral Hospital, College of Health Sciences", city: "Uasin Gishu" },
  { slug: "FLR-KE-MOI-UNI", name: "Moi University", city: "Uasin Gishu" },
  { slug: "FLR-KE-MKU", name: "Mount Kenya University", city: "Thika" },
  { slug: "FLR-KE-MURANGA-UNI", name: "Murang'a University", city: "Murang'a" },
  { slug: "FLR-KE-NAIROBI-WEST-HC", name: "Nairobi West Hospital College of Health Sciences", city: "Nairobi" },
  { slug: "FLR-KE-NAKURU-HC", name: "Nakuru College of Health Sciences and Management", city: "Nakuru" },
  { slug: "FLR-KE-NDU-KDF", name: "National Defence University - Kenya Defence College of Health Sciences", city: "Nairobi" },
  { slug: "FLR-KE-NAZARETH-MED", name: "Nazareth Medical College", city: "Kiambu" },
  { slug: "FLR-KE-NEP-HC-GARISSA", name: "NEP College of Health Sciences", city: "Garissa" },
  { slug: "FLR-KE-NEP-MEWA", name: "NEP Mewa College of Professional Studies", city: "Mombasa" },
  { slug: "FLR-KE-NORTH-COAST", name: "North Coast MTC", city: "Kilifi" },
  { slug: "FLR-KE-NURIA", name: "Nuria College", city: "Wajir" },
  { slug: "FLR-KE-NYAHURURU-MTC", name: "Nyahururu MTC", city: "Laikipia" },
  { slug: "FLR-KE-NYANCHWA", name: "Nyanchwa Adventist School of Health Sciences", city: "Kisii" },
  { slug: "FLR-KE-NZOIA", name: "Nzoia College of Nursing", city: "Trans Nzoia" },
  { slug: "FLR-KE-ORTUM", name: "Ortum Mission School of Nursing", city: "West Pokot" },
  { slug: "FLR-KE-OLL-MUTOMO", name: "Our Lady of Lourdes Mutomo Hospital", city: "Kitui" },
  { slug: "FLR-KE-OLL-MWEA", name: "Our Lady of Lourdes Mwea School of Nursing", city: "Kirinyaga" },
  { slug: "FLR-KE-OLA-MTC", name: "Our Lady of the Assumption Medical Training College", city: "Nairobi" },
  { slug: "FLR-KE-OUTSPAN-MTC", name: "Outspan MTC", city: "Nyeri" },
  { slug: "FLR-KE-PCEA-KIKUYU", name: "PCEA Kikuyu Hospital School of Nursing", city: "Kiambu" },
  { slug: "FLR-KE-PCEA-NAKURU-WEST", name: "PCEA Nakuru West", city: "Nakuru" },
  { slug: "FLR-KE-PCEA-NAKURU-WEST-SON", name: "PCEA Nakuru West School of Nursing", city: "Nakuru" },
  { slug: "FLR-KE-PCEA-TUMUTUMU", name: "PCEA Tumutumu Hospital Training College", city: "Nyeri" },
  { slug: "FLR-KE-PRES-RUBATE", name: "Presbyterian College of Health Sciences - Rubate", city: "Tharaka Nithi" },
  { slug: "FLR-KE-PRETATA", name: "Pretata Institute of Professional Studies", city: "Thika" },
  { slug: "FLR-KE-PUMWANI", name: "Pumwani Maternity College of Nursing and Midwifery", city: "Nairobi" },
  { slug: "FLR-KE-PWANI", name: "Pwani University", city: "Kilifi" },
  { slug: "FLR-KE-RAM", name: "RAM Training College", city: "Kisii" },
  { slug: "FLR-KE-SEKU", name: "South Eastern Kenya University (SEKU)", city: "Kitui" },
  { slug: "FLR-KE-SILOAM", name: "Siloam Hospital College of Health Sciences", city: "Kericho" },
  { slug: "FLR-KE-SR-LEONELLA", name: "Sister Leonella Consolata Medical College", city: "Nyeri" },
  { slug: "FLR-KE-SKILLWAVE", name: "Skillwave Medical Training College", city: "Laikipia" },
  { slug: "FLR-KE-ST-CAMILLUS-TABAKA", name: "St. Camillus Tabaka School of Nursing", city: "Kisii" },
  { slug: "FLR-KE-ST-CATHERINE", name: "St. Catherine School of Nursing", city: "Kisumu" },
  { slug: "FLR-KE-ST-CLARES-KAPLONG", name: "St. Clare's Kaplong School of Nursing", city: "Bomet" },
  { slug: "FLR-KE-ST-FRANCIS-NRB", name: "St. Francis School of Nursing", city: "Nairobi" },
  { slug: "FLR-KE-ST-JOSEPHS-NYABONDO", name: "St. Joseph's Medical Training College Nyabondo", city: "Kisumu" },
  { slug: "FLR-KE-ST-LUKES-KINANGOP", name: "St. Luke's North Kinangop School of Nursing", city: "Nyandarua" },
  { slug: "FLR-KE-ST-PAULS-UNI", name: "St. Paul's University", city: "Kiambu" },
  { slug: "FLR-KE-ST-THERESA-KIIRUA", name: "St. Theresa Kiirua College", city: "Meru" },
  { slug: "FLR-KE-TENWEK", name: "Tenwek Hospital College of Health Sciences", city: "Bomet" },
  { slug: "FLR-KE-THARAKA-UNI", name: "Tharaka University", city: "Tharaka Nithi" },
  { slug: "FLR-KE-NAIROBI-WOMENS", name: "The Nairobi Women's Hospital College", city: "Nairobi" },
  { slug: "FLR-KE-THIKA-MED", name: "Thika School of Medical and Health Sciences", city: "Kiambu" },
  { slug: "FLR-KE-TROPICAL-INST", name: "Tropical Institute of Community Health and Development", city: "Kisumu" },
  { slug: "FLR-KE-UMMA", name: "Umma University", city: "Kajiado" },
  { slug: "FLR-KE-USIU", name: "United States International University (USIU)", city: "Nairobi" },
  { slug: "FLR-KE-U-ELDORET", name: "University of Eldoret", city: "Eldoret" },
  { slug: "FLR-KE-U-EMBU", name: "University of Embu", city: "Embu" },
  { slug: "FLR-KE-UONBI", name: "University of Nairobi", city: "Nairobi" },
  { slug: "FLR-KE-UZIMA", name: "Uzima University", city: "Kisumu" },
  { slug: "FLR-KE-WAKA-CME", name: "Waka Continuing Medical Education Center (formerly Waka School of Nursing and Midwifery)", city: "Nyeri" },
  { slug: "FLR-KE-ZETECH", name: "Zetech University", city: "Nairobi" },
];

// United Kingdom - Guardian 2026 "Best UK universities for general nursing"
// league table (rows 1-76, including ties at 51 and 57) plus the 11 "Other
// universities that teach this subject" listed at the bottom of the page.
// 87 institutions total. No metrics persisted - we only need the institution
// roster to attribute candidates.
const UK_SCHOOLS = [
  // Ranked 1-25
  { slug: "FLR-UK-EDINBURGH", name: "University of Edinburgh", city: "Edinburgh" },
  { slug: "FLR-UK-NORTHUMBRIA", name: "Northumbria University", city: "Newcastle upon Tyne" },
  { slug: "FLR-UK-OXFORD-BROOKES", name: "Oxford Brookes University", city: "Oxford" },
  { slug: "FLR-UK-LIVERPOOL", name: "University of Liverpool", city: "Liverpool" },
  { slug: "FLR-UK-YORK", name: "University of York", city: "York" },
  { slug: "FLR-UK-ESSEX", name: "University of Essex", city: "Colchester" },
  { slug: "FLR-UK-PORTSMOUTH", name: "University of Portsmouth", city: "Portsmouth" },
  { slug: "FLR-UK-CARDIFF", name: "Cardiff University", city: "Cardiff" },
  { slug: "FLR-UK-ULSTER", name: "Ulster University", city: "Coleraine" },
  { slug: "FLR-UK-COVENTRY", name: "Coventry University", city: "Coventry" },
  { slug: "FLR-UK-NORTHAMPTON", name: "University of Northampton", city: "Northampton" },
  { slug: "FLR-UK-KINGSTON", name: "Kingston University", city: "Kingston upon Thames" },
  { slug: "FLR-UK-KCL", name: "King's College London", city: "London" },
  { slug: "FLR-UK-WEST-LONDON", name: "University of West London", city: "London" },
  { slug: "FLR-UK-GLASGOW", name: "University of Glasgow", city: "Glasgow" },
  { slug: "FLR-UK-SHEFFIELD", name: "University of Sheffield", city: "Sheffield" },
  { slug: "FLR-UK-KEELE", name: "Keele University", city: "Keele" },
  { slug: "FLR-UK-CHESTER", name: "University of Chester", city: "Chester" },
  { slug: "FLR-UK-SOUTHAMPTON", name: "University of Southampton", city: "Southampton" },
  { slug: "FLR-UK-EAST-LONDON", name: "University of East London", city: "London" },
  { slug: "FLR-UK-ROEHAMPTON", name: "University of Roehampton", city: "London" },
  { slug: "FLR-UK-BRADFORD", name: "University of Bradford", city: "Bradford" },
  { slug: "FLR-UK-SURREY", name: "University of Surrey", city: "Guildford" },
  { slug: "FLR-UK-LJMU", name: "Liverpool John Moores University", city: "Liverpool" },
  { slug: "FLR-UK-NOTTINGHAM", name: "University of Nottingham", city: "Nottingham" },
  // Ranked 26-50
  { slug: "FLR-UK-BUCKS-NEW", name: "Buckinghamshire New University", city: "High Wycombe" },
  { slug: "FLR-UK-LSBU", name: "London South Bank University", city: "London" },
  { slug: "FLR-UK-HERTFORDSHIRE", name: "University of Hertfordshire", city: "Hatfield" },
  { slug: "FLR-UK-MMU", name: "Manchester Metropolitan University", city: "Manchester" },
  { slug: "FLR-UK-CITY-ST-GEORGES", name: "City St George's, University of London", city: "London" },
  { slug: "FLR-UK-GREATER-MANCHESTER", name: "University of Greater Manchester", city: "Bolton" },
  { slug: "FLR-UK-QUB", name: "Queen's University Belfast", city: "Belfast" },
  { slug: "FLR-UK-BOURNEMOUTH", name: "Bournemouth University", city: "Bournemouth" },
  { slug: "FLR-UK-QUEEN-MARGARET", name: "Queen Margaret University", city: "Edinburgh" },
  { slug: "FLR-UK-PLYMOUTH", name: "University of Plymouth", city: "Plymouth" },
  { slug: "FLR-UK-NTU", name: "Nottingham Trent University", city: "Nottingham" },
  { slug: "FLR-UK-BEDFORDSHIRE", name: "University of Bedfordshire", city: "Luton" },
  { slug: "FLR-UK-TEESSIDE", name: "Teesside University", city: "Middlesbrough" },
  { slug: "FLR-UK-EDGE-HILL", name: "Edge Hill University", city: "Ormskirk" },
  { slug: "FLR-UK-SALFORD", name: "University of Salford", city: "Salford" },
  { slug: "FLR-UK-MANCHESTER", name: "University of Manchester", city: "Manchester" },
  { slug: "FLR-UK-GLOUCESTERSHIRE", name: "University of Gloucestershire", city: "Cheltenham" },
  { slug: "FLR-UK-BIRMINGHAM", name: "University of Birmingham", city: "Birmingham" },
  { slug: "FLR-UK-LEEDS-BECKETT", name: "Leeds Beckett University", city: "Leeds" },
  { slug: "FLR-UK-UWE", name: "University of the West of England", city: "Bristol" },
  { slug: "FLR-UK-UEA", name: "University of East Anglia", city: "Norwich" },
  { slug: "FLR-UK-LEEDS", name: "University of Leeds", city: "Leeds" },
  { slug: "FLR-UK-BCU", name: "Birmingham City University", city: "Birmingham" },
  { slug: "FLR-UK-HULL", name: "University of Hull", city: "Hull" },
  { slug: "FLR-UK-MIDDLESEX", name: "Middlesex University", city: "London" },
  // Ranked 51-76 (rows 51 and 57 are ties)
  { slug: "FLR-UK-DERBY", name: "University of Derby", city: "Derby" },
  { slug: "FLR-UK-SOUTH-WALES", name: "University of South Wales", city: "Pontypridd" },
  { slug: "FLR-UK-SHEFFIELD-HALLAM", name: "Sheffield Hallam University", city: "Sheffield" },
  { slug: "FLR-UK-CCCU", name: "Canterbury Christ Church University", city: "Canterbury" },
  { slug: "FLR-UK-GREENWICH", name: "University of Greenwich", city: "London" },
  { slug: "FLR-UK-BRIGHTON", name: "University of Brighton", city: "Brighton" },
  { slug: "FLR-UK-ARU", name: "Anglia Ruskin University", city: "Cambridge" },
  { slug: "FLR-UK-STAFFORDSHIRE", name: "Staffordshire University", city: "Stoke-on-Trent" },
  { slug: "FLR-UK-SUNDERLAND", name: "University of Sunderland", city: "Sunderland" },
  { slug: "FLR-UK-HUDDERSFIELD", name: "University of Huddersfield", city: "Huddersfield" },
  { slug: "FLR-UK-WINCHESTER", name: "University of Winchester", city: "Winchester" },
  { slug: "FLR-UK-SUFFOLK", name: "University of Suffolk", city: "Ipswich" },
  { slug: "FLR-UK-DMU", name: "De Montfort University", city: "Leicester" },
  { slug: "FLR-UK-DUNDEE", name: "University of Dundee", city: "Dundee" },
  { slug: "FLR-UK-SWANSEA", name: "Swansea University", city: "Swansea" },
  { slug: "FLR-UK-BANGOR", name: "Bangor University", city: "Bangor" },
  { slug: "FLR-UK-WOLVERHAMPTON", name: "University of Wolverhampton", city: "Wolverhampton" },
  { slug: "FLR-UK-WORCESTER", name: "University of Worcester", city: "Worcester" },
  { slug: "FLR-UK-NAPIER", name: "Edinburgh Napier University", city: "Edinburgh" },
  { slug: "FLR-UK-GCU", name: "Glasgow Caledonian University", city: "Glasgow" },
  { slug: "FLR-UK-UCLAN", name: "University of Central Lancashire", city: "Preston" },
  { slug: "FLR-UK-CUMBRIA", name: "University of Cumbria", city: "Carlisle" },
  { slug: "FLR-UK-LINCOLN", name: "University of Lincoln", city: "Lincoln" },
  { slug: "FLR-UK-RGU", name: "Robert Gordon University", city: "Aberdeen" },
  { slug: "FLR-UK-UWS", name: "University of the West of Scotland", city: "Paisley" },
  { slug: "FLR-UK-STIRLING", name: "University of Stirling", city: "Stirling" },
  // "Other universities that teach this subject" - not ranked in 2026 table
  { slug: "FLR-UK-ABERYSTWYTH", name: "Aberystwyth University", city: "Aberystwyth" },
  { slug: "FLR-UK-ASTON", name: "Aston University", city: "Birmingham" },
  { slug: "FLR-UK-BRUNEL", name: "Brunel University of London", city: "Uxbridge" },
  { slug: "FLR-UK-CHICHESTER", name: "University of Chichester", city: "Chichester" },
  { slug: "FLR-UK-WREXHAM", name: "Wrexham University", city: "Wrexham" },
  { slug: "FLR-UK-LEEDS-TRINITY", name: "Leeds Trinity University", city: "Leeds" },
  { slug: "FLR-UK-LEICESTER", name: "University of Leicester", city: "Leicester" },
  { slug: "FLR-UK-NEWMAN", name: "Newman University", city: "Birmingham" },
  { slug: "FLR-UK-SOLENT", name: "Solent University", city: "Southampton" },
  { slug: "FLR-UK-UHI", name: "University of the Highlands and Islands", city: "Inverness" },
  { slug: "FLR-UK-YORK-ST-JOHN", name: "York St John University", city: "York" },
];

// All schools merged for the seed loop.
const ALL_SCHOOLS = [
  ...PH_SCHOOLS.map((s) => ({ ...s, country: "Philippines" })),
  ...KE_SCHOOLS.map((s) => ({ ...s, country: "Kenya" })),
  ...UK_SCHOOLS.map((s) => ({ ...s, country: "United Kingdom" })),
];

const COHORTS = [
  // starts_at = first-Monday-of-month as a placeholder until the operator
  // confirms exact week-of-month for each city. The marketing landing renders
  // the date as "Jul 6, 2026" so it's a real-looking schedule, not "TBD".
  { code: "MNL-2026-07", name: "Manila · July 2026",     country: "Philippines", capacity: 30, lab: "Manila Hotel",     starts_at: "2026-07-06T00:00:00Z" },
  { code: "ACC-2026-08", name: "Accra · August 2026",    country: "Ghana",       capacity: 25, lab: "Accra University", starts_at: "2026-08-03T00:00:00Z" },
  { code: "NBO-2026-09", name: "Nairobi · September 2026", country: "Kenya",     capacity: 25, lab: "Nairobi Hotel",    starts_at: "2026-09-07T00:00:00Z" },
];

const SESSION_DATES = ["2026-05-04", "2026-05-05", "2026-05-06", "2026-05-07", "2026-05-08"];

const NAMES = {
  Philippines: ["Maria Santos", "Jomar Dela Cruz", "Angeline Reyes", "Mark Villanueva", "Kristine Bautista", "Patricia Gonzales", "Joshua Ramos", "Aira Mendoza", "Rommel Aquino", "Bea Castillo", "Carlo Navarro", "Divine Salazar", "Niko Pascual", "Trisha Domingo"],
  Ghana: ["Kwame Mensah", "Ama Owusu", "Kofi Boateng", "Akosua Adjei", "Yaw Asante", "Abena Darko", "Kwabena Osei", "Efua Annan", "Kojo Appiah", "Adwoa Frimpong", "Yaa Agyeman", "Kweku Ofori"],
  Kenya: ["Wanjiru Kamau", "Brian Otieno", "Achieng Odhiambo", "Mwangi Njoroge", "Faith Wambui", "Dennis Kiprono", "Cynthia Auma", "Samuel Mutua", "Grace Nyambura", "Victor Kibet", "Mercy Chebet", "Brian Wekesa"],
};

// Enrollment-stage mix (the production funnel).
const STAGE_MIX = [
  ["registered", 0.24],
  ["deposit_paid", 0.30],
  ["attending", 0.24],
  ["completed", 0.16],
  ["withdrawn", 0.06],
];

// Readiness band ranges by stage - later stages skew more exam-ready.
const READINESS = {
  registered: [0.3, 0.5],
  deposit_paid: [0.4, 0.62],
  attending: [0.55, 0.78],
  completed: [0.7, 0.93],
  withdrawn: [0.25, 0.45],
};

const NEEDS = [
  "management-of-care", "safety-infection-control", "health-promotion",
  "psychosocial-integrity", "basic-care-comfort", "pharmacological-therapies",
  "reduction-of-risk", "physiological-adaptation",
];
const KINDS = ["diagnostic", "nightly", "timed", "adaptive_exam"];

// Stay under the API's token-bucket refill (default 10 req/s) so a big seed
// doesn't trip rate limiting.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const THROTTLE_MS = Number(process.env.SEED_THROTTLE_MS || 130);

const authHeaders = (t) => ({ "content-type": "application/json", authorization: `Bearer ${t}` });

async function getToken() {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`token request failed (${res.status}): ${JSON.stringify(j)}`);
  return j.access_token;
}

async function post(path, t, body) {
  await sleep(THROTTLE_MS);
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: authHeaders(t), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const t = await getToken();
  for (const c of COHORTS) {
    try {
      await post("/v1/cohorts", t, {
        code: c.code,
        name: c.name,
        capacity: c.capacity,
        status: "active",
        starts_at: c.starts_at,
      });
    } catch {
      /* cohort may already exist on a reseed */
    }
  }
  let schools = 0;
  for (const s of ALL_SCHOOLS) {
    try {
      await post("/v1/schools", t, { ...s, tier: "eligible" });
      schools++;
    } catch {
      /* school may already exist on a reseed */
    }
  }

  let candidates = 0, deposits = 0, assessments = 0, attendance = 0, outcomes = 0;
  const stageCounts = {};
  for (const c of COHORTS) {
    const n = range(12, 16);
    // Shuffle a copy of this country's name pool so each cohort gets unique
    // students. Suffix with II/III/… if the pool runs out (pool < n cohort).
    const pool = [...NAMES[c.country]];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const suffix = (i) => (i === 0 ? "" : ` ${"II III IV V".split(" ")[i - 1] ?? `(${i + 1})`}`);
    for (let i = 0; i < n; i++) {
      const baseIdx = i % pool.length;
      const round = Math.floor(i / pool.length);
      const full_name = `${pool[baseIdx]}${suffix(round)}`;
      const cand = await post("/v1/candidates", t, {
        full_name,
        country: c.country,
        consent: { service: true },
      });
      const status = weighted(STAGE_MIX);
      stageCounts[status] = (stageCounts[status] ?? 0) + 1;
      await post("/v1/enrollments", t, { candidate_id: cand.id, cohort: c.code, status });

      if (status === "deposit_paid" || status === "attending" || status === "completed") {
        await post("/v1/payments", t, {
          candidate_id: cand.id, kind: "commitment_deposit", amount_cents: 10000,
          currency: "USD", status: "paid", processor: "stripe_test", processor_ref: `pi_seed_${cand.id}`,
        });
        deposits++;
      }

      const [lo, hi] = READINESS[status];
      const k = status === "registered" ? range(0, 1) : range(1, 3);
      let lastReadiness = null;
      for (let a = 0; a < k; a++) {
        const readiness = +(lo + rnd() * (hi - lo)).toFixed(3);
        lastReadiness = readiness;
        const by = {};
        for (const nd of NEEDS) by[nd] = +(0.3 + rnd() * 0.6).toFixed(2);
        await post("/v1/assessment-results", t, {
          candidate_id: cand.id, kind: pick(KINDS), readiness,
          theta: +((readiness - 0.5) * 3).toFixed(2), items_completed: range(25, 150), by_client_need: by,
        });
        assessments++;
      }

      // Attending/completed candidates get Live-Lab attendance for the week.
      if (status === "attending" || status === "completed") {
        for (const d of SESSION_DATES) {
          const s = weighted([["present", 0.78], ["late", 0.12], ["absent", 0.10]]);
          await post("/v1/attendance", t, {
            candidate_id: cand.id, cohort: c.code, location: c.lab, session_date: d, status: s,
          });
          attendance++;
        }
      }

      // Production outcomes - only for completed cohort members who cleared.
      if (status === "completed" && lastReadiness != null) {
        const passed = lastReadiness >= 0.6 && rnd() < 0.85;
        await post("/v1/outcomes", t, {
          candidate_id: cand.id, kind: "nclex_result", status: passed ? "pass" : "fail",
        });
        outcomes++;
        if (passed) {
          await post("/v1/outcomes", t, { candidate_id: cand.id, kind: "att_issued" });
          outcomes++;
          if (rnd() < 0.7) {
            await post("/v1/outcomes", t, { candidate_id: cand.id, kind: "employer_offer", status: "offered" });
            outcomes++;
          }
          if (rnd() < 0.5) {
            await post("/v1/outcomes", t, { candidate_id: cand.id, kind: "start" });
            outcomes++;
            if (rnd() < 0.6) {
              await post("/v1/outcomes", t, {
                candidate_id: cand.id, kind: "repayment", status: "active", amount_cents: 5000,
              });
              outcomes++;
            }
          }
        }
      }
      candidates++;
    }
  }
  console.log(`seeded: ${candidates} candidates, ${deposits} paid deposits, ${assessments} assessments, ${attendance} attendance, ${outcomes} outcomes, ${schools} schools across ${COHORTS.length} cohorts`);
  console.log("stage mix:", JSON.stringify(stageCounts));
}

main().catch((e) => {
  console.error("seed failed:", e.message);
  process.exit(1);
});
