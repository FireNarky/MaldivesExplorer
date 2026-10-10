# Secret scanning

Do not commit secrets. That includes database URLs with passwords, `AUTH_SECRET`, API keys, session cookies, and private keys.

- `.env`, `.env.local`, and `.env.*.local` are gitignored.
- `.env.example` lists names only. Leave values empty.
- Enable GitHub secret scanning and push protection on this repository before the first push that leaves this machine.
- Review dependency pull requests from Dependabot before merging them.
- If a secret is committed, revoke it at the provider and remove it from history before anyone treats the repository as shared. Do not paste the secret into an issue or a pull request.
