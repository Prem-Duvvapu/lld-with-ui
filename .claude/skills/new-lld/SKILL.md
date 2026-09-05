---
name: new-lld
description: Add a brand-new LLD problem to the portfolio end to end — backend module (controller/service/model/strategy/exception + /sim engine), frontend page + api.js, design data, class diagram, tests, route registration and doc updates. Use when the user asks to add, build, or implement a new LLD problem that does not exist yet.
---

# Add a new LLD problem

Builds one new module to the same depth as `splitwise`, `logging` and `uber` — the three
reference implementations. Read one of them before starting; imitate its structure rather than
inventing a new one.

## Before writing anything

1. **Confirm the module does not already exist.** `ls backend/src/main/java/com/lld/` and
   `ls frontend/src/lld/`. All 49 current modules have real backends — there are no frontend-only
   shells left, so a matching folder in either directory means the module already exists. If a
   page exists but seems thin or shallow rather than genuinely new, this is an **upgrade**, not a
   new module — use the `upgrade-lld` skill instead.
2. **Pick the canonical key.** One lowercase slug used everywhere: backend package
   `com.lld.<key>`, API base `/api/<key>`, frontend folder `src/lld/<key>/`, data files
   `src/data/design/<key>.js` and `src/data/diagrams/<key>.js`. If the URL path differs from the
   folder (e.g. `movie-ticket` vs `movieticket`), add the alias to `ALIAS_MAP` in
   `frontend/src/data/moduleKeys.js` — never to a component.
3. **Branch first.** `git checkout main && git pull && git checkout -b feat/<key>-module`.
   Never commit to main.

## Backend

Package `com.lld.<key>` with sub-packages `controller / service / model / repository /
exception`, plus one package per pattern actually used (`strategy/`, `state/`, `factory/`).

- **Controller** translates HTTP only — no logic. `@RestController`,
  `@RequestMapping("/api/<key>")`, `@CrossOrigin(origins = "*")`. Delegate every call straight
  to the facade service.
- **Facade service** owns all business logic. One `<Module>Service` the controller talks to.
- **Initializer** — `@Component` with `@PostConstruct` seeding realistic demo data. The UI must
  show something meaningful on first load.
- **Models** use Lombok: `@Data @Builder @NoArgsConstructor @AllArgsConstructor`.
- **Typed enums** for every status, type and category. No string literals crossing a boundary.
- **Storage** is in-memory: `ConcurrentHashMap` in a repository class. No database.
- **Thread safety with intent** — `ReentrantLock` for compound read-then-write mutations. Where
  two or more locks are held, write a comment stating the acquisition order and why it prevents
  deadlock (see `shoppingcart` ascending-productId ordering, or `coffeemachine` ascending-enum
  ingredient locking).
- **At least one GoF pattern implemented end to end.** A real Strategy with multiple
  implementations and a factory resolving them — not a class merely named `...Strategy`.

### Exception hierarchy — follow the shared contract exactly

```java
// exception/<Module>Exception.java
public class <Module>Exception extends com.lld.config.DomainException {
    public <Module>Exception(String message) { super(message); }
}

// exception/<Thing>NotFoundException.java
@ResponseStatus(HttpStatus.NOT_FOUND)
public class <Thing>NotFoundException extends <Module>Exception {
    public <Thing>NotFoundException(String message) { super(message); }
}
```

`GlobalExceptionHandler` reads the `@ResponseStatus` and returns an `ErrorResponse` record.
Every concrete exception needs the annotation, and **none may map to 5xx** —
`DomainExceptionContractTest` fails the build otherwise. Never build an error body by hand with
`Map.of("error", e.getMessage())`: `Map.of` rejects nulls and `getMessage()` is null for NPEs.

### The `/sim/*` engine

Expose `/api/<key>/sim/reset`, per-step action endpoints, and an event/snapshot log. It must
operate on a **separate sandbox instance** from the live state, so the demo cannot corrupt real
data. `SplitwiseService` (`simRepository` alongside `repository`) is the model to copy.

## Frontend

`src/lld/<key>/` containing `<Name>Page.jsx` and `api.js`.

- `api.js` wraps the shared `apiFetch` from `src/utils/api.js` — one exported function per
  endpoint. Never call `fetch` directly.
- The page uses `LldPage` with 5–6 tabs: two or three operational tabs, then Simulation, then
  Class Diagram, then Design Details.
- **`LldPage` renders the `design` and `diagram` tabs itself** and suppresses `children` for
  them. Do not also render `<ClassDiagram>` or `<DesignDetails>` — that is dead code.
- Design components take a **`module` prop**, not `lldKey` or `moduleKey`.
- Poll live server state with `src/hooks/usePolling.js`.
- **Theme tokens only** — `var(--bg-primary)`, `var(--text-primary)` etc. from
  `src/styles/theme.css`. No literal colours; verify both light and dark render correctly.

For the simulation tab, use the `simulation` skill.

## Register the route

Add to `LLD_ROUTES` in `frontend/src/App.jsx`:

```js
{ path: '<url-path>', title: '<Title>', module: './lld/<key>/<Name>Page.jsx' },
```

The glob stays **non-eager** — `React.lazy` per page. An eager glob once shipped all 45 pages in
a 1,474 kB entry chunk, and CI fails the build over 500 kB. Add a home card in `src/pages/Home`
too; `routing.test.js` asserts every card links to a real route and every page file is routed.

## Data files

Create `src/data/design/<key>.js` and `src/data/diagrams/<key>.js`, then register each in the
`designDetails.js` / `classDiagrams.js` barrel. **One key per module, exactly once** — duplicate
keys in the old shared literal let JavaScript discard 653 lines of content at parse time
(RCA-002). Use the `design-details` and `class-diagram` skills for the content.

If the key is listed in `PENDING_DESIGN_CONTENT` in
`frontend/src/__tests__/designDataCoverage.test.js`, **remove it** — a test asserts that list
stays honest.

## Tests

Four flavours, per the `lld-tests` skill: service, strategy/unit, repository, concurrency.

## Docs

- `AGENTS.md` — a module section with Backend and Frontend subsections, matching the existing
  format.
- `README.md` — a row in the projects table plus a detail section.
- `RCA.md` — an entry for any non-trivial bug diagnosed along the way (use the `rca` skill).

## Finish

Run both suites and the build, then open the PR — see the `ship` skill. Report honestly which of
the 17 criteria (`audit-lld`) you met and which you did not.
