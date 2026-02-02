import { Client } from "pg";
let dbClient: Client | null = null;

export const getDBClient = async (): Promise<Client> => {
  if (dbClient) {
    return dbClient;
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
  });
  await client.connect();
  dbClient = client;
  return dbClient;
};

export const disconnectDB = async (): Promise<void> => {
  if (dbClient) {
    await dbClient.end();
    dbClient = null;
  }
};
