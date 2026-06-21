import sys
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# 1. Ajuste de ruta: Apuntamos al cerebro (Depurador)
sys.path.append(r'C:\Users\User 8\Oznibot_Depurador_Pro')

try:
    from agents.oznitravel.agent import travel_agent
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

        # OZNI TRAVEL procesa la tarea
        response = await travel_agent.run(task=user_text)

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