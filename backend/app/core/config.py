from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://tissueqa:tissueqa_dev@localhost:5433/tissueqa"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Extraction — Reducto
    reducto_api_key: str = ""
    reducto_pipeline_id: str = "k9768937hwbyzt7d8bmm199hes87zhve"
    reducto_poll_interval_seconds: float = 3.0
    reducto_max_wait_seconds: float = 800.0
    reducto_submit_timeout_seconds: float = 60.0

    # Evaluation — Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_temperature: float = 0.2

    # App
    app_env: str = "development"
    log_level: str = "INFO"

    # Document storage — local disk for dev only.
    # TODO: production -> S3 + KMS (US region, BAA/HIPAA-eligible). Never commit stored PDFs.
    document_storage_dir: str = "storage"

    # Ruleset
    ruleset_version: str = "BT-MS-v0.2"


settings = Settings()
