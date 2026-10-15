# ✅ App de Tareas — React + Node.js

## Como ejecutar

### 1. Backend
    cd server
    npm install
    npm run dev        # corre en http://localhost:3001

### 2. Frontend (en otra terminal)
    cd client
    npm install
    npm run dev        # corre en http://localhost:5173

Abre http://localhost:5173 en el navegador.

## Endpoints de la API

| Metodo | Ruta               | Descripcion              |
|--------|--------------------|--------------------------|
| GET    | /api/tareas        | Obtener todas las tareas |
| POST   | /api/tareas        | Crear una tarea          |
| PUT    | /api/tareas/:id    | Completar/descompletar   |
| DELETE | /api/tareas/:id    | Eliminar una tarea       |

## Prueba rapida de la API (sin navegador)

    curl http://localhost:3001/api/tareas
    curl -X POST http://localhost:3001/api/tareas -H "Content-Type: application/json" -d '{"titulo":"Mi tarea"}'
