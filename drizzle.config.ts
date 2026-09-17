import { defineConfig } from "drizzle-kit";

// Con SQLite, DATABASE_URL ya no es una cadena de conexión de MySQL: es
// simplemente la ruta a un archivo, por ejemplo "./local-data/produccion.db".
const dbFile = process.env.DATABASE_URL;
if (!dbFile) {
  throw new Error("DATABASE_URL is required to run drizzle commands (ruta al archivo .db)");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbFile,
  },
});
