/** The API requests being answered right now, for the memory log. Once per process, not once per bundle. */
interface Flight {
  method: string;
  path: string;
  started: number;
}
const KEY = Symbol.for('shd-careers.inFlight');
const flights: Set<Flight> = ((globalThis as { [KEY]?: Set<Flight> })[KEY] ??= new Set());

export function requestStarted(method: string, path: string): Flight {
  const flight = { method, path, started: Date.now() };
  flights.add(flight);
  return flight;
}

export const requestEnded = (flight: Flight) => void flights.delete(flight);

/** "POST /api/v1/application-forms 2s" for each, the longest-running first. */
export const inFlight = () =>
  [...flights]
    .sort((a, b) => a.started - b.started)
    .slice(0, 20)
    .map((f) => `${f.method} ${f.path} ${Math.round((Date.now() - f.started) / 1000)}s`);
