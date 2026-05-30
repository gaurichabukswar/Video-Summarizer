from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    assembly_ai_api_key: str = ""
    deepseek_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "deepseek"   # deepseek | anthropic | openai | gemini
    max_file_size_mb: int = 500
    temp_dir: str = "/tmp/video_summarizer"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
