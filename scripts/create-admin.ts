/**
 * Create an admin and assign roles — dynamically, no env vars.
 *
 *   pnpm admin:create -- --email a@b.com --username alice --password secret --role super_admin
 *   pnpm admin:create -- --email f@b.com --username fin --password secret --role finance --role support
 *
 * Roles must already exist (seeded). Re-running with the same email or username
 * just adds any missing roles (idempotent). Pass --reset to also overwrite the
 * password on an already-existing account.
 */
import './load-env';
import { createAdmin, rolesForAdmin } from '@/lib/admin-service';

function parseArgs(argv: string[]) {
  const out: {
    email?: string;
    username?: string;
    password?: string;
    roles: string[];
    reset: boolean;
  } = {
    roles: [],
    reset: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--email') out.email = next();
    else if (a === '--username') out.username = next();
    else if (a === '--password') out.password = next();
    else if (a === '--role') out.roles.push(next());
    else if (a === '--reset') out.reset = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.username || !args.password) {
    console.error(
      'Usage: pnpm admin:create -- --email <e> --username <u> --password <p> [--role <slug> ...] [--reset]'
    );
    process.exit(1);
  }

  const { id, created } = await createAdmin({
    email: args.email,
    username: args.username,
    password: args.password,
    roleSlugs: args.roles,
    resetPasswordIfExists: args.reset,
  });

  const roles = await rolesForAdmin(id);
  console.log(`${created ? '✓ Created' : '• Updated'} admin ${args.email} (${id})`);
  console.log(`  roles: ${roles.length ? roles.join(', ') : '(none)'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('create-admin failed:', err.message);
  process.exit(1);
});
