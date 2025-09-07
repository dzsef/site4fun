from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import ALLOWED_ORIGINS
from app.api.v1 import auth as auth_router
from app.api.v1 import rfq as rfq_router

app = FastAPI(title="Construction Co. API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(rfq_router.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}
