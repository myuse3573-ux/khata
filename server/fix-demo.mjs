import Database from "better-sqlite3";
const db = new Database("server/khata.db");
db.prepare("UPDATE users SET password_hash = ? WHERE id = 'usr_demo'").run("LEGACY_PLAIN:1234");
console.log("Demo user password updated.");
db.close();
