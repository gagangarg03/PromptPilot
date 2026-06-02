Architecture inspection checklist:

- Code stays within established module and layer boundaries.
- Domain logic is not pushed into controllers, routes, UI components, or infrastructure glue.
- Naming and public APIs match existing repository conventions.
- Dependencies point in the correct direction.
- The change avoids broad refactors unrelated to the PR goal.
