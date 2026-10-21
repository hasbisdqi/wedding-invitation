import { Database } from "bun:sqlite";
import { join } from "path";

const PORT = 3020;
const DB_PATH = join(import.meta.dir, "rsvp.sqlite");
const db = new Database(DB_PATH);

// Initialize database table
db.run(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    presence TEXT NOT NULL,
    message TEXT NOT NULL,
    is_approved INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert initial default wishes if empty
const count = db.query("SELECT COUNT(*) as c FROM rsvps").get() as { c: number };
if (count.c === 0) {
  const insert = db.prepare("INSERT INTO rsvps (name, presence, message, is_approved) VALUES (?, ?, ?, ?)");
  insert.run("Budi & Keluarga", "Hadir", "Selamat menempuh hidup baru untuk Aris & Widya, juga Dimas & Winda! Sakinah mawaddah warahmah selamanya. Aamiin.", 1);
  insert.run("Dini Anggraini", "Hadir", "Barakallahu lakum wa baraka alaikum. Bahagia selalu kedua pasangan pengantin! ✨", 1);
}

console.log(`RSVP Database ready at ${DB_PATH}`);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Public API: Get approved wishes for guest view
    if (url.pathname === "/api/wishes" && req.method === "GET") {
      const rows = db.query("SELECT id, name, presence, message, created_at FROM rsvps WHERE is_approved = 1 ORDER BY id DESC").all();
      return Response.json(rows, { headers: corsHeaders });
    }

    // Public API: Submit new RSVP / wish
    if (url.pathname === "/api/wishes" && req.method === "POST") {
      try {
        const body = await req.json();
        const { name, presence, message } = body;
        if (!name || !message) {
          return Response.json({ error: "Nama dan ucapan wajib diisi" }, { status: 400, headers: corsHeaders });
        }
        const stmt = db.prepare("INSERT INTO rsvps (name, presence, message, is_approved) VALUES (?, ?, ?, 1)");
        const res = stmt.run(name.trim(), presence || "Hadir", message.trim());
        return Response.json({ success: true, id: res.lastInsertRowid }, { headers: corsHeaders });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // Admin API: Get all RSVPs (with filter & stats)
    if (url.pathname === "/api/admin/rsvps" && req.method === "GET") {
      const filter = url.searchParams.get("filter"); // all, hadir, ragu, tidak
      let query = "SELECT id, name, presence, message, is_approved, created_at FROM rsvps";
      if (filter === "hadir") query += " WHERE presence = 'Hadir'";
      else if (filter === "ragu") query += " WHERE presence = 'Masih Ragu'";
      else if (filter === "tidak") query += " WHERE presence = 'Tidak Hadir'";
      query += " ORDER BY id DESC";

      const rows = db.query(query).all();

      // Stats
      const totalHadir = (db.query("SELECT COUNT(*) as c FROM rsvps WHERE presence = 'Hadir'").get() as any).c;
      const totalRagu = (db.query("SELECT COUNT(*) as c FROM rsvps WHERE presence = 'Masih Ragu'").get() as any).c;
      const totalTidak = (db.query("SELECT COUNT(*) as c FROM rsvps WHERE presence = 'Tidak Hadir'").get() as any).c;
      const totalApproved = (db.query("SELECT COUNT(*) as c FROM rsvps WHERE is_approved = 1").get() as any).c;

      return Response.json({
        stats: {
          total: totalHadir + totalRagu + totalTidak,
          hadir: totalHadir,
          ragu: totalRagu,
          tidak: totalTidak,
          approved: totalApproved,
        },
        rsvps: rows,
      }, { headers: corsHeaders });
    }

    // Admin API: Toggle visibility (is_approved)
    if (url.pathname.startsWith("/api/admin/rsvps/") && req.method === "PATCH") {
      const id = url.pathname.split("/").pop();
      try {
        const body = await req.json();
        const { is_approved } = body;
        const stmt = db.prepare("UPDATE rsvps SET is_approved = ? WHERE id = ?");
        stmt.run(is_approved ? 1 : 0, id);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // Admin API: Delete RSVP
    if (url.pathname.startsWith("/api/admin/rsvps/") && req.method === "DELETE") {
      const id = url.pathname.split("/").pop();
      try {
        const stmt = db.prepare("DELETE FROM rsvps WHERE id = ?");
        stmt.run(id);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // GitHub Webhook / Auto-deploy endpoint
    if (url.pathname === "/api/deploy" && (req.method === "POST" || req.method === "GET")) {
      try {
        console.log("Received deploy trigger, pulling latest changes...");
        const proc = Bun.spawn(["git", "pull", "origin", "main"], {
          cwd: import.meta.dir,
          stdout: "pipe",
          stderr: "pipe",
        });
        const output = await new Response(proc.stdout).text();
        const error = await new Response(proc.stderr).text();
        console.log("Git pull output:", output, error);
        return Response.json({ success: true, output, error }, { headers: corsHeaders });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // Serve Dashboard HTML
    if (url.pathname === "/dashboard" || url.pathname === "/dashboard/") {
      const dashboardHtml = await Bun.file(join(import.meta.dir, "dashboard.html")).text();
      return new Response(dashboardHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Serve main invitation
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const indexHtml = await Bun.file(join(import.meta.dir, "index.html")).text();
      return new Response(indexHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Static assets fallback
    const filePath = join(import.meta.dir, url.pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${PORT}`);
