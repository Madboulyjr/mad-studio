# Production source and deployment

The approved website includes the Bricolage font, #1200FF accent, real 3D avatars, seamless avatar handoff, bounded speech bubbles, and editorial content in src/editorial-copy.js. Keep these together with the runtime modules and public/models assets when publishing new projects.

On 2026-09-12, deploying a clean checkout of an old commit omitted these then-uncommitted files and reverted the live interface. Before making a clean deployment checkout, compare HEAD, working-tree changes and the current production release. Preserve existing work and include all intended runtime files in the release commit; never assume clean HEAD contains the current live site.

For a frontend release, run `node --test tests/*.test.js` and `npm run build`. Check the homepage avatars and a current case study, including `/vision/madset`, before promotion. Sanity content is separate from the frontend: a UI deployment must not run seed or CMS publication scripts as a recovery step.

The development-only avatar laboratory remains excluded from production by the build configuration. Do not publish environment files or credentials.
