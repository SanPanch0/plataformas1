const fs = require("fs");
const path = require("path");

// Capa de persistencia:
// - Si MONGODB_URI existe  -> MongoDB Atlas (persistencia en la nube).
// - Si no                 -> archivo JSON local data/tareas.json (persiste reinicios).
// Nunca se queda solo en memoria.

const ARCHIVO = path.join(__dirname, "data", "tareas.json");

let coleccion = null;
let tareasArchivo = [];
let siguienteId = 1;

function leerArchivo() {
  try {
    if (fs.existsSync(ARCHIVO)) {
      const crudo = fs.readFileSync(ARCHIVO, "utf8");
      const datos = JSON.parse(crudo || "[]");
      tareasArchivo = Array.isArray(datos) ? datos : [];
      siguienteId =
        tareasArchivo.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;
    }
  } catch (err) {
    console.error("[storage] No se pudo leer el archivo de tareas:", err.message);
    tareasArchivo = [];
  }
}

function guardarArchivo() {
  try {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    const tmp = ARCHIVO + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(tareasArchivo, null, 2), "utf8");
    fs.renameSync(tmp, ARCHIVO);
  } catch (err) {
    console.error("[storage] No se pudo guardar el archivo de tareas:", err.message);
    throw new Error("No se pudo persistir la tarea");
  }
}

async function conectarMongo(uri) {
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
  } catch (err) {
    // Nunca dejar que la URI (con credenciales) aparezca en los logs.
    const msg = String(err && err.message ? err.message : err).split(uri).join(
      "[MONGODB_URI]"
    );
    const error = new Error("No se pudo conectar a MongoDB Atlas: " + msg);
    error.cause = err;
    throw error;
  }
  coleccion = client.db().collection("tareas");
  await coleccion.createIndex({ id: 1 }, { unique: true }).catch(() => {});
  console.log("[storage] Conectado a MongoDB Atlas");
}

async function init() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    await conectarMongo(uri);
  } else {
    leerArchivo();
    console.log(
      "[storage] MONGODB_URI no configurada: usando almacenamiento en archivo " +
        path.relative(process.cwd(), ARCHIVO)
    );
  }
}

function normalizar(t) {
  return {
    id: t.id,
    titulo: t.titulo,
    completada: Boolean(t.completada),
    creadaEn: t.creadaEn || null,
  };
}

async function listar() {
  if (coleccion) {
    const docs = await coleccion.find({}).sort({ id: 1 }).toArray();
    return docs.map(normalizar);
  }
  return tareasArchivo.map(normalizar);
}

async function crear(titulo) {
  if (coleccion) {
    const mayor = await coleccion.find({}).sort({ id: -1 }).limit(1).toArray();
    const id = (mayor[0] && mayor[0].id ? mayor[0].id : 0) + 1;
    const doc = {
      id,
      titulo,
      completada: false,
      creadaEn: new Date().toISOString(),
    };
    await coleccion.insertOne({ ...doc });
    return normalizar(doc);
  }
  const nueva = {
    id: siguienteId++,
    titulo,
    completada: false,
    creadaEn: new Date().toISOString(),
  };
  tareasArchivo.push(nueva);
  guardarArchivo();
  return normalizar(nueva);
}

async function obtener(id) {
  if (coleccion) {
    const doc = await coleccion.findOne({ id });
    return doc ? normalizar(doc) : null;
  }
  const tarea = tareasArchivo.find((t) => t.id === id);
  return tarea ? normalizar(tarea) : null;
}

async function actualizar(id, cambios) {
  if (coleccion) {
    await coleccion.updateOne({ id }, { $set: cambios });
    const doc = await coleccion.findOne({ id });
    return doc ? normalizar(doc) : null;
  }
  const tarea = tareasArchivo.find((t) => t.id === id);
  if (!tarea) return null;
  Object.assign(tarea, cambios);
  guardarArchivo();
  return normalizar(tarea);
}

async function eliminar(id) {
  if (coleccion) {
    const res = await coleccion.deleteOne({ id });
    return res.deletedCount > 0;
  }
  const antes = tareasArchivo.length;
  tareasArchivo = tareasArchivo.filter((t) => t.id !== id);
  if (tareasArchivo.length === antes) return false;
  guardarArchivo();
  return true;
}

module.exports = { init, listar, crear, obtener, actualizar, eliminar };
