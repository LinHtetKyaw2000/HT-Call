const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_TRANSLATE_URL = "https://api.mymemory.translated.net/get";

function parseGoogleTranslateResponse(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  return data[0].map((part) => part?.[0] || "").join("").trim();
}

export async function translateText(text, targetLang) {
  const clean = text?.trim();
  if (!clean) throw new Error("Message is empty.");
  if (!targetLang) throw new Error("Target language is required.");

  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: targetLang,
      dt: "t",
      q: clean,
    });
    const googleRes = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`);
    if (googleRes.ok) {
      const googleData = await googleRes.json();
      const translated = parseGoogleTranslateResponse(googleData);
      if (translated) return translated;
    }
  } catch {
    // Try fallback provider below.
  }

  const memoryParams = new URLSearchParams({
    q: clean,
    langpair: `auto|${targetLang}`,
  });
  const memoryRes = await fetch(`${MYMEMORY_TRANSLATE_URL}?${memoryParams.toString()}`);
  if (!memoryRes.ok) {
    throw new Error("Translation failed.");
  }

  const memoryData = await memoryRes.json();
  const translated = memoryData?.responseData?.translatedText?.trim();
  if (!translated) {
    throw new Error("Translation unavailable.");
  }
  return translated;
}
