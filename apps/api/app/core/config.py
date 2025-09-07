from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "development"
    DATABASE_URL: str
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"
    JWT_SECRET: str
    JWT_EXPIRES_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()

ALLOWED_ORIGINS = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",")]
