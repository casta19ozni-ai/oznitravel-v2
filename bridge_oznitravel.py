import sys
from collections import OrderedDict
from datetime import date
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# 1. Ajuste de ruta: Apuntamos al cerebro (Depurador)
sys.path.append(r'C:\Users\User 8\Oznibot_Depurador_Pro')

try:
    from agents.oznitravel.agent import crear_conserje
except ImportError as e:
    print(f"Error crítico: No se pudo importar el agente Oznitravel. Detalle: {e}")
    sys.exit(1)

app = FastAPI()

# 2. Configuración CORS: Permite que tu frontend hable con el backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# AISLAMIENTO DE CONVERSACIÓN POR SESIÓN / USUARIO
# =========================================================
# El frontend no envía session_id (contrato intacto), así que la clave de
# sesión se deriva de X-Forwarded-For cuando existe. Sin clave → agente efímero
# por petición (aislado, sin memoria). Nunca se comparte un contexto global.
_AGENTES = OrderedDict()
_MAX_AGENTES = 64


def _obtener_agente(clave):
    if not clave:
        return None
    ag = _AGENTES.get(clave)
    if ag is None:
        ag = crear_conserje()
        _AGENTES[clave] = ag
        _AGENTES.move_to_end(clave)
        while len(_AGENTES) > _MAX_AGENTES:
            _AGENTES.popitem(last=False)
    return ag

# =========================================================
# FUNCIÓN CENTRAL
# =========================================================
async def procesar_chat(request: Request):
    try:
        data = await request.json()

        # Compatibilidad con frontend actual y futuras versiones
        user_text = (
            data.get("userText")
            or data.get("user_input")
            or data.get("message")
            or ""
        )

        if not user_text:
            return {
                "message": "No recibí ningún texto.",
                "image_url": None
            }

        # Fecha actual del sistema para resolver "hoy" / "próximo a partir de hoy"
        hoy = date.today().isoformat()
        contexto = (
            "\n\n[CONTEXTO DEL SISTEMA]\n"
            f"Hoy es {hoy} (YYYY-MM-DD).\n"
            "Si el usuario pide 'hoy', 'próximo', 'próximo a partir de hoy', 'más próximo' o una fecha relativa, "
            "usa esta fecha como referencia y NO preguntes de nuevo la fecha.\n"
            "Si el usuario indica una fecha concreta, usa la del usuario e ignora esta referencia."
        )

        # OZNI TRAVEL procesa la tarea
        clave_sesion = data.get("session_id") or data.get("sessionId")
        if not clave_sesion:
            fwd = (request.headers.get("x-forwarded-for", "") or "").split(",")[0].strip()
            clave_sesion = fwd or None
        agente = _obtener_agente(clave_sesion) or crear_conserje()
        response = await agente.run(task=f"{user_text}\n{contexto}")

        # Extraemos el contenido
        respuesta_final = response.messages[-1].content

        # Respuesta compatible con tu index.html
        return {
            "message": str(respuesta_final),
            "image_url": None
        }

    except Exception as e:
        print(f"Error interno: {str(e)}")
        return {
            "message": f"Error procesando la solicitud: {str(e)}",
            "image_url": None
        }

# =========================================================
# RUTA CHAT
# =========================================================
@app.post("/chat")
async def chat_endpoint(request: Request):
    return await procesar_chat(request)

# =========================================================
# RUTA COMPATIBLE
# =========================================================
@app.post("/webhook/oznitravel")
async def webhook_oznitravel(request: Request):
    return await procesar_chat(request)

if __name__ == "__main__":
    print("Servidor Oznitravel iniciado.")
    print("Chat disponible en:")
    print("http://localhost:8000/chat")
    print("http://localhost:8000/webhook/oznitravel")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )