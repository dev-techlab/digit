import postgres from 'postgres';

const url = 'postgresql://techlab:sevenStar%402023tech@localhost:5432/digit';
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8 });
try {
  const rows = await sql`select current_database() as db, version() as v`;
  console.log('OK ->', rows[0]);
} catch (err) {
  console.log('FAILED ->', err.message);
} finally {
  await sql.end({ timeout: 1 });
}
