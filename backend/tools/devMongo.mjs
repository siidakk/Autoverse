// A local database for trying the site end to end while the hosted cluster is
// missing. Prints a URI to drop into backend/.env
import { MongoMemoryServer } from "mongodb-memory-server";
const server = await MongoMemoryServer.create({ instance: { port: 27019 } });
console.log("MONGO_URI=" + server.getUri("autoverse"));
console.log("running — press ctrl+c to stop");
await new Promise(() => {});
