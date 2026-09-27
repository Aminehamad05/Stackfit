-- Chat assistant threads + messages (first live AI feature).
-- History is capped in code (last 20 messages sent to the provider).

CREATE TABLE "chat_threads" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'New chat',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_threads_user_id_idx" ON "chat_threads"("user_id");

CREATE TABLE "chat_messages" (
  "id" BIGSERIAL NOT NULL,
  "thread_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_messages_thread_id_idx" ON "chat_messages"("thread_id");

ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
