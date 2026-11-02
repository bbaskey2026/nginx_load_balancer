-- Run on the PRIMARY only. Replicas get this automatically via streaming replication.
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);

INSERT INTO users (name, email) VALUES
    ('Bhima', 'bhima@gmail.com'),
    ('Rahul', 'rahul@gmail.com')
ON CONFLICT (email) DO NOTHING;
