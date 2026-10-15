import { useState } from "react";

export default function Formulario({ onAgregar, ocupado }) {
  const [titulo, setTitulo] = useState("");
  const [validacion, setValidacion] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    const limpio = titulo.trim();
    if (!limpio) {
      setValidacion("El título no puede estar vacío.");
      return;
    }
    if (ocupado) return;
    setValidacion(null);
    const ok = await onAgregar(limpio);
    if (ok) setTitulo("");
  }

  return (
    <form onSubmit={manejarEnvio} className="formulario" noValidate>
      <input
        type="text"
        placeholder="Nueva tarea..."
        value={titulo}
        maxLength={200}
        onChange={(e) => {
          setTitulo(e.target.value);
          if (validacion) setValidacion(null);
        }}
        aria-label="Título de la tarea"
      />
      <button type="submit" disabled={ocupado}>
        {ocupado ? "Enviando..." : "Agregar"}
      </button>
      {validacion && (
        <p className="validacion" role="alert">
          {validacion}
        </p>
      )}
    </form>
  );
}
