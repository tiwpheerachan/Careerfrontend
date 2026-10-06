/**
 * The offices shown on the home page globe. `code` is the ISO country code the
 * jobs are stored with, so an office's openings are `jobs.countryCode === code`
 * and "View all" links to /jobs?country=<code>. Labels and taglines are in
 * messages (home.offices.items.<code>).
 */
export interface Office {
  code: string;
  lat: number;
  lng: number;
}

export const OFFICES: Office[] = [
  { code: 'TH', lat: 13.7563, lng: 100.5018 },
  { code: 'CN', lat: 31.2304, lng: 121.4737 },
  { code: 'ID', lat: -6.2088, lng: 106.8456 },
  { code: 'PH', lat: 14.5995, lng: 120.9842 },
  { code: 'VN', lat: 21.0278, lng: 105.8342 },
  { code: 'BR', lat: -23.5505, lng: -46.6333 },
  { code: 'MX', lat: 19.4326, lng: -99.1332 },
];

/** Desktop/tablet background; the portrait one is used up to 640px. */
export const officeBg = (code: string) => `/images/offices/${code.toLowerCase()}-bg.jpg`;
export const officeBgMobile = (code: string) => `/images/offices/mobile/${code.toLowerCase()}-bg.jpg`;

/** What a job tile needs — the client gets only this, not the whole job. */
export interface HomeJob {
  code: string;
  title: string;
  countryCode: string;
  department: string | null;
  level: string | null;
}
