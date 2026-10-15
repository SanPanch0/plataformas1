import { useCallback, useEffect, useRef, useState } from "react";
import Formulario from "./components/Formulario.jsx";
import ListaTareas from "./components/ListaTareas.jsx";

// En desarrollo se usa localhost; en producción DEBE definirse VITE_API_URL en Vercel.
const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001/api/tareas" : null);

const AVISO_MS = 2600;

async function pedir(url, opciones = {}) {
  let res;
  try {
    res = await fetch(url, opciones);
  } catch {
    throw new Error("No hay conexión con el servidor. Verifica que el backend esté activo.");
  }
  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((datos && datos.error) || `Error del servidor (${res.status})`);
  }
  return datos;
}

export default function App() {
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const avisoRef = useRef(null);

  const mostrarAviso = useCallback((texto) => {
    setAviso(texto);
    clearTimeout(avisoRef.current);
    avisoRef.current = setTimeout(() => setAviso(null), AVISO_MS);
  }, []);

  const cargarTareas = useCallback(async () => {
    if (!API) {
      setError("Falta la variable de entorno VITE_API_URL. Configúrala en Vercel.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const datos = await pedir(API);
      setTareas(Array.isArray(datos) ? datos : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTareas();
    return () => clearTimeout(avisoRef.current);
  }, [cargarTareas]);

  // Evita envíos dobles mientras una operación está pendiente
  async function ejecutar(operacion, mensajeExito) {
    if (ocupado) return false;
    setOcupado(true);
    setError(null);
    try {
      await operacion();
      if (mensajeExito) mostrarAviso(mensajeExito);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function agregarTarea(titulo) {
    const ok = await ejecutar(async () => {
      const nueva = await pedir(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo }),
      });
      setTareas((prev) => [...prev, nueva]);
    }, "Tarea creada");
    return ok;
  }

  async function toggleTarea(id) {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) return;
    const esperado = !tarea.completada;
    await ejecutar(async () => {
      const actualizada = await pedir(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: esperado }),
      });
      setTareas((prev) => prev.map((t) => (t.id === id ? actualizada : t)));
    }, esperado ? "Tarea completada" : "Tarea marcada como pendiente");
  }

  async function eliminarTarea(id) {
    const tarea = tareas.find((t) => t.id === id);
    if (tarea && !window.confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return;
    // Sólo se quita de la interfaz después de que el backend confirme (204)
    await ejecutar(async () => {
      await pedir(`${API}/${id}`, { method: "DELETE" });
      setTareas((prev) => prev.filter((t) => t.id !== id));
    }, "Tarea eliminada");
  }

  const total = tareas.length;
  const completadas = tareas.filter((t) => t.completada).length;

  if (cargando) {
    return (
      <main className="contenedor">
        <h1>Mis tareas</h1>
        <p className="estado" role="status">
          Cargando tareas...
        </p>
      </main>
    );
  }

  return (
    <main className="contenedor">
      <header className="cabecera">
        <h1>Mis tareas</h1>
        <p className="contador" aria-live="polite">
          {total} {total === 1 ? "tarea" : "tareas"} · {completadas} completada
          {completadas === 1 ? "" : "s"}
        </p>
      </header>

      {aviso && (
        <p className="aviso" role="status">
          {aviso}
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}

      <Formulario onAgregar={agregarTarea} ocupado={ocupado} />

      {total === 0 ? (
        <p className="vacio">No hay tareas. Agrega la primera con el formulario.</p>
      ) : (
        <ListaTareas
          tareas={tareas}
          onEliminar={eliminarTarea}
          onToggle={toggleTarea}
          ocupado={ocupado}
        />
      )}
    </main>
  );
}
