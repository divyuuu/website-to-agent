export interface AppConfig {
  nodeEnv: string;
  apiPort: number;
  mcpPort: number;
  databasePath: string;
  appBaseUrl: string;
  logLevel: string;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const apiPort = Number(required("API_PORT", "3000"));
  const mcpPort = Number(required("MCP_PORT", "3001"));
  if (!Number.isFinite(apiPort) || !Number.isFinite(mcpPort)) {
    throw new Error("API_PORT and MCP_PORT must be numbers");
  }
  return {
    nodeEnv: required("NODE_ENV", "development"),
    apiPort,
    mcpPort,
    databasePath: required("DATABASE_PATH", "./data/app.db"),
    appBaseUrl: required("APP_BASE_URL", "http://localhost:3000"),
    logLevel: required("LOG_LEVEL", "info"),
  };
}
