import type { Happening } from "../types";

type Seed = Omit<Happening, "id" | "startsAt" | "endsAt" | "source" | "timezone" | "allDay"> & { allDay?: boolean } & {
  /** Month (1-12) and day the event starts, each year; `days` long. */
  month: number;
  day: number;
  days?: number;
  startHour?: number;
  endHour?: number;
  /** Repeats weekly on this weekday (0 = Sunday) instead of a fixed date. */
  weekly?: number;
};

const SEEDS: Seed[] = [
  { title: "AACA Eastern Division Fall Meet (Hershey car show & swap meet)", kind: "car_show", venue: "Hershey, PA", address: "Hersheypark Dr, Hershey, PA", lat: 40.2890, lng: -76.6560, month: 10, day: 7, days: 4, startHour: 7, endHour: 17, price: "Free to walk the show field", url: "https://www.aaca.org", description: "One of the largest antique car shows and swap meets in the world: thousands of vendor spaces, car corral and a judged show." },
  { title: "Fall Carlisle collector car swap meet", kind: "swap_meet", venue: "Carlisle Fairgrounds", address: "1000 Bryn Mawr Rd, Carlisle, PA", lat: 40.2010, lng: -77.2110, month: 10, day: 1, days: 5, startHour: 7, endHour: 18, price: "$15 daily", url: "https://www.carlisleevents.com" },
  { title: "Spring Carlisle collector car swap meet", kind: "swap_meet", venue: "Carlisle Fairgrounds", address: "1000 Bryn Mawr Rd, Carlisle, PA", lat: 40.2010, lng: -77.2110, month: 4, day: 22, days: 5, startHour: 7, endHour: 18, price: "$15 daily", url: "https://www.carlisleevents.com" },
  { title: "The World's Longest Yard Sale (US 127, Michigan to Alabama)", kind: "yard_sale", venue: "Along US Route 127 for 690 miles", address: "US-127, Addison, MI to Gadsden, AL", lat: 36.9400, lng: -85.0600, month: 8, day: 6, days: 4, allDay: true, price: "Free", url: "https://www.127yardsale.com", description: "Roadside vendors, barns and front yards along nearly 700 miles of highway. Pick any town on the route to stop." },
  { title: "Highway 411 Yard Sale (Georgia–Tennessee)", kind: "yard_sale", venue: "Along US 411", address: "US-411, Leeds, AL to Newport, TN", lat: 34.7600, lng: -84.7700, month: 10, day: 9, days: 3, allDay: true, price: "Free" },
  { title: "Route 11 Yard Crawl", kind: "yard_sale", venue: "Along US 11 in the Shenandoah Valley", address: "US-11, Stephens City to New Market, VA", lat: 38.8600, lng: -78.3100, month: 8, day: 9, days: 1, allDay: true, price: "Free" },
  { title: "Field of Screams haunted attractions", kind: "haunted", venue: "Field of Screams", address: "191 College Ave, Mountville, PA", lat: 40.0410, lng: -76.4310, month: 9, day: 12, days: 50, startHour: 19, endHour: 23, price: "$42–$65", url: "https://www.fieldofscreams.com" },
  { title: "Shocktoberfest scream park", kind: "haunted", venue: "Shocktoberfest", address: "94 Park Ave, Sinking Spring, PA", lat: 40.3170, lng: -76.0330, month: 9, day: 19, days: 45, startHour: 19, endHour: 23, price: "$35+", url: "https://www.shocktoberfest.com" },
  { title: "Hershey Sweet Lights drive-through holiday display", kind: "holiday_lights", venue: "Hershey Sweet Lights", address: "Sand Beach Rd, Hummelstown, PA", lat: 40.2740, lng: -76.6690, month: 11, day: 14, days: 50, startHour: 17, endHour: 22, price: "$30 per car", url: "https://www.hersheysweetlights.com" },
  { title: "Koziar's Christmas Village", kind: "holiday_lights", venue: "Koziar's Christmas Village", address: "782 Christmas Village Rd, Bernville, PA", lat: 40.4530, lng: -76.1330, month: 11, day: 1, days: 62, startHour: 17, endHour: 21, price: "$14", url: "https://koziarschristmasvillage.com" },
  { title: "Christmas Candylane at Hersheypark", kind: "holiday_lights", venue: "Hersheypark", address: "100 Hersheypark Dr, Hershey, PA", lat: 40.2880, lng: -76.6540, month: 11, day: 14, days: 48, startHour: 16, endHour: 21, price: "From $40", url: "https://www.hersheypark.com" },
  { title: "York State Fair", kind: "fair", venue: "York Expo Center", address: "334 Carlisle Ave, York, PA", lat: 39.9560, lng: -76.7550, month: 7, day: 24, days: 10, startHour: 10, endHour: 22, price: "$10", url: "https://www.yorkstatefair.org" },
  { title: "Elizabethtown Fair", kind: "fair", venue: "Elizabethtown Fairgrounds", address: "900 E High St, Elizabethtown, PA", lat: 40.1550, lng: -76.5900, month: 8, day: 18, days: 6, startHour: 9, endHour: 22, price: "Free" },
  { title: "Indiana State Fair", kind: "fair", venue: "Indiana State Fairgrounds", address: "1202 E 38th St, Indianapolis, IN", lat: 39.8270, lng: -86.1340, month: 8, day: 1, days: 17, startHour: 9, endHour: 22, price: "$12", url: "https://www.indianastatefair.com" },
  { title: "Ohio State Fair", kind: "fair", venue: "Ohio Expo Center", address: "717 E 17th Ave, Columbus, OH", lat: 40.0050, lng: -82.9900, month: 7, day: 23, days: 12, startHour: 9, endHour: 22, price: "$10", url: "https://ohiostatefair.com" },
  { title: "Illinois State Fair", kind: "fair", venue: "Illinois State Fairgrounds", address: "801 E Sangamon Ave, Springfield, IL", lat: 39.8300, lng: -89.6400, month: 8, day: 7, days: 10, startHour: 9, endHour: 22, price: "$10", url: "https://statefair.illinois.gov" },
  { title: "Kutztown Folk Festival", kind: "festival", venue: "Kutztown Fairgrounds", address: "225 N Whiteoak St, Kutztown, PA", lat: 40.5240, lng: -75.7770, month: 6, day: 28, days: 9, startHour: 10, endHour: 19, price: "$14", url: "https://www.kutztownfestival.com" },
  { title: "Pennsylvania Renaissance Faire", kind: "festival", venue: "Mount Hope Estate", address: "2775 Lebanon Rd, Manheim, PA", lat: 40.2340, lng: -76.4300, month: 8, day: 9, days: 80, startHour: 11, endHour: 20, price: "$35", url: "https://parenfaire.com", description: "Weekends only." },
  { title: "Root's Country Market & Auction (every Tuesday)", kind: "flea_market", venue: "Root's Country Market", address: "705 Graystone Rd, Manheim, PA", lat: 40.1016, lng: -76.4070, month: 1, day: 1, weekly: 2, startHour: 9, endHour: 21, price: "Free" },
  { title: "Green Dragon Farmers Market & Auction (every Friday)", kind: "flea_market", venue: "Green Dragon", address: "955 N State St, Ephrata, PA", lat: 40.1850, lng: -76.1690, month: 1, day: 1, weekly: 5, startHour: 9, endHour: 21, price: "Free" },
  { title: "Shipshewana Flea Market (Tuesdays & Wednesdays)", kind: "flea_market", venue: "Shipshewana Auction & Flea Market", address: "345 S Van Buren St, Shipshewana, IN", lat: 41.6710, lng: -85.5800, month: 1, day: 1, weekly: 2, startHour: 8, endHour: 16, price: "Free", url: "https://www.shipshewanatradingplace.com" },
  { title: "Lancaster Central Market (Tue, Fri, Sat)", kind: "market", venue: "Lancaster Central Market", address: "23 N Market St, Lancaster, PA", lat: 40.0383, lng: -76.3066, month: 1, day: 1, weekly: 6, startHour: 6, endHour: 15, price: "Free" },
  { title: "Summer concert at Hersheypark Stadium", kind: "concert", venue: "Hersheypark Stadium", address: "100 Hersheypark Dr, Hershey, PA", lat: 40.2850, lng: -76.6520, month: 7, day: 12, days: 1, startHour: 19, endHour: 23, price: "$59+", url: "https://www.hersheyentertainment.com" },
  { title: "Carlisle Chrysler Nationals", kind: "car_show", venue: "Carlisle Fairgrounds", address: "1000 Bryn Mawr Rd, Carlisle, PA", lat: 40.2010, lng: -77.2110, month: 7, day: 10, days: 3, startHour: 7, endHour: 18, price: "$15", url: "https://www.carlisleevents.com" },
  { title: "Street Rod Nationals East", kind: "car_show", venue: "York Expo Center", address: "334 Carlisle Ave, York, PA", lat: 39.9560, lng: -76.7550, month: 5, day: 29, days: 3, startHour: 8, endHour: 17, price: "$20" },
  { title: "Lancaster Barnstormers home game", kind: "sports", venue: "Clipper Magazine Stadium", address: "650 N Prince St, Lancaster, PA", lat: 40.0470, lng: -76.3100, month: 1, day: 1, weekly: 6, startHour: 18, endHour: 21, price: "$12+" },
];

/** Expand the seeds into dated events around `now`: this year's and next year's dates, and the next eight weekly occurrences. */
export function DEMO_HAPPENINGS(now: Date): Array<Omit<Happening, "timezone">> {
  const out: Array<Omit<Happening, "timezone">> = [];
  const y = now.getUTCFullYear();
  SEEDS.forEach((s, i) => {
    const { month, day, days = 1, startHour = 9, endHour = 17, weekly, ...rest } = s;
    if (weekly != null) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      while (d.getUTCDay() !== weekly) d.setUTCDate(d.getUTCDate() + 1);
      for (let k = 0; k < 8; k++) {
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7 * k, startHour + 5));
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7 * k, endHour + 5));
        out.push({ ...rest, id: `demo-ev-${i}-w${k}`, startsAt: start.toISOString(), endsAt: end.toISOString(), allDay: false, source: "demo" });
      }
      return;
    }
    for (const year of [y - 1, y, y + 1]) {
      // Eastern time is UTC-5/-4; the seeds are all in the eastern US, so offset by 5 hours.
      const start = new Date(Date.UTC(year, month - 1, day, startHour + 5));
      const end = new Date(Date.UTC(year, month - 1, day + days - 1, endHour + 5));
      if (end < new Date(now.getTime() - 30 * 86400_000)) continue;
      out.push({ ...rest, id: `demo-ev-${i}-${year}`, startsAt: start.toISOString(), endsAt: end.toISOString(), allDay: rest.allDay ?? false, source: "demo" });
    }
  });
  return out;
}
