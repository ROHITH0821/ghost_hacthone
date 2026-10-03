# Share a fix with a developer

The **Fixes** board now has **Share with developer** on each fix. The owner reviews the issue, exact page URL, suggested change and editable acceptance checklist, then creates a link. Developers can open that single handoff without a Ghost account and copy it into their own issue tracker. Checkbox ticks are local to their tab; they do not claim implementation or change the owner's fix status.

Links expire 30 days after creation. Owners can update the existing snapshot, copy the existing link, preview it or revoke it. Creating a new link after expiry/revocation creates a different 256-bit random token. Concurrent creates are serialized on the fix row and return the same active link.

The draft uses the selected fix and its matching report finding. It does not invent a URL from a page label: the owner must supply a valid full URL when none was recorded. Default acceptance checks are editable suggestions, not assertions that the site has already passed them. No extra AI call is made.

## Access and privacy

Management endpoints use the existing approved dashboard session and check fix/site ownership. POST/DELETE require a matching Origin. The public page returns only the explicitly reviewed snapshot; it does not include the report, GA4 snapshot, internal notes, shopper quotes, user IDs or workspace navigation. User-entered copy is rendered as text. URL fields reject executable schemes and embedded credentials; URLs are never fetched by the server.

A link is a bearer capability: anyone receiving it can read the handoff until expiry/revocation. The modal explains this before creation. Public routes are dynamic, private/no-store, noindex/nofollow/noarchive, no-referrer and not embeddable. Vercel Analytics is suppressed on handoff pages, including events after client navigation, to avoid recording bearer URLs. Tokens are stored in the restricted application database; infrastructure access logs should likewise not be published. Revocation stops subsequent reads; it cannot recall a recipient's copy or an already-open page.

## Database rollout

This feature adds one `FixShare` table and a one-to-one relation to `FixStatus`. Deleting a source fix cascades to its share. Existing tables, entitlements and audit behavior are unchanged.

The repository uses schema push rather than a baseline Prisma migration history. An additive SQL patch is provided at `prisma/patches/20260923_fix_shares.sql`. Apply it once to the intended deployment database before deploying this code, using the normal controlled schema-update process. Alternatively, use `npm run db:push` against a development database with explicit connection settings. Run `npx prisma generate` after updating the schema. The patch was generated from the previous schema and validated in a disposable local PostgreSQL database. No production database was changed.

## Validation

- `npm test`: 51 passing tests, including URL validation, strict field allowlists, unknown-page handling and related-finding selection.
- `tests/fix-share.integration.ts`: five passing real HTTP/PostgreSQL scenarios covering unauthenticated/unapproved/non-owner access, Origin validation, concurrent publication, anonymous viewing, snapshot edits, expiry/token rotation, revocation and cascade deletion.
- Browser checks: desktop/mobile editor, create/copy link, shared page, local checklist interaction and revoked-link state.
- Typecheck passed. Production build result is recorded in the task completion message.

To reproduce integration checks, create a disposable local database named `ghost_fix_share`, apply the schema, and run the app against that database with a test `AUTH_SECRET`. Then run:

```sh
FIX_SHARE_TEST_DATABASE_URL=postgresql://USER@localhost:PORT/ghost_fix_share \
FIX_SHARE_TEST_APP_URL=http://localhost:3010 \
AUTH_SECRET=YOUR_LOCAL_TEST_SECRET_AT_LEAST_32_CHARACTERS \
node --import tsx --test tests/fix-share.integration.ts
```

The suite only permits a local host and the named database, creates synthetic fixtures and removes those fixtures afterward. Match the server's test secret and database connection. Never point it at a live deployment.
