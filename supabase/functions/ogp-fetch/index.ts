import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
};

type OgpResult = {
  title: string;
  image: string;
  description: string;
};

const EMPTY: OgpResult = { title: "", image: "", description: "" };

function jsonResponse(body: OgpResult, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function normalize(value: string): string {
  return decodeHtmlEntities(value).trim();
}

function extractMeta(html: string, key: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1] ? normalize(match[1]) : "";
    if (value) return value;
  }

  return "";
}

function extractTitleTag(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch?.[1] ? normalize(titleMatch[1]) : "";
}

function absolutizeImage(url: string, baseUrl: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function isGenericGoogleMapsImage(url: string): boolean {
  return /google\.com\/maps\/about\/images\//i.test(url);
}

function extractJsonLd(html: string): OgpResult {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const type = item?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        const isPlace = types.some((t: string) =>
          /Restaurant|FoodEstablishment|LocalBusiness|Hotel|Place/i.test(t ?? ""),
        );
        if (!isPlace) continue;

        const image = Array.isArray(item.image)
          ? item.image[0]
          : typeof item.image === "object"
            ? item.image?.url ?? ""
            : item.image ?? "";

        return {
          title: normalize(item.name ?? ""),
          image: typeof image === "string" ? image : "",
          description: normalize(item.description ?? ""),
        };
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return EMPTY;
}

function parseGenericOgp(html: string, finalUrl: string): OgpResult {
  const title =
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    extractTitleTag(html);

  let image =
    extractMeta(html, "og:image") ||
    extractMeta(html, "twitter:image") ||
    extractMeta(html, "thumbnail");

  image = absolutizeImage(image, finalUrl);
  if (isGenericGoogleMapsImage(image)) image = "";

  const description =
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description");

  return { title, image, description };
}

function isGoogleMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host === "maps.app.goo.gl" || host === "goo.gl") return true;
    return host.includes("google.") && parsed.pathname.includes("/maps");
  } catch {
    return false;
  }
}

function parseGoogleMapsOgp(finalUrl: string, html: string): OgpResult {
  let title = "";

  const placeMatch = finalUrl.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch?.[1]) {
    title = normalize(decodeURIComponent(placeMatch[1].replace(/\+/g, " ")));
  }

  const embeddedName = html.match(
    /\["0x[a-f0-9]+:0x[a-f0-9]+","([^"]{2,120})"/i,
  );
  if (embeddedName?.[1] && !embeddedName[1].startsWith("0x")) {
    title = normalize(embeddedName[1]);
  }

  return { title, image: "", description: "" };
}

function mergeOgp(primary: OgpResult, fallback: OgpResult): OgpResult {
  return {
    title: primary.title || fallback.title,
    image: primary.image || fallback.image,
    description: primary.description || fallback.description,
  };
}

async function fetchHtml(
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    let currentUrl = url;

    for (let i = 0; i <= 10; i++) {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: FETCH_HEADERS,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      if (!response.ok) return null;

      const html = await response.text();
      return { html, finalUrl: currentUrl };
    }

    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveTargetUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function parseOgpFromPage(html: string, finalUrl: string): OgpResult {
  const generic = parseGenericOgp(html, finalUrl);
  const jsonLd = extractJsonLd(html);
  let result = mergeOgp(generic, jsonLd);

  if (isGoogleMapsUrl(finalUrl)) {
    const maps = parseGoogleMapsOgp(finalUrl, html);
    // Google Maps は og:title が "Google Maps" 等の汎用値になるため、店名抽出を優先
    result = mergeOgp(maps, result);
    if (isGenericGoogleMapsImage(result.image)) result.image = "";
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse(EMPTY, 405);
  }

  try {
    let rawUrl = "";

    if (req.method === "GET") {
      rawUrl = new URL(req.url).searchParams.get("url") ?? "";
    } else {
      const body = await req.json().catch(() => ({}));
      rawUrl = typeof body.url === "string" ? body.url : "";
    }

    const targetUrl = resolveTargetUrl(rawUrl.trim());
    if (!targetUrl) return jsonResponse(EMPTY, 400);

    const fetched = await fetchHtml(targetUrl);
    if (!fetched) return jsonResponse(EMPTY);

    return jsonResponse(parseOgpFromPage(fetched.html, fetched.finalUrl));
  } catch {
    return jsonResponse(EMPTY);
  }
});
