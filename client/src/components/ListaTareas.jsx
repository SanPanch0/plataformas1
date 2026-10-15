import Tarea from "./Tarea.jsx";

export default function ListaTareas({ tareas, onEliminar, onToggle, ocupado }) {
  return (
    <ul className="lista">
      {tareas.map((t) => (
        <Tarea
          key={t.id}
          tarea={t}
          onEliminar={() => onEliminar(t.id)}
          onToggle={() => onToggle(t.id)}
          ocupado={ocupado}
        />
      ))}
    </ul>
  );
}
