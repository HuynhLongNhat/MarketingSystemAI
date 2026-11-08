import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

// Opt-in integration benchmark. It never reads or writes the application's
// DATABASE_URL: set RAG_TEST_DATABASE_URL to a disposable PostgreSQL database.
const databaseUrl = process.env.RAG_TEST_DATABASE_URL;
if (!databaseUrl) {
  console.log("SKIP: RAG_TEST_DATABASE_URL is not set (a disposable PostgreSQL database is required).");
  process.exit(0);
}

const client = new Client({ connectionString: databaseUrl });
const schema = `rag_lexical_${randomUUID().replaceAll("-", "")}`;

const STOP_WORDS = new Set([
  "toi", "minh", "anh", "chi", "em", "cho", "con", "cac", "nhung",
  "mot", "nhu", "khong", "la", "va", "cua", "duoc", "nay", "khi",
  "thi", "nao", "sao", "nhe", "voi", "hay", "can", "muon", "xin",
  "vui", "long", "lam", "nhieu", "cung", "biet", "hoi", "the", "gi",
  "co", "lau",
]);
function toLexicalQuery(value) {
  return [...new Set(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))
    .join(" | ");
}

async function search(organizationId, query) {
  const result = await client.query(
    `
      WITH input AS (
        SELECT to_tsquery('simple', $2) AS query
      )
      SELECT c.id, c.content,
        ts_rank_cd(
          to_tsvector('simple', public.immutable_unaccent(lower(c.content))),
          input.query
        ) AS lexical_score
      FROM chunks c
      CROSS JOIN input
      WHERE c.organization_id = $1
        AND c.document_status = 'ready'
        AND c.embedding_status = 'completed'
        AND to_tsvector('simple', public.immutable_unaccent(lower(c.content))) @@ input.query
      ORDER BY lexical_score DESC, c.id ASC
      LIMIT 5
    `,
    [organizationId, toLexicalQuery(query)],
  );
  return result.rows;
}

try {
  await client.connect();
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}", public`);
  await client.query(`
    CREATE TABLE chunks (
      id text PRIMARY KEY,
      organization_id text NOT NULL,
      content text NOT NULL,
      document_status text NOT NULL,
      embedding_status text NOT NULL
    )
  `);
  await client.query(`
    CREATE INDEX chunks_lexical_fts_idx ON chunks USING gin (
      to_tsvector('simple', public.immutable_unaccent(lower(content)))
    )
  `);

  for (const { size, targetIndex } of [
    { size: 10, targetIndex: 9 },
    { size: 200, targetIndex: 199 },
    { size: 1_000, targetIndex: 500 },
  ]) {
    const rows = Array.from({ length: size }, (_, index) => [
      `org-${size}-${index}`,
      `org-${size}`,
      index === targetIndex
        ? `Gói Website bán hàng ${size} có giá niêm yết 9.500.000 VNĐ và bảo hành lỗi kỹ thuật 18 tháng.`
        : `Nội dung nền không liên quan số ${index}: quản trị nội bộ.`,
      "ready",
      "completed",
    ]);
    await client.query(
      "INSERT INTO chunks (id, organization_id, content, document_status, embedding_status) SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])",
      rows[0].map((_, column) => rows.map((row) => row[column])),
    );
  }
  await client.query(
    "INSERT INTO chunks (id, organization_id, content, document_status, embedding_status) VALUES ($1, $2, $3, 'ready', 'completed'), ($4, $5, $6, 'ready', 'completed')",
    [
      "a-policy", "org-a", "Website giới thiệu được bảo hành lỗi kỹ thuật trong 12 tháng kể từ ngày nghiệm thu.",
      "b-secret", "org-b", "Website giới thiệu được bảo hành 99 tháng, chỉ dành cho tổ chức B.",
    ],
  );

  const measurements = [];
  for (const [organizationId, query] of [
    ["org-10", "Website bán hàng 10 giá bao nhiêu"],
    ["org-200", "Website bán hàng 200 giá bao nhiêu"],
    ["org-1000", "Website bán hàng 1000 giá bao nhiêu"],
    ["org-a", "website gioi thieu bao hanh bao lau"],
    ["org-a", "bảo hành 99 tháng"],
    ["org-a", "Có bán điện thoại cũ không"],
  ]) {
    const started = performance.now();
    const results = await search(organizationId, query);
    measurements.push({ organizationId, query, latencyMs: Number((performance.now() - started).toFixed(2)), ids: results.map((row) => row.id) });
  }

  assert.equal(measurements[0].ids[0], "org-10-9", "must retrieve relevance from 10 chunks");
  assert.equal(measurements[1].ids[0], "org-200-199", "must retrieve relevance from 200 chunks");
  assert.equal(measurements[2].ids[0], "org-1000-500", "must retrieve chunk 500 rather than an arbitrary first 200");
  assert.equal(measurements[3].ids[0], "a-policy", "unaccented Vietnamese query must match");
  assert.ok(!measurements[4].ids.includes("b-secret"), "must not cross organization boundary");
  assert.deepEqual(measurements[5].ids, [], "unrelated query must not create a lexical match");
  console.table(measurements);
  console.log("PASS: PostgreSQL lexical retrieval integration benchmark");
} finally {
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
}
