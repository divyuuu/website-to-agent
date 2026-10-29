import { z } from "zod";

export const locatorSchema = z.object({
  role: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
});

const pathSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((p) => p.startsWith("/") && !p.startsWith("//"), {
    message: "navigate must be a site-relative path starting with /",
  })
  .refine((p) => !p.includes("..") && !p.includes("http"), {
    message: "navigate must not contain .. or absolute URLs",
  });

const navigateStep = z.object({ navigate: pathSchema }).strict();
const clickStep = z.object({ click: z.object({ locator: locatorSchema }).strict() }).strict();
const fillStep = z
  .object({
    fill: z
      .object({
        locator: locatorSchema,
        valueFrom: z.string().regex(/^inputs\.[a-z][a-z0-9_]*$/, {
          message: "valueFrom must reference inputs.<name>",
        }),
      })
      .strict(),
  })
  .strict();
const selectStep = z
  .object({
    select: z
      .object({
        locator: locatorSchema,
        valueFrom: z.string().regex(/^inputs\.[a-z][a-z0-9_]*$/),
      })
      .strict(),
  })
  .strict();
const waitForStep = z
  .object({
    waitFor: z
      .object({
        locator: locatorSchema.optional(),
        timeoutMs: z.number().int().min(100).max(15000).default(5000),
      })
      .strict(),
  })
  .strict();
const assertStep = z.object({ assert: z.object({ locator: locatorSchema }).strict() }).strict();
const extractStep = z
  .object({
    extract: z
      .object({
        fields: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1).max(20),
      })
      .strict(),
  })
  .strict();

export const stepSchema = z.union([
  navigateStep,
  clickStep,
  fillStep,
  selectStep,
  waitForStep,
  assertStep,
  extractStep,
]);

const inputDefSchema = z.object({
  type: z.literal("string"),
  required: z.boolean(),
  maxLength: z.number().int().min(1).max(200),
});

export const workflowDefinitionSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9_]*$/).max(80),
    version: z.number().int().min(1),
    risk: z.literal("read_only"),
    inputs: z.record(inputDefSchema).refine((r) => Object.keys(r).length <= 10, {
      message: "too many inputs",
    }),
    preconditions: z.array(z.string().min(1).max(80)).max(10).default([]),
    steps: z.array(stepSchema).min(1).max(20),
    output: z.object({
      type: z.literal("object"),
      fields: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1).max(20),
    }),
  })
  .strict()
  .superRefine((def, ctx) => {
    const inputNames = new Set(Object.keys(def.inputs));
    for (const step of def.steps) {
      if ("fill" in step) {
        const ref = step.fill.valueFrom.replace("inputs.", "");
        if (!inputNames.has(ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `fill references unknown input: ${ref}`,
          });
        }
      }
      if ("select" in step) {
        const ref = step.select.valueFrom.replace("inputs.", "");
        if (!inputNames.has(ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `select references unknown input: ${ref}`,
          });
        }
      }
    }
  });

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowStep = z.infer<typeof stepSchema>;
