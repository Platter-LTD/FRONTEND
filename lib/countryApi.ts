/**
 * Country list from REST Countries (free, no API key).
 * https://restcountries.com/
 */

export interface CountryOption {
  code: string;
  name: string;
}

const REST_COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=cca2,name";

let cached: CountryOption[] | null = null;
let fetchPromise: Promise<CountryOption[]> | null = null;

export async function fetchCountries(): Promise<CountryOption[]> {
  if (cached) return cached;
  if (!fetchPromise) {
    fetchPromise = (async () => {
      const res = await fetch(REST_COUNTRIES_URL);
      if (!res.ok) throw new Error("Failed to fetch countries");
      const data = await res.json();
      const result: CountryOption[] = data
        .map(
          (c: { cca2: string; name: { common: string } }) => ({
            code: (c.cca2 || "").toLowerCase(),
            name: c.name?.common ?? c.cca2 ?? "",
          })
        )
        .filter((c: CountryOption) => c.code && c.name)
        .sort((a: CountryOption, b: CountryOption) =>
          a.name.localeCompare(b.name)
        );
      cached = result;
      return result;
    })();
  }
  return fetchPromise;
}

/** Call early (e.g. in root layout) to start loading countries before user opens a dropdown. */
export function preloadCountries(): void {
  if (!cached && !fetchPromise) fetchCountries();
}
