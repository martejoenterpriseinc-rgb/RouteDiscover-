import { json } from "@/lib/http";
import { getPublicStats } from "@/lib/public-stats";

export async function GET() {
  return json(await getPublicStats());
}
