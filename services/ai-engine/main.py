import os
from datetime import datetime, timezone
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from routes.prediction_routes import router as ai_router
from routes.diet_routes import router as diet_router
from routes.workout_routes import router as workout_router

app = FastAPI(
    title="GlucoGuard AI Intelligence Engine",
    description="Microservice for glucose trend analysis, short-term forecasting, and anomaly detection (Simulation Prototype)",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    service: str
    source: str
    timestamp: str
    environment: str

@app.middleware("http")
async def add_simulation_headers(request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Simulation-Mode"] = "true"
    response.headers["X-AI-Engine-Service"] = "GlucoGuard-AI"
    response.headers["X-GlucoGuard-Disclaimer"] = "Simulation-Only"
    return response

# Mount AI Intelligence Engine Routes (both versioned and root paths)
app.include_router(ai_router, prefix="/api/v1/ai")
app.include_router(ai_router)

# Mount AI Diet Planner Routes (Module M5)
app.include_router(diet_router, prefix="/api/v1/ai/diet")
app.include_router(diet_router, prefix="/ai/diet")

# Mount AI Workout Planner Routes (Module M6)
app.include_router(workout_router, prefix="/api/v1/ai/workout")
app.include_router(workout_router, prefix="/ai/workout")

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint to verify microservice availability."""
    return HealthResponse(
        status="ok",
        service="ai-engine",
        source="simulation",
        timestamp=datetime.now(timezone.utc).isoformat(),
        environment=os.getenv("ENVIRONMENT", "development")
    )

@app.get("/")
def root():
    return {
        "message": "GlucoGuard AI Intelligence Engine — Operational",
        "service": "ai-engine",
        "simulation_mode": True,
        "disclaimer": "Educational & Research Simulation Prototype Only. Not a Medical Device.",
        "health": "/health",
        "endpoints": {
            "predict": "/api/v1/ai/predict",
            "anomaly": "/api/v1/ai/anomaly"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
