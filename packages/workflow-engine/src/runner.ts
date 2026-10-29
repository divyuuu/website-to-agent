import { chromium, type Page } from "playwright";
import type { WorkflowDefinition } from "./schema.js";

export type ExecutionStatus =
  | "succeeded"
  | "failed"
  | "timed_out"
  | "blocked_for_auth";

export interface ExecutionResult {
  status: ExecutionStatus;
  extracted?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface RunOptions {
  baseUrl: string;
  definition: WorkflowDefinition;
  inputs: Record<string, string>;
  timeoutMs?: number;
}

function allowedBase(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== "http:") throw new Error("Only http localhost allowed");
  if (!["localhost", "127.0.0.1", "::1"].includes(u.hostname)) {
    throw new Error(`Blocked origin: ${u.hostname}`);
  }
  return u;
}

function roleLocator(page: Page, role: string, name: string) {
  const supported = ["textbox", "button", "heading", "link", "combobox"];
  if (!supported.includes(role)) {
    throw new Error(`Unsupported locator role: ${role}`);
  }
  return page.getByRole(role as "button", { name });
}

function isTimeout(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|timed out|exceeded/i.test(msg);
}

export async function runWorkflow(opts: RunOptions): Promise<ExecutionResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 30000;
  let base: URL;
  try {
    base = allowedBase(opts.baseUrl);
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "bad baseUrl",
      durationMs: Date.now() - started,
    };
  }

  for (const [key, value] of Object.entries(opts.inputs)) {
    const def = opts.definition.inputs[key];
    if (!def) {
      return { status: "failed", error: `unknown input: ${key}`, durationMs: Date.now() - started };
    }
    if (value.length > def.maxLength) {
      return { status: "failed", error: `input too long: ${key}`, durationMs: Date.now() - started };
    }
  }
  for (const [key, def] of Object.entries(opts.definition.inputs)) {
    if (def.required && !(key in opts.inputs)) {
      return { status: "failed", error: `missing input: ${key}`, durationMs: Date.now() - started };
    }
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(8000);

    const finish = (r: Omit<ExecutionResult, "durationMs">): ExecutionResult => ({
      ...r,
      durationMs: Date.now() - started,
    });

    if (Date.now() - started > timeoutMs) return finish({ status: "timed_out", error: "overall timeout" });

    try {
      if (opts.definition.preconditions.includes("authenticated_session")) {
        await page.goto(new URL("/", base).toString(), { waitUntil: "domcontentloaded" });
        await page.getByLabel("Username").fill("demo");
        await page.getByLabel("Password").fill("demo123");
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL("**/students*", { timeout: 8000 });
      }

      let extracted: Record<string, unknown> | undefined;

      for (const step of opts.definition.steps) {
        if (Date.now() - started > timeoutMs) return finish({ status: "timed_out", error: "overall timeout" });

        if ("navigate" in step) {
          const target = new URL(step.navigate, base).toString();
          allowedBase(target);
          await page.goto(target, { waitUntil: "domcontentloaded" });
        } else if ("fill" in step) {
          const key = step.fill.valueFrom.replace("inputs.", "");
          const value = opts.inputs[key] ?? "";
          await roleLocator(page, step.fill.locator.role, step.fill.locator.name).fill(value);
        } else if ("click" in step) {
          await roleLocator(page, step.click.locator.role, step.click.locator.name).click();
          await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => undefined);
        } else if ("select" in step) {
          const key = step.select.valueFrom.replace("inputs.", "");
          const value = opts.inputs[key] ?? "";
          await page.getByRole("combobox", { name: step.select.locator.name }).selectOption(value);
        } else if ("waitFor" in step) {
          const t = step.waitFor.timeoutMs ?? 5000;
          if (step.waitFor.locator) {
            await roleLocator(page, step.waitFor.locator.role, step.waitFor.locator.name).waitFor({ timeout: t });
          } else {
            await page.waitForTimeout(Math.min(t, 5000));
          }
        } else if ("assert" in step) {
          try {
            await roleLocator(page, step.assert.locator.role, step.assert.locator.name).first().waitFor({ timeout: 8000 });
          } catch {
            return finish({ status: "failed", error: `assertion failed: ${step.assert.locator.name}` });
          }
        } else if ("extract" in step) {
          const rows: string[][] = await page.evaluate(
            `(() => {
              const table = document.querySelector("table");
              if (!table) return [];
              return Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
                Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim())
              );
            })()`
          );
          extracted = { fields: step.extract.fields, rows };
        }
      }

      return finish({ status: "succeeded", extracted });
    } catch (err) {
      if (/login|sign in|unauthorized|401/i.test(err instanceof Error ? err.message : "")) {
        return finish({ status: "blocked_for_auth", error: "authentication required" });
      }
      if (isTimeout(err)) return finish({ status: "timed_out", error: "step timeout" });
      return finish({ status: "failed", error: err instanceof Error ? err.message : "execution failed" });
    }
  } finally {
    await browser.close();
  }
}
