Security inspection checklist:

- No hardcoded secrets, credentials, tokens, API keys, passwords, private keys, or connection strings.
- Authentication and authorization checks are preserved.
- User-controlled input is validated before database, shell, filesystem, or external API use.
- SQL, NoSQL, command, path traversal, SSRF, and XSS risks are addressed.
- Sensitive data is not logged or exposed in errors.
- Cryptography uses established libraries and safe defaults.
