const express = require("express");
const cors = require("cors");
const storage = require("./storage");

const app = express();
const PUERTO = process.env.PORT || 3001;

// --- CORS ---------------------------------------------------------------
// Producción: sólo el origen del frontend configurado en CLIENTE_URL.
// Desarrollo: se añaden localhost para no romper el trabajo local.
const origenes = [
  ...(process.env.CLIENTE_URL
    ? process.env.CLIENTE_URL.split(",").map((u) => u.trim()).filter(Boolean)
    : []),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin(origin, callback) {
    // Peticiones sin origin (curl, health checks) se permiten
    if (!origin) return callback(null, true);
    if (origenes.includes(origin)) return callback(null, true);
    console.warn(`[cors] Origen no permitido: ${origin}`);
    return callback(new Error("Origen no permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// --- Salud ---------------------------------------------------------------
// Raíz con 200: Render usa "/" como health check por defecto.
app.get("/", (req, res) => {
  res.json({
    servicio: "api-tareas",
    version: "1.0.0",
    rutas: ["/api/health", "/api/tareas"],
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    estado: "ok",
    servicio: "api-tareas",
    almacenamiento: process.env.MONGODB_URI ? "mongodb" : "archivo",
    hora: new Date().toISOString(),
  });
});

function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// --- CRUD ----------------------------------------------------------------
app.get("/api/tareas", async (req, res, next) => {
  try {
    res.json(await storage.listar());
  } catch (err) {
    next(err);
  }
});

app.post("/api/tareas", async (req, res, next) => {
  try {
    const { titulo } = req.body || {};
    if (typeof titulo !== "string" || !titulo.trim()) {
      return res.status(400).json({ error: "El título es obligatorio" });
    }
    if (titulo.trim().length > 200) {
      return res.status(400).json({ error: "El título no puede superar 200 caracteres" });
    }
    const nueva = await storage.crear(titulo.trim());
    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

app.put("/api/tareas/:id", async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: "Id inválido" });

    const existente = await storage.obtener(id);
    if (!existente) return res.status(404).json({ error: "Tarea no encontrada" });

    const { completada } = req.body || {};
    let valor;
    if (typeof completada === "boolean") valor = completada;
    else if (completada === undefined || completada === null) valor = !existente.completada;
    else return res.status(400).json({ error: "El campo completada debe ser booleano" });

    res.json(await storage.actualizar(id, { completada: valor }));
  } catch (err) {
    next(err);
  }
});

app.delete("/api/tareas/:id", async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: "Id inválido" });
    const borrada = await storage.eliminar(id);
    if (!borrada) return res.status(404).json({ error: "Tarea no encontrada" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- 404 y errores --------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido en el cuerpo de la petición" });
  }
  if (err.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: "Origen no permitido por CORS" });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// --- Arranque -------------------------------------------------------------
storage
  .init()
  .then(() => {
    app.listen(PUERTO, () => {
      console.log(`API escuchando en http://localhost:${PUERTO}`);
      console.log(`Health check: http://localhost:${PUERTO}/api/health`);
    });
  })
  .catch((err) => {
    console.error("[startup] No se pudo inicializar el almacenamiento:", err.message);
    process.exit(1);
  });
