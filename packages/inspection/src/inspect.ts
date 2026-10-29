import { chromium } from "playwright";

export interface InspectedElement {
  tag: string;
  role: string;
  name: string;
  type?: string;
}

export interface InspectionResult {
  url: string;
  title: string;
  heading: string | null;
  elements: InspectedElement[];
  collectedAt: string;
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function validateAllowedUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:") {
    throw new Error("Only http: localhost URLs allowed in Phase 1");
  }
  if (!isLoopback(parsed.hostname)) {
    throw new Error(`Blocked origin: ${parsed.hostname}`);
  }
  return parsed;
}

export async function inspectPage(
  rawUrl: string,
  timeoutMs = 15000
): Promise<InspectionResult> {
  const parsed = validateAllowedUrl(rawUrl);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    await page.goto(parsed.toString(), { waitUntil: "domcontentloaded" });
    const title = await page.title();
    const heading = await page
      .locator("h1")
      .first()
      .textContent()
      .catch(() => null);

    const elements = (await page.evaluate(
      `(() => {
        const out = [];
        const push = (el, role, name, type) => {
          out.push({ tag: el.tagName.toLowerCase(), role, name: String(name).slice(0, 120), type });
        };
        document
          .querySelectorAll("button, input, select, textarea, a, h1, h2, table")
          .forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const text =
              el.getAttribute("aria-label") ||
              el.innerText ||
              el.getAttribute("name") ||
              el.getAttribute("id") ||
              el.getAttribute("placeholder") ||
              "";
            if (tag === "input") {
              const t = el.getAttribute("type") || "text";
              push(el, "textbox", t === "password" ? "[redacted]" : String(text).trim(), t);
            } else if (tag === "button") {
              push(el, "button", String(text).trim());
            } else if (tag === "a") {
              push(el, "link", String(text).trim());
            } else if (tag === "select" || tag === "textarea") {
              push(el, tag, String(text).trim());
            } else {
              push(el, tag, String(text).trim());
            }
          });
        return out.slice(0, 200);
      })()`
    )) as InspectedElement[];

    return {
      url: parsed.toString(),
      title,
      heading: heading?.trim() ?? null,
      elements,
      collectedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}
