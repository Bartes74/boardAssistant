export default () => ({
  app: {
    name: "core-service",
    port: parseInt(process.env.PORT ?? "3000", 10),
  },
  database: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    enableRls: (process.env.DB_ENABLE_RLS ?? "true").toLowerCase() === "true",
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    anonKey: process.env.SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    jwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "documents",
  },
  auth: {
    allowMockUser: (process.env.ALLOW_MOCK_USER ?? "false").toLowerCase() === "true",
  },
  ragService: {
    baseUrl: process.env.RAG_SERVICE_URL ?? "http://localhost:8000",
    timeoutMs: parseInt(process.env.RAG_SERVICE_TIMEOUT ?? "6000", 10),
  },
  observability: {
    prometheusPort: parseInt(process.env.METRICS_PORT ?? "9100", 10),
  },
  security: {
    allowOrigins: (process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:5173").split(","),
  },
});
