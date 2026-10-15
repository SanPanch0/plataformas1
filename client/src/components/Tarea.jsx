export default function Tarea({ tarea, onEliminar, onToggle, ocupado }) {
  return (
    <li className={tarea.completada ? "tarea completada" : "tarea"}>
      <label className="tarea-texto">
        <input
          type="checkbox"
          checked={tarea.completada}
          onChange={onToggle}
          disabled={ocupado}
        />
        <span>{tarea.titulo}</span>
      </label>
      <button
        onClick={onEliminar}
        className="btn-eliminar"
        disabled={ocupado}
        title="Eliminar tarea"
        aria-label={`Eliminar tarea ${tarea.titulo}`}
      >
        ×
      </button>
    </li>
  );
}
