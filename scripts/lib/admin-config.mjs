// Targeted line edits to public/admin/config.yml, so its comments and layout survive.
// Used by the postbuild patcher and by setup-core.

/** owner/name from https://github.com/owner/name(.git) or git@github.com:owner/name(.git). */
export function repoFromUrl(url) {
  const m = /github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(url ?? '');
  return m ? m[1] : null;
}

export function patchConfig(yml, { repo, baseUrl }) {
  let out = yml;
  if (repo) out = out.replace(/^(\s+repo:\s*).*$/m, `$1${repo}`);
  if (baseUrl) out = out.replace(/^(\s+base_url:\s*).*$/m, `$1${baseUrl.replace(/\/$/, '')}`);
  return out;
}
