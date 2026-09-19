import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Секрет для подписи сессионного токена. В демо — значение по умолчанию.
  sessionSecret: process.env.SESSION_SECRET || 'demo-secret-change-me',
  sessionTtlSec: Number(process.env.SESSION_TTL_SEC || 60 * 60 * 12),

  // Путь к файлу-хранилищу демо-базы (замена PostgreSQL на время MVP-демо).
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json'),

  // --- Имитация внешних систем ---------------------------------------------
  // Ни SberBusiness ID, ни GigaChat реально не вызываются: оба адаптера
  // полностью локальные. Переменные ниже управляют поведением имитации.
  mock: {
    // Искусственная задержка ответа «GigaChat», мс.
    gigachatLatencyMs: Number(process.env.MOCK_GIGACHAT_LATENCY_MS || 900),
    // Доля запросов, на которых «GigaChat» падает и включается фолбэк-скоринг.
    gigachatFailureRate: Number(process.env.MOCK_GIGACHAT_FAILURE_RATE || 0),
    // Доля кандидатов, которые «лайкают в ответ» — чтобы мэтчи появлялись сразу.
    autoLikeBackRate: Number(process.env.MOCK_AUTO_LIKE_BACK_RATE || 0.45),
    // Автоответ кандидата в чате после мэтча, мс (0 — выключить).
    autoReplyDelayMs: Number(process.env.MOCK_AUTO_REPLY_DELAY_MS || 4000),
  },
};
