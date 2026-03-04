import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DIRECT_URL;
const sql = postgres(connectionString);

export default sql;
