declare module "tz-lookup" {
  /** IANA time zone for a latitude/longitude. Throws on invalid input. */
  export default function tzlookup(lat: number, lng: number): string;
}
