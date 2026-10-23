/**
 * Bundled sample data so RouteDiscover runs with no network access.
 *
 * Coordinates are approximate and listings are illustrative. The UI labels
 * results from this file as sample data. Live mode replaces all of it with
 * OpenStreetMap, OSRM and Open Charge Map results.
 */
import type { CategoryId, GeoResult, LatLng } from "../types";

export type DemoNode = LatLng & { id: string; name: string };

/** I-80 / I-90 / I-76 corridor: Chicago → Lancaster. */
const NORTH: DemoNode[] = [
  { id: "chicago", name: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { id: "gary", name: "Gary, IN", lat: 41.5934, lng: -87.3464 },
  { id: "portage", name: "Portage, IN", lat: 41.5759, lng: -87.1761 },
  { id: "laporte", name: "La Porte, IN", lat: 41.6106, lng: -86.7225 },
  { id: "southbend", name: "South Bend, IN", lat: 41.7101, lng: -86.2525 },
  { id: "elkhart", name: "Elkhart, IN", lat: 41.6939, lng: -85.9767 },
  { id: "angola", name: "Angola, IN", lat: 41.6348, lng: -84.9994 },
  { id: "toledo", name: "Toledo, OH", lat: 41.5847, lng: -83.6563 },
  { id: "fremont", name: "Fremont, OH", lat: 41.3503, lng: -83.1219 },
  { id: "sandusky", name: "Sandusky, OH", lat: 41.3200, lng: -82.6500 },
  { id: "elyria", name: "Elyria, OH", lat: 41.3800, lng: -82.1000 },
  { id: "streetsboro", name: "Streetsboro, OH", lat: 41.2800, lng: -81.3300 },
  { id: "youngstown", name: "Youngstown, OH", lat: 41.0998, lng: -80.6495 },
  { id: "newcastle", name: "New Castle, PA", lat: 40.9600, lng: -80.3400 },
  { id: "cranberry", name: "Cranberry Township, PA", lat: 40.6845, lng: -80.1070 },
  { id: "monroeville", name: "Monroeville, PA", lat: 40.4212, lng: -79.7881 },
  { id: "newstanton", name: "New Stanton, PA", lat: 40.2234, lng: -79.6095 },
  { id: "somerset", name: "Somerset, PA", lat: 40.0084, lng: -79.0781 },
  { id: "bedford", name: "Bedford, PA", lat: 40.0187, lng: -78.5039 },
  { id: "breezewood", name: "Breezewood, PA", lat: 39.9990, lng: -78.2440 },
  { id: "carlisle", name: "Carlisle, PA", lat: 40.2010, lng: -77.2003 },
  { id: "harrisburg", name: "Harrisburg, PA", lat: 40.2732, lng: -76.8867 },
  { id: "elizabethtown", name: "Elizabethtown, PA", lat: 40.1529, lng: -76.6027 },
  { id: "lancaster", name: "Lancaster, PA", lat: 40.0379, lng: -76.3055 },
];

/** I-70 / I-79 corridor: Springfield IL → joins the turnpike at New Stanton. */
const SOUTH: DemoNode[] = [
  { id: "springfield", name: "Springfield, IL", lat: 39.7817, lng: -89.6501 },
  { id: "effingham", name: "Effingham, IL", lat: 39.1200, lng: -88.5434 },
  { id: "terrehaute", name: "Terre Haute, IN", lat: 39.4667, lng: -87.4139 },
  { id: "indianapolis", name: "Indianapolis, IN", lat: 39.7684, lng: -86.1581 },
  { id: "richmond", name: "Richmond, IN", lat: 39.8289, lng: -84.8902 },
  { id: "dayton", name: "Dayton, OH", lat: 39.7589, lng: -84.1916 },
  { id: "columbus", name: "Columbus, OH", lat: 39.9612, lng: -82.9988 },
  { id: "zanesville", name: "Zanesville, OH", lat: 39.9403, lng: -82.0132 },
  { id: "wheeling", name: "Wheeling, WV", lat: 40.0640, lng: -80.7209 },
  { id: "washingtonpa", name: "Washington, PA", lat: 40.1740, lng: -80.2462 },
  { id: "newstanton", name: "New Stanton, PA", lat: 40.2234, lng: -79.6095 },
];

/** Extra geocodable places that are not corridor nodes. */
const EXTRA_PLACES: DemoNode[] = [
  { id: "naperville", name: "Naperville, IL", lat: 41.7508, lng: -88.1535 },
  { id: "joliet", name: "Joliet, IL", lat: 41.5250, lng: -88.0817 },
  { id: "peoria", name: "Peoria, IL", lat: 40.6936, lng: -89.5890 },
  { id: "bloomington", name: "Bloomington, IL", lat: 40.4842, lng: -88.9937 },
  { id: "champaign", name: "Champaign, IL", lat: 40.1164, lng: -88.2434 },
  { id: "rockford", name: "Rockford, IL", lat: 42.2711, lng: -89.0940 },
  { id: "cleveland", name: "Cleveland, OH", lat: 41.4993, lng: -81.6944 },
  { id: "pittsburgh", name: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959 },
  { id: "hershey", name: "Hershey, PA", lat: 40.2859, lng: -76.6502 },
  { id: "gettysburg", name: "Gettysburg, PA", lat: 39.8309, lng: -77.2311 },
  { id: "philadelphia", name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652 },
  { id: "york", name: "York, PA", lat: 39.9626, lng: -76.7277 },
  { id: "strasburg", name: "Strasburg, PA", lat: 39.9834, lng: -76.1844 },
  { id: "intercourse", name: "Intercourse, PA", lat: 40.0376, lng: -76.1047 },
  { id: "birdinhand", name: "Bird-in-Hand, PA", lat: 40.0384, lng: -76.1822 },
];

export const DEMO_GEOCODE: DemoNode[] = [
  ...NORTH,
  ...SOUTH.filter((n) => n.id !== "newstanton"),
  ...EXTRA_PLACES,
];

/** Graph edges: consecutive corridor nodes, both corridors share "newstanton". */
export const DEMO_GRAPH: { nodes: Map<string, DemoNode>; edges: Map<string, string[]> } = (() => {
  const nodes = new Map<string, DemoNode>();
  const edges = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    edges.set(a, [...(edges.get(a) ?? []), b]);
    edges.set(b, [...(edges.get(b) ?? []), a]);
  };
  for (const corridor of [NORTH, SOUTH]) {
    corridor.forEach((n, i) => {
      nodes.set(n.id, n);
      if (i > 0) link(corridor[i - 1].id, n.id);
    });
  }
  // Spurs so common destinations snap onto the network sensibly.
  for (const n of EXTRA_PLACES) nodes.set(n.id, n);
  link("chicago", "naperville");
  link("naperville", "joliet");
  link("joliet", "bloomington");
  link("bloomington", "springfield");
  link("bloomington", "peoria");
  link("champaign", "effingham");
  link("champaign", "bloomington");
  link("rockford", "chicago");
  link("streetsboro", "cleveland");
  link("elyria", "cleveland");
  link("monroeville", "pittsburgh");
  link("washingtonpa", "pittsburgh");
  link("harrisburg", "hershey");
  link("hershey", "elizabethtown");
  link("carlisle", "gettysburg");
  link("gettysburg", "york");
  link("york", "lancaster");
  link("lancaster", "strasburg");
  link("lancaster", "birdinhand");
  link("birdinhand", "intercourse");
  link("lancaster", "philadelphia");
  return { nodes, edges };
})();

export const DEMO_GEORESULTS: GeoResult[] = DEMO_GEOCODE.map((n) => ({
  label: n.name,
  lat: n.lat,
  lng: n.lng,
}));

export type DemoPlace = {
  name: string;
  category: CategoryId;
  lat: number;
  lng: number;
  address?: string;
  website?: string;
  openingHours?: string;
  tags?: Record<string, string>;
};

export const DEMO_PLACES: DemoPlace[] = [
  // Illinois
  { name: "Lincoln Tomb State Historic Site", category: "landmarks", lat: 39.8236, lng: -89.6563, address: "Springfield, IL", openingHours: "Mo-Su 09:00-17:00" },
  { name: "Old State Capitol", category: "historic_buildings", lat: 39.8006, lng: -89.6479, address: "Springfield, IL", openingHours: "Tu-Sa 09:00-17:00" },
  { name: "Cloud Gate (The Bean)", category: "landmarks", lat: 41.8827, lng: -87.6233, address: "Chicago, IL", openingHours: "24/7" },
  { name: "Soldiers' and Sailors' Monument", category: "landmarks", lat: 39.7685, lng: -86.1580, address: "Indianapolis, IN", openingHours: "Fr-Su 10:30-17:30" },
  { name: "Marblehead Lighthouse", category: "landmarks", lat: 41.5366, lng: -82.7117, address: "Marblehead, OH", openingHours: "Mo-Su 09:00-17:00" },
  { name: "Stan Hywet Hall & Gardens", category: "historic_buildings", lat: 41.1310, lng: -81.5520, address: "Akron, OH", openingHours: "Tu-Su 10:00-16:30" },
  { name: "Pennsylvania Memorial (Gettysburg)", category: "landmarks", lat: 39.8060, lng: -77.2350, address: "Gettysburg, PA", openingHours: "Mo-Su 06:00-19:00" },
  { name: "Ephrata Cloister", category: "historic_buildings", lat: 40.1800, lng: -76.1810, address: "Ephrata, PA", openingHours: "We-Sa 09:00-17:00; Su 12:00-17:00" },
  { name: "Rock Ford Plantation", category: "historic_buildings", lat: 40.0210, lng: -76.2920, address: "Lancaster, PA", openingHours: "We-Sa 10:00-16:00; Su 12:00-16:00" },
  { name: "Lancaster County Courthouse (Old)", category: "historic_buildings", lat: 40.0386, lng: -76.3040, address: "Lancaster, PA" },
  { name: "Abraham Lincoln Presidential Museum", category: "historic", lat: 39.8027, lng: -89.6457, address: "Springfield, IL" },
  { name: "Lincoln Home National Historic Site", category: "historic", lat: 39.7976, lng: -89.6446, address: "Springfield, IL" },
  { name: "Cozy Dog Drive In", category: "food", lat: 39.7627, lng: -89.6528, address: "Springfield, IL", openingHours: "Mo-Sa 08:00-20:00" },
  { name: "Millennium Park", category: "outdoors", lat: 41.8826, lng: -87.6226, address: "Chicago, IL" },
  { name: "Art Institute of Chicago", category: "attractions", lat: 41.8796, lng: -87.6237, address: "Chicago, IL", openingHours: "Mo,Th-Su 11:00-17:00" },
  { name: "Lou Malnati's Pizzeria", category: "food", lat: 41.8903, lng: -87.6337, address: "Chicago, IL", openingHours: "Mo-Su 11:00-23:00" },
  { name: "Kane County Flea Market", category: "flea", lat: 41.9170, lng: -88.3090, address: "St. Charles, IL" },
  // Indiana
  { name: "Indiana Dunes National Park", category: "outdoors", lat: 41.6533, lng: -87.0524, address: "Porter, IN" },
  { name: "Studebaker National Museum", category: "attractions", lat: 41.6726, lng: -86.2600, address: "South Bend, IN" },
  { name: "University of Notre Dame Basilica", category: "historic", lat: 41.7031, lng: -86.2394, address: "Notre Dame, IN" },
  { name: "RV/MH Hall of Fame", category: "attractions", lat: 41.7103, lng: -85.9031, address: "Elkhart, IN" },
  { name: "Shipshewana Flea Market", category: "flea", lat: 41.6734, lng: -85.5766, address: "Shipshewana, IN" },
  { name: "Pokagon State Park", category: "outdoors", lat: 41.7138, lng: -85.0289, address: "Angola, IN" },
  { name: "Indianapolis Motor Speedway Museum", category: "attractions", lat: 39.7954, lng: -86.2352, address: "Speedway, IN" },
  { name: "Children's Museum of Indianapolis", category: "kids", lat: 39.8104, lng: -86.1577, address: "Indianapolis, IN" },
  { name: "Candlewick Antique Mall", category: "antiques", lat: 39.4760, lng: -87.4100, address: "Terre Haute, IN" },
  // Ohio
  { name: "Toledo Museum of Art", category: "attractions", lat: 41.6584, lng: -83.5596, address: "Toledo, OH", openingHours: "We-Su 11:00-17:00" },
  { name: "Toledo Zoo", category: "kids", lat: 41.6225, lng: -83.5782, address: "Toledo, OH" },
  { name: "Tony Packo's Cafe", category: "food", lat: 41.6598, lng: -83.5010, address: "Toledo, OH" },
  { name: "Cedar Point", category: "amusement", lat: 41.4822, lng: -82.6835, address: "Sandusky, OH" },
  { name: "Merry-Go-Round Museum", category: "attractions", lat: 41.4539, lng: -82.7110, address: "Sandusky, OH" },
  { name: "Rock & Roll Hall of Fame", category: "attractions", lat: 41.5085, lng: -81.6954, address: "Cleveland, OH", openingHours: "Mo-Su 10:00-17:00" },
  { name: "West Side Market", category: "shopping", lat: 41.4846, lng: -81.7035, address: "Cleveland, OH" },
  { name: "Cuyahoga Valley National Park", category: "outdoors", lat: 41.2808, lng: -81.5678, address: "Brecksville, OH" },
  { name: "Medina Antique Mall", category: "antiques", lat: 41.1337, lng: -81.8639, address: "Medina, OH" },
  { name: "Ohio Statehouse", category: "historic", lat: 39.9612, lng: -82.9988, address: "Columbus, OH" },
  { name: "North Market", category: "food", lat: 39.9718, lng: -83.0036, address: "Columbus, OH", openingHours: "Mo-Sa 09:00-19:00; Su 10:00-17:00" },
  { name: "National Museum of the U.S. Air Force", category: "attractions", lat: 39.7816, lng: -84.1086, address: "Dayton, OH" },
  { name: "Springfield Antique Show & Flea Market", category: "flea", lat: 39.9323, lng: -83.8080, address: "Springfield, OH" },
  // West Virginia / Pennsylvania
  { name: "Oglebay Park", category: "outdoors", lat: 40.1004, lng: -80.6749, address: "Wheeling, WV" },
  { name: "Primanti Bros. (Strip District)", category: "food", lat: 40.4505, lng: -79.9843, address: "Pittsburgh, PA", openingHours: "24/7" },
  { name: "Carnegie Museum of Natural History", category: "attractions", lat: 40.4434, lng: -79.9496, address: "Pittsburgh, PA" },
  { name: "Duquesne Incline", category: "attractions", lat: 40.4395, lng: -80.0180, address: "Pittsburgh, PA", openingHours: "Mo-Su 05:30-00:45" },
  { name: "Flight 93 National Memorial", category: "historic", lat: 40.0521, lng: -78.9040, address: "Stoystown, PA" },
  { name: "Fallingwater", category: "historic", lat: 39.9064, lng: -79.4681, address: "Mill Run, PA" },
  { name: "Ohiopyle State Park", category: "outdoors", lat: 39.8681, lng: -79.4936, address: "Ohiopyle, PA" },
  { name: "Old Bedford Village", category: "historic", lat: 40.0459, lng: -78.5094, address: "Bedford, PA" },
  { name: "Gateway Travel Plaza", category: "rest", lat: 39.9992, lng: -78.2367, address: "Breezewood, PA" },
  { name: "Sideling Hill Service Plaza", category: "rest", lat: 40.0450, lng: -78.0350, address: "PA Turnpike" },
  { name: "U.S. Army Heritage and Education Center", category: "historic", lat: 40.2090, lng: -77.1600, address: "Carlisle, PA" },
  { name: "Gettysburg National Military Park", category: "historic", lat: 39.8120, lng: -77.2254, address: "Gettysburg, PA", openingHours: "Mo-Su 06:00-19:00" },
  { name: "Pennsylvania State Capitol", category: "historic", lat: 40.2644, lng: -76.8836, address: "Harrisburg, PA", openingHours: "Mo-Fr 08:30-16:00; Sa-Su 09:00-16:00" },
  { name: "Broad Street Market", category: "food", lat: 40.2686, lng: -76.8878, address: "Harrisburg, PA", openingHours: "We-Sa 07:00-16:00" },
  { name: "Hersheypark", category: "amusement", lat: 40.2881, lng: -76.6544, address: "Hershey, PA" },
  { name: "Hershey's Chocolate World", category: "attractions", lat: 40.2884, lng: -76.6534, address: "Hershey, PA", openingHours: "Mo-Su 09:00-20:00" },
  { name: "Antique Automobile Club of America Museum", category: "attractions", lat: 40.2687, lng: -76.6800, address: "Hershey, PA", openingHours: "Mo-Su 09:00-17:00" },
  { name: "Indian Echo Caverns", category: "caves", lat: 40.2456, lng: -76.7220, address: "Hummelstown, PA", openingHours: "Mo-Su 10:00-16:00" },
  // Lancaster County
  { name: "Lancaster Central Market", category: "food", lat: 40.0383, lng: -76.3066, address: "Lancaster, PA", openingHours: "Tu,Fr 06:00-16:00; Sa 06:00-14:00" },
  { name: "Lancaster County Convention Center", category: "entertainment", lat: 40.0375, lng: -76.3051, address: "Lancaster, PA" },
  { name: "Fulton Theatre", category: "entertainment", lat: 40.0378, lng: -76.3078, address: "Lancaster, PA", openingHours: "Tu-Su 12:00-20:00" },
  { name: "North Museum of Nature and Science", category: "kids", lat: 40.0453, lng: -76.3210, address: "Lancaster, PA", openingHours: "We-Sa 10:00-17:00; Su 12:00-17:00" },
  { name: "Lancaster County Park", category: "outdoors", lat: 40.0180, lng: -76.2780, address: "Lancaster, PA", openingHours: "Mo-Su 06:00-21:00" },
  { name: "Wheatland (James Buchanan Home)", category: "historic", lat: 40.0426, lng: -76.3400, address: "Lancaster, PA", openingHours: "Mo-Sa 10:00-16:00" },
  { name: "Landis Valley Village & Farm Museum", category: "historic", lat: 40.0920, lng: -76.2840, address: "Lancaster, PA", openingHours: "We-Sa 09:00-17:00; Su 12:00-17:00" },
  { name: "Dutch Wonderland", category: "amusement", lat: 40.0319, lng: -76.2225, address: "Lancaster, PA", openingHours: "Sa-Su 10:00-18:00" },
  { name: "Tanger Outlets Lancaster", category: "shopping", lat: 40.0302, lng: -76.2152, address: "Lancaster, PA", openingHours: "Mo-Sa 09:00-21:00; Su 10:00-18:00" },
  { name: "Rockvale Outlets", category: "shopping", lat: 40.0270, lng: -76.2250, address: "Lancaster, PA", openingHours: "Mo-Sa 10:00-20:00; Su 11:00-18:00" },
  { name: "Strasburg Rail Road", category: "attractions", lat: 39.9816, lng: -76.1580, address: "Ronks, PA", openingHours: "Mo-Su 10:00-17:00" },
  { name: "Railroad Museum of Pennsylvania", category: "attractions", lat: 39.9832, lng: -76.1600, address: "Strasburg, PA" },
  { name: "Sight & Sound Theatres", category: "entertainment", lat: 39.9960, lng: -76.1830, address: "Ronks, PA" },
  { name: "Kitchen Kettle Village", category: "specialty", lat: 40.0372, lng: -76.1125, address: "Intercourse, PA" },
  { name: "Bird-in-Hand Farmers Market", category: "food", lat: 40.0375, lng: -76.1860, address: "Bird-in-Hand, PA" },
  { name: "Amish Farm and House", category: "attractions", lat: 40.0362, lng: -76.2300, address: "Lancaster, PA" },
  { name: "Root's Country Market & Auction", category: "flea", lat: 40.1016, lng: -76.4070, address: "Manheim, PA" },
  { name: "Adamstown Antiques Mall", category: "antiques", lat: 40.2420, lng: -76.0600, address: "Adamstown, PA" },
  { name: "Renningers Antique Market", category: "flea", lat: 40.2470, lng: -76.0650, address: "Adamstown, PA" },
  { name: "Green Dragon Farmers Market & Auction", category: "flea", lat: 40.1850, lng: -76.1690, address: "Ephrata, PA" },
  { name: "Shady Maple Smorgasbord", category: "buffets", lat: 40.1340, lng: -76.0380, address: "East Earl, PA" },
  { name: "Prince Street Cafe", category: "coffee", lat: 40.0392, lng: -76.3090, address: "Lancaster, PA" },
  { name: "Passenger Coffee", category: "coffee", lat: 40.0388, lng: -76.3010, address: "Lancaster, PA" },
  { name: "Lancaster Brewing Company", category: "food", lat: 40.0468, lng: -76.2990, address: "Lancaster, PA" },
  { name: "Sheetz", category: "travel", lat: 40.0340, lng: -76.2440, address: "Lancaster, PA" },
  { name: "Wawa", category: "travel", lat: 40.0600, lng: -76.3350, address: "Lancaster, PA" },
  { name: "Lancaster Shopping Center", category: "groceries", lat: 40.0600, lng: -76.3100, address: "Lancaster, PA" },
  { name: "Turkey Hill", category: "travel", lat: 40.0470, lng: -76.2600, address: "Lancaster, PA" },
  { name: "Longwood Gardens", category: "outdoors", lat: 39.8711, lng: -75.6744, address: "Kennett Square, PA" },
  { name: "Nissley Vineyards & Winery Estate", category: "wine", lat: 40.1190, lng: -76.6130, address: "Bainbridge, PA", openingHours: "Mo-Sa 10:00-17:00; Su 12:00-16:00" },
  { name: "Waltz Vineyards Estate Winery", category: "wine", lat: 40.1570, lng: -76.3950, address: "Manheim, PA", openingHours: "Th-Su 12:00-18:00" },
  { name: "Lancaster Brewing Company Taproom", category: "wine", lat: 40.0468, lng: -76.2990, address: "Lancaster, PA", openingHours: "Mo-Su 11:30-22:00" },
  { name: "Australian Walkabout Inn Bed & Breakfast", category: "bnb", lat: 40.0300, lng: -76.1900, address: "Lancaster, PA" },
  { name: "The Spa at the Hotel Hershey", category: "spa", lat: 40.2930, lng: -76.6480, address: "Hershey, PA", openingHours: "Mo-Su 08:00-20:00" },
  { name: "Overlook Golf Course", category: "golf", lat: 40.0810, lng: -76.3300, address: "Lancaster, PA", openingHours: "Mo-Su 07:00-19:00" },
  { name: "Village Greens Miniature Golf", category: "minigolf", lat: 39.9730, lng: -76.1660, address: "Strasburg, PA", openingHours: "Mo-Su 10:00-21:00" },
  { name: "Adventure Sports in Hershey (go-karts, mini golf)", category: "gokarts", lat: 40.2830, lng: -76.6170, address: "Hershey, PA", openingHours: "Mo-Su 10:00-22:00" },
  { name: "Refreshing Mountain Zip Lines", category: "gokarts", lat: 40.2130, lng: -76.2290, address: "Stevens, PA", openingHours: "Mo-Sa 09:00-17:00" },
  { name: "Kelly's Run Trail", category: "hiking", lat: 39.8330, lng: -76.3340, address: "Holtwood, PA", tags: { distance: "4.5 mi", sac_scale: "mountain_hiking" } },
  { name: "Conestoga Trail (Pinnacle Overlook)", category: "hiking", lat: 39.8180, lng: -76.3260, address: "Holtwood, PA", tags: { distance: "2 mi", sac_scale: "hiking" } },
  { name: "Northwest Lancaster County River Trail", category: "biking", lat: 40.0700, lng: -76.5300, address: "Columbia, PA", tags: { distance: "14 mi", surface: "paved" } },
  { name: "Pequea Boat Launch", category: "boating", lat: 39.8880, lng: -76.3620, address: "Pequea, PA" },
  { name: "Long Level Marina", category: "boating", lat: 39.9680, lng: -76.5330, address: "Wrightsville, PA", openingHours: "Mo-Su 08:00-18:00" },
  { name: "Berkeley Springs State Park (warm springs)", category: "hotsprings", lat: 39.6260, lng: -78.2280, address: "Berkeley Springs, WV", openingHours: "Mo-Su 10:00-18:00" },
  { name: "Rausch Creek Off-Road Park", category: "offroad", lat: 40.6280, lng: -76.5720, address: "Pine Grove, PA", openingHours: "Sa-Su 08:00-17:00" },
  { name: "Michaux State Forest dispersed camping", category: "camping_free", lat: 40.0000, lng: -77.4000, address: "Michaux State Forest, PA", tags: { fee: "no", operator: "PA DCNR" } },
  { name: "Alabama Hills Recreation Area (BLM)", category: "camping_free", lat: 36.6080, lng: -118.1250, address: "Lone Pine, CA", tags: { fee: "no", operator: "Bureau of Land Management" } },
  { name: "York Expo Center & Fairgrounds", category: "fairgrounds", lat: 39.9560, lng: -76.7550, address: "York, PA" },
  { name: "Lebanon Area Fairgrounds", category: "fairgrounds", lat: 40.3450, lng: -76.4400, address: "Lebanon, PA" },
  { name: "Lancaster County Convention Center", category: "fairgrounds", lat: 40.0375, lng: -76.3060, address: "Lancaster, PA" },
  { name: "Dutch Haven Shoofly Pie & Gifts", category: "souvenirs", lat: 40.0040, lng: -76.1560, address: "Ronks, PA" },
  { name: "Wilbur Chocolate Store", category: "specialty", lat: 40.1570, lng: -76.3080, address: "Lititz, PA" },
  { name: "Golden Corral Harrisburg", category: "buffets", lat: 40.2780, lng: -76.8430, address: "Harrisburg, PA" },
  { name: "Pilot Travel Center New Stanton", category: "travel", lat: 40.2190, lng: -79.6090, address: "New Stanton, PA" },
  { name: "Buc-ee's Sevierville", category: "travel", lat: 35.9380, lng: -83.5400, address: "Sevierville, TN" },
  { name: "Gettysburg Souvenirs & Gifts", category: "souvenirs", lat: 39.8300, lng: -77.2300, address: "Gettysburg, PA" },
];

export type DemoCharger = {
  name: string;
  lat: number;
  lng: number;
  stalls: number;
  maxKw: number;
  address?: string;
};

export type DemoOtherCharger = DemoCharger & { operator: string; connectors: string[]; cost: string };

/** Representative non-Tesla fast and Level 2 chargers along the demo corridors (sample data). */
export const DEMO_CHARGERS: DemoOtherCharger[] = [
  { name: "Electrify America – Walmart Effingham", lat: 39.1210, lng: -88.5660, stalls: 4, maxKw: 350, address: "Effingham, IL", operator: "Electrify America", connectors: ["CCS (Type 1)", "CHAdeMO"], cost: "$0.48/kWh; $0.40/min idle fee after 10 min; Pass+ members $0.36/kWh" },
  { name: "EVgo – Indianapolis Castleton", lat: 39.9060, lng: -86.0520, stalls: 6, maxKw: 350, address: "Indianapolis, IN", operator: "EVgo Network", connectors: ["CCS (Type 1)", "CHAdeMO", "NACS"], cost: "$0.45/kWh; $1.00 session fee; idle $0.40/min" },
  { name: "ChargePoint – Dayton Mall", lat: 39.6320, lng: -84.2250, stalls: 4, maxKw: 62.5, address: "Miamisburg, OH", operator: "ChargePoint", connectors: ["CCS (Type 1)", "CHAdeMO"], cost: "$0.39/kWh" },
  { name: "Rivian Adventure Network – Zanesville", lat: 39.9460, lng: -82.0090, stalls: 6, maxKw: 300, address: "Zanesville, OH", operator: "Rivian Adventure Network", connectors: ["CCS (Type 1)"], cost: "$0.47/kWh" },
  { name: "Sheetz – Breezewood (Electrify America)", lat: 39.9960, lng: -78.2380, stalls: 6, maxKw: 350, address: "Breezewood, PA", operator: "Electrify America", connectors: ["CCS (Type 1)", "CHAdeMO"], cost: "$0.48/kWh; idle fee $0.40/min" },
  { name: "Pilot Travel Center – New Stanton (GM Energy)", lat: 40.2190, lng: -79.6090, stalls: 8, maxKw: 350, address: "New Stanton, PA", operator: "Pilot Flying J", connectors: ["CCS (Type 1)", "NACS"], cost: "$0.49/kWh" },
  { name: "Francis Energy – Terre Haute", lat: 39.4660, lng: -87.4140, stalls: 2, maxKw: 150, address: "Terre Haute, IN", operator: "Francis Energy", connectors: ["CCS (Type 1)", "CHAdeMO"], cost: "$0.42/kWh" },
  { name: "Blink – Columbus Easton Town Center", lat: 40.0510, lng: -82.9160, stalls: 8, maxKw: 7.2, address: "Columbus, OH", operator: "Blink Charging", connectors: ["J1772"], cost: "$0.29/kWh" },
  { name: "ChargePoint – Carlisle Public Library", lat: 40.2010, lng: -77.1890, stalls: 2, maxKw: 6.6, address: "Carlisle, PA", operator: "ChargePoint", connectors: ["J1772"], cost: "Free" },
  { name: "Shell Recharge – Harrisburg Strawberry Square", lat: 40.2630, lng: -76.8830, stalls: 4, maxKw: 50, address: "Harrisburg, PA", operator: "Shell Recharge Solutions", connectors: ["CCS (Type 1)", "CHAdeMO"], cost: "$0.44/kWh; $0.30/min idle" },
  { name: "Mercedes-Benz High-Power Charging – Buc-ee's Richmond", lat: 39.8700, lng: -84.8400, stalls: 8, maxKw: 400, address: "Richmond, IN", operator: "Mercedes-Benz High-Power Charging", connectors: ["CCS (Type 1)", "NACS"], cost: "$0.52/kWh; Mercedes drivers $0.42/kWh" },
  { name: "IONNA Rechargery – Lancaster", lat: 40.0420, lng: -76.3300, stalls: 10, maxKw: 400, address: "Lancaster, PA", operator: "IONNA", connectors: ["CCS (Type 1)", "NACS"], cost: "$0.46/kWh" },
  { name: "Wawa – Hershey (Tesla + EA)", lat: 40.2850, lng: -76.6500, stalls: 4, maxKw: 150, address: "Hershey, PA", operator: "Electrify America", connectors: ["CCS (Type 1)"], cost: "$0.48/kWh" },
  { name: "Springfield Clean Energy Hub (City of Springfield)", lat: 39.7990, lng: -89.6440, stalls: 4, maxKw: 7.2, address: "Springfield, IL", operator: "City of Springfield", connectors: ["J1772"], cost: "Free for 4 hours; $2/hr after" },
  { name: "7Charge – Youngstown", lat: 41.0980, lng: -80.6490, stalls: 4, maxKw: 100, address: "Youngstown, OH", operator: "7-Eleven 7Charge", connectors: ["CCS (Type 1)", "CHAdeMO"], cost: "$0.41/kWh" },
];

/** Representative Tesla Supercharger sites along the demo corridors. */
export const DEMO_SUPERCHARGERS: DemoCharger[] = [
  { name: "Springfield, IL Supercharger", lat: 39.7500, lng: -89.6050, stalls: 8, maxKw: 250, address: "Springfield, IL" },
  { name: "Effingham, IL Supercharger", lat: 39.1330, lng: -88.5560, stalls: 12, maxKw: 250, address: "Effingham, IL" },
  { name: "Terre Haute, IN Supercharger", lat: 39.4330, lng: -87.4130, stalls: 8, maxKw: 250, address: "Terre Haute, IN" },
  { name: "Indianapolis, IN Supercharger", lat: 39.7700, lng: -86.1620, stalls: 12, maxKw: 250, address: "Indianapolis, IN" },
  { name: "Richmond, IN Supercharger", lat: 39.8480, lng: -84.8580, stalls: 8, maxKw: 250, address: "Richmond, IN" },
  { name: "Dayton, OH Supercharger", lat: 39.7250, lng: -84.1110, stalls: 12, maxKw: 250, address: "Dayton, OH" },
  { name: "Columbus, OH Supercharger", lat: 40.0530, lng: -82.9150, stalls: 16, maxKw: 250, address: "Columbus, OH" },
  { name: "Zanesville, OH Supercharger", lat: 39.9570, lng: -82.0180, stalls: 8, maxKw: 250, address: "Zanesville, OH" },
  { name: "Triadelphia, WV Supercharger", lat: 40.0610, lng: -80.6190, stalls: 8, maxKw: 250, address: "Triadelphia, WV" },
  { name: "Chicago - Loop Supercharger", lat: 41.8830, lng: -87.6310, stalls: 12, maxKw: 250, address: "Chicago, IL" },
  { name: "Portage, IN Supercharger", lat: 41.5760, lng: -87.1790, stalls: 8, maxKw: 250, address: "Portage, IN" },
  { name: "Mishawaka, IN Supercharger", lat: 41.7120, lng: -86.1860, stalls: 8, maxKw: 250, address: "Mishawaka, IN" },
  { name: "Elkhart, IN Supercharger", lat: 41.7100, lng: -85.9800, stalls: 8, maxKw: 150, address: "Elkhart, IN" },
  { name: "Angola, IN Supercharger", lat: 41.6650, lng: -85.0080, stalls: 8, maxKw: 250, address: "Angola, IN" },
  { name: "Maumee, OH Supercharger", lat: 41.5760, lng: -83.6460, stalls: 8, maxKw: 250, address: "Maumee, OH" },
  { name: "Fremont, OH Supercharger", lat: 41.3550, lng: -83.1030, stalls: 8, maxKw: 250, address: "Fremont, OH" },
  { name: "Sandusky, OH Supercharger", lat: 41.4040, lng: -82.6530, stalls: 8, maxKw: 250, address: "Sandusky, OH" },
  { name: "Macedonia, OH Supercharger", lat: 41.3140, lng: -81.5100, stalls: 10, maxKw: 250, address: "Macedonia, OH" },
  { name: "Youngstown, OH Supercharger", lat: 41.0590, lng: -80.6980, stalls: 8, maxKw: 250, address: "Youngstown, OH" },
  { name: "Cranberry Township, PA Supercharger", lat: 40.6860, lng: -80.1050, stalls: 12, maxKw: 250, address: "Cranberry Township, PA" },
  { name: "Monroeville, PA Supercharger", lat: 40.4250, lng: -79.7640, stalls: 8, maxKw: 250, address: "Monroeville, PA" },
  { name: "New Stanton, PA Supercharger", lat: 40.2210, lng: -79.6120, stalls: 8, maxKw: 250, address: "New Stanton, PA" },
  { name: "Somerset, PA Supercharger", lat: 40.0170, lng: -79.0730, stalls: 8, maxKw: 250, address: "Somerset, PA" },
  { name: "Bedford, PA Supercharger", lat: 40.0180, lng: -78.5110, stalls: 8, maxKw: 250, address: "Bedford, PA" },
  { name: "Breezewood, PA Supercharger", lat: 39.9980, lng: -78.2400, stalls: 10, maxKw: 250, address: "Breezewood, PA" },
  { name: "Carlisle, PA Supercharger", lat: 40.2090, lng: -77.1700, stalls: 8, maxKw: 250, address: "Carlisle, PA" },
  { name: "Harrisburg, PA Supercharger", lat: 40.2610, lng: -76.8350, stalls: 12, maxKw: 250, address: "Harrisburg, PA" },
  { name: "Hershey, PA Supercharger", lat: 40.2890, lng: -76.6480, stalls: 8, maxKw: 250, address: "Hershey, PA" },
  { name: "Lancaster, PA Supercharger", lat: 40.0280, lng: -76.2240, stalls: 12, maxKw: 250, address: "Lancaster, PA" },
  { name: "Gettysburg, PA Supercharger", lat: 39.8300, lng: -77.2280, stalls: 8, maxKw: 250, address: "Gettysburg, PA" },
];

export type DemoHotel = {
  name: string;
  kind?: "hotel" | "campground";
  lat: number;
  lng: number;
  address?: string;
  brand?: string;
  hasCharger: boolean;
  chargerTier: "free" | "paid" | "unknown";
  chargerAccess: "guests" | "public" | "unknown";
  teslaDestination: boolean;
  connectors: string[];
  chargerCount?: number;
  chargerNotes?: string;
};

export const DEMO_HOTELS: DemoHotel[] = [
  { name: "Lancaster Marriott at Penn Square", lat: 40.0376, lng: -76.3046, address: "25 S Queen St, Lancaster, PA", brand: "Marriott", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 4, chargerNotes: "Garage charging, parking fee applies" },
  { name: "Cork Factory Hotel", lat: 40.0470, lng: -76.2970, address: "480 New Holland Ave, Lancaster, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2, chargerNotes: "Complimentary for guests" },
  { name: "Hotel Rock Lititz", lat: 40.1500, lng: -76.2960, address: "50 Rock Lititz Blvd, Lititz, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 6 },
  { name: "Eden Resort & Suites", lat: 40.0790, lng: -76.3160, address: "222 Eden Rd, Lancaster, PA", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 4 },
  { name: "Hampton Inn & Suites Lancaster", lat: 40.0330, lng: -76.2390, address: "545 Greenfield Rd, Lancaster, PA", brand: "Hilton", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "DoubleTree Resort by Hilton Lancaster", lat: 39.9860, lng: -76.2890, address: "2400 Willow Street Pike, Lancaster, PA", brand: "Hilton", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "Bird-in-Hand Family Inn", lat: 40.0370, lng: -76.1830, address: "2740 Old Philadelphia Pike, Bird-in-Hand, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "AmishView Inn & Suites", lat: 40.0375, lng: -76.1800, address: "3125 Old Philadelphia Pike, Bird-in-Hand, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "The Hotel Hershey", lat: 40.2960, lng: -76.6490, address: "100 Hotel Rd, Hershey, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 6 },
  { name: "Hershey Lodge", lat: 40.2730, lng: -76.6700, address: "325 University Dr, Hershey, PA", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 4 },
  { name: "Hilton Harrisburg", lat: 40.2600, lng: -76.8830, address: "1 N 2nd St, Harrisburg, PA", brand: "Hilton", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 2, chargerNotes: "Garage, hourly parking rate" },
  { name: "Comfort Inn Carlisle", lat: 40.2000, lng: -77.1650, address: "Carlisle, PA", brand: "Choice", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "Omni Bedford Springs Resort", lat: 39.9960, lng: -78.5000, address: "2138 Business Rte 220, Bedford, PA", brand: "Omni", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 4 },
  { name: "Hampton Inn Somerset", lat: 40.0220, lng: -79.0780, address: "Somerset, PA", brand: "Hilton", hasCharger: true, chargerTier: "unknown", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Nemacolin", lat: 39.8110, lng: -79.5410, address: "1001 Lafayette Dr, Farmington, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 8 },
  { name: "Omni William Penn Hotel", lat: 40.4400, lng: -79.9970, address: "530 William Penn Pl, Pittsburgh, PA", brand: "Omni", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 2, chargerNotes: "Valet parking" },
  { name: "Kimpton Hotel Monaco Pittsburgh", lat: 40.4410, lng: -79.9960, address: "620 William Penn Pl, Pittsburgh, PA", brand: "IHG", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "Cambria Hotel Pittsburgh Cranberry", lat: 40.6880, lng: -80.1000, address: "Cranberry Township, PA", brand: "Choice", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "Holiday Inn Youngstown South", lat: 41.0260, lng: -80.6620, address: "Boardman, OH", brand: "IHG", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "Hilton Garden Inn Cleveland Twinsburg", lat: 41.3100, lng: -81.4600, address: "Twinsburg, OH", brand: "Hilton", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "Hotel Breakers at Cedar Point", lat: 41.4870, lng: -82.6790, address: "Sandusky, OH", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 4 },
  { name: "Great Wolf Lodge Sandusky", lat: 41.4100, lng: -82.6500, address: "Sandusky, OH", hasCharger: true, chargerTier: "unknown", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Renaissance Toledo Downtown", lat: 41.6480, lng: -83.5330, address: "Toledo, OH", brand: "Marriott", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Hilton Columbus Downtown", lat: 39.9700, lng: -83.0020, address: "Columbus, OH", brand: "Hilton", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 4 },
  { name: "Drury Inn & Suites Dayton North", lat: 39.8300, lng: -84.1900, address: "Dayton, OH", brand: "Drury", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Bottleworks Hotel", lat: 39.7760, lng: -86.1400, address: "Indianapolis, IN", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 4 },
  { name: "Morris Inn at Notre Dame", lat: 41.6990, lng: -86.2400, address: "Notre Dame, IN", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "Blue Gate Garden Inn", lat: 41.6750, lng: -85.5800, address: "Shipshewana, IN", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination", "J1772"], chargerCount: 4 },
  { name: "Hampton Inn & Suites Effingham", lat: 39.1260, lng: -88.5500, address: "Effingham, IL", brand: "Hilton", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination"], chargerCount: 2 },
  { name: "President Abraham Lincoln Springfield - DoubleTree", lat: 39.8010, lng: -89.6470, address: "Springfield, IL", brand: "Hilton", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "The Drake Chicago", lat: 41.9000, lng: -87.6240, address: "Chicago, IL", brand: "Hilton", hasCharger: true, chargerTier: "paid", chargerAccess: "public", teslaDestination: false, connectors: ["J1772"], chargerCount: 2, chargerNotes: "Valet garage" },
  { name: "Hotel Indigo Chicago Downtown", lat: 41.8960, lng: -87.6280, address: "Chicago, IL", brand: "IHG", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  // Campgrounds (representative; verify before relying on them)
  { name: "Lancaster / New Holland KOA Holiday", kind: "campground", lat: 40.1050, lng: -76.1000, address: "New Holland, PA", brand: "KOA", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772", "NEMA 14-50"], chargerCount: 2, chargerNotes: "EV charging at select RV sites" },
  { name: "Old Mill Stream Campground", kind: "campground", lat: 40.0330, lng: -76.2180, address: "Lancaster, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: false, connectors: ["NEMA 14-50"], chargerCount: 4, chargerNotes: "50-amp RV hookups usable with a mobile connector" },
  { name: "Hersheypark Camping Resort", kind: "campground", lat: 40.3050, lng: -76.6150, address: "Hummelstown, PA", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "Gettysburg / Battlefield KOA", kind: "campground", lat: 39.8100, lng: -77.2800, address: "Gettysburg, PA", brand: "KOA", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Harrisburg East Campground", kind: "campground", lat: 40.2300, lng: -76.7800, address: "Harrisburg, PA", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "Pine Grove Campground (Somerset)", kind: "campground", lat: 40.0200, lng: -79.1100, address: "Somerset, PA", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: true, connectors: ["Tesla Destination", "NEMA 14-50"], chargerCount: 2 },
  { name: "Pittsburgh North / Cranberry KOA", kind: "campground", lat: 40.7200, lng: -80.0900, address: "Cranberry Township, PA", brand: "KOA", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Streetsboro / Cleveland SE KOA", kind: "campground", lat: 41.2600, lng: -81.3200, address: "Streetsboro, OH", brand: "KOA", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772", "NEMA 14-50"], chargerCount: 2 },
  { name: "Sandusky / Bayshore KOA", kind: "campground", lat: 41.4300, lng: -82.7700, address: "Sandusky, OH", brand: "KOA", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "Indiana Dunes State Park Campground", kind: "campground", lat: 41.6600, lng: -87.0600, address: "Chesterton, IN", hasCharger: false, chargerTier: "unknown", chargerAccess: "unknown", teslaDestination: false, connectors: [] },
  { name: "Elkhart Campground", kind: "campground", lat: 41.7200, lng: -85.9400, address: "Elkhart, IN", hasCharger: true, chargerTier: "free", chargerAccess: "guests", teslaDestination: false, connectors: ["NEMA 14-50"], chargerCount: 6 },
  { name: "Indianapolis KOA Holiday", kind: "campground", lat: 39.8800, lng: -85.9900, address: "Greenfield, IN", brand: "KOA", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["J1772"], chargerCount: 2 },
  { name: "Springfield KOA (Rochester)", kind: "campground", lat: 39.7400, lng: -89.5300, address: "Rochester, IL", brand: "KOA", hasCharger: true, chargerTier: "paid", chargerAccess: "guests", teslaDestination: false, connectors: ["NEMA 14-50"], chargerCount: 4 },
];
