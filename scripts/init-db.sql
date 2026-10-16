-- Avelor AI Database Initialization
-- Enables pgvector and UUID extensions on container startup

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
