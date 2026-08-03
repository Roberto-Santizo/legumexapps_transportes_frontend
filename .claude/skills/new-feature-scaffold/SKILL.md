---
name: new-feature-scaffold
description: Scaffolds a complete CRUD feature under src/features from the src/references/[feature-name] skeleton — folder tree, barrel files, schemas/types, abstract + impl datasources and repositories, provider, the 4 default screens, and the form component. Use when the user asks to create, scaffold, or set up a new feature/module folder.
---

# Scaffold Feature (from skeleton)

Creates a new feature module under `src/features/<feature-name>` following this
project's layered convention (domain / infrastructure / presentation), fully
wired for CRUD: schemas, types, datasource (abstract + impl), repository
(abstract + impl), provider, the 4 default screens, and the form component.

The structural reference is **`src/references/[feature-name]`** — a skeleton
whose folder tree, barrel files and file-naming scheme are the source of truth
for *where things go*. Its content files are intentionally empty; the code
templates below are the source of truth for *what goes in them*.

## Step 0 — Read the skeleton and the shared barrel

Before anything else:

1. List and read `src/references/[feature-name]/` recursively. Mirror exactly
   what you find: which folders exist, which barrels exist, and in what order
   each barrel re-exports. If the skeleton has changed since this skill was
   written, **the skeleton wins** — update the tree in Step 3 to match it.
2. Read `src/features/shared/shared.ts` and its sub-barrels to confirm which
   shared components/hooks/schemas are actually available before importing them.

## Step 1 — Gather the feature name

- If the user already gave a name when invoking this skill (as an argument
  or in their message), use it. Otherwise ask: "What is the name of the
  feature to scaffold?"
- Normalize to kebab-case (e.g. `packing-materials`, `positions`, `lines`).
- Check `src/features/<feature-name>` doesn't already exist. If it does, stop
  and tell the user instead of overwriting anything.

## Step 2 — Ask the clarifying questions

Before writing any code, collect all of the following from the user. Ask
them together in one go; don't scaffold with guessed values.

1. **Base URL.** The API path this feature's datasource calls, e.g.
   `/packing-materials`. Ask the user directly — never guess it.

2. **PascalCase names derived from the feature.** Derive a singular and
   plural PascalCase form from the feature name (e.g. `packing-materials` →
   singular `PackingMaterial`, plural `PackingMaterials`) and show your
   derivation to the user for confirmation/correction. These two names —
   call them `{FeatureSingular}` and `{FeaturePlural}` — are used for the
   datasource, repository, provider, form component, and screen class names
   (see the note below on why this can differ from the entity name).

3. **Entity name.** The PascalCase singular name used for the schema, types,
   and method names — call it `{Entity}`. Ask the user for it; it defaults
   to `{FeatureSingular}` but often isn't the same. A feature whose singular
   is `PackingMaterial` may well have `PackingMaterialItem` as its entity —
   that's what would drive `PackingMaterialItemSchema`,
   `PackingMaterialItemForm`, and `createPackingMaterialItem`.
   Also confirm the regular-plural form of `{Entity}` (default: append `s`;
   ask if it's irregular, e.g. `Category` → `Categories`).

4. **Entity schema structure.** The full field list (name + type) for the
   record as returned by the API — this becomes `{Entity}Schema`. Ask the
   user for every field and its zod type (string, number, boolean, date,
   etc.). Do not invent fields.

5. **Form structure.** The field list (name + type) for `{Entity}Form` —
   this is often a subset of the entity schema (it usually excludes
   server-managed fields like `id` or status flags). Ask the user
   explicitly; don't assume it's identical to the entity schema.

6. **Single-record lookup field.** Ask which field the get-one / update /
   delete endpoints key off: `id`, `code`, or some other specific field.
   This decides the method suffix — `getById`/`updateById`/`deleteById`,
   `getByCode`/`updateByCode`/`deleteByCode`, or `getBy{Field}`/… for
   anything else.

7. **Route base path.** The path segment used in `navigate()` calls inside
   the generated screens (e.g. `/items-material-empaque`, with the screens
   navigating to `<route>/crear`, `<route>/:field`, `<route>/:field/editar`).
   Ask the user for it. This skill only uses it inside the generated screens —
   it does **not** register routes in `src/router.tsx` unless the user
   separately asks for that.

Also ask, per form field, for its validation rules if not already given;
otherwise default to `{ required: 'El campo es requerido' }` for
required-looking fields.

## Token map

The skeleton uses a single bracket token in paths and filenames; the code
templates use brace tokens. This is the bridge between the two.

| Skeleton path / filename | Generated as |
|---|---|
| folder `[feature-name]/` | `<feature-name>` (kebab-case) |
| `[feature-name].ts` (root barrel) | `<feature-name>.ts` |
| `Create[feature-name].tsx` | `Create{FeatureSingular}.tsx` |
| `Show[feature-name].tsx` | `Show{FeatureSingular}.tsx` |
| `Update[feature-name].tsx` | `Update{FeatureSingular}.tsx` |
| `Index[feature-name].tsx` | `Index{FeaturePlural}.tsx` — **plural** |
| `[feature-name]Provider.ts` | `{FeatureSingular}Provider.ts` |

Keep these names straight while generating code:

- `{Entity}` → schemas, types, form type, and CRUD method names
  (`create{Entity}`, `get{Entity}s`, `get{Entity}By{Field}`,
  `update{Entity}By{Field}`, `delete{Entity}By{Field}`).
- `{FeatureSingular}` → `{FeatureSingular}Datasource`,
  `{FeatureSingular}DatasourceImpl`, `{FeatureSingular}Repository`,
  `{FeatureSingular}RepositoryImpl`, `{FeatureSingular}Provider`,
  `{FeatureSingular}FormComponent`, and the `Create/Show/Update{FeatureSingular}`
  screens.
- `{FeaturePlural}` → only the `Index{FeaturePlural}` screen.
- `{Field}` / `{field}` → PascalCase / camelCase lookup field from Step 2.6.
- `{featureSingularCamelCase}` → the exported provider instance
  (e.g. `packingMaterialProvider`).

## Step 3 — Create the folder structure

Mirroring `src/references/[feature-name]`, under `src/features/<feature-name>`:

```
<feature-name>/
  domain/
    datasources/
    repositories/
    schemas/
    types/
  infrastructure/
    datasources/
    repositories/
    utils/
  presentation/
    screens/
    components/
    providers/
```

`infrastructure/utils/utils.ts` is created empty — it exists in the skeleton and
is re-exported by `infrastructure.ts`, so it must exist for the barrel to
resolve. Fill it only if the feature actually needs a util.

## Step 4 — Domain layer

1. `domain/schemas/schemas.ts` — written directly in this file (no per-entity
   file; this is a content file, not a barrel):
   ```ts
   import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
   import { z } from "zod";

   export const {Entity}Schema = z.object({
       // one line per field the user gave you in Step 2.4
   });

   export const Paginated{Entity}sSchema = ApiPaginatedResponseSchema.extend({
       data: z.array({Entity}Schema)
   });
   ```

2. `domain/types/types.ts` — also a content file:
   ```ts
   import { {Entity}Schema, Paginated{Entity}sSchema } from "@/features/<feature-name>/<feature-name>";
   import type { z } from "zod";

   export type Paginated{Entity}s = z.infer<typeof Paginated{Entity}sSchema>;
   export type {Entity} = z.infer<typeof {Entity}Schema>;

   export type {Entity}Form = {
       // fields from Step 2.5
   }
   ```

3. `domain/datasources/{FeatureSingular}Datasource.ts` — abstract class:
   ```ts
   import type { {Entity}, {Entity}Form, Paginated{Entity}s } from "@/features/<feature-name>/<feature-name>";

   export abstract class {FeatureSingular}Datasource {
       abstract create{Entity}(payload: {Entity}Form): Promise<string>;
       abstract get{Entity}s(limit: string, page: string): Promise<Paginated{Entity}s>;
       abstract get{Entity}By{Field}({field}: string): Promise<{Entity}>;
       abstract update{Entity}By{Field}({field}: string, payload: {Entity}Form): Promise<string>;
       abstract delete{Entity}By{Field}({field}: string): Promise<string>;
   }
   ```
   Replace `{Field}`/`{field}` per the Step 2.6 answer.

4. `domain/repositories/{FeatureSingular}Repository.ts` — abstract class with
   the identical method signatures.

5. Leaf barrels — `domain/datasources/datasources.ts` and
   `domain/repositories/repositories.ts` each get one line:
   `export * from './{FeatureSingular}Datasource';` /
   `export * from './{FeatureSingular}Repository';`.
   `schemas/schemas.ts` and `types/types.ts` are content files, not barrels.

6. `domain/domain.ts` — copy the skeleton's version verbatim:
   ```ts
   export * from './datasources/datasources';
   export * from './repositories/repositories';
   export * from './schemas/schemas';
   export * from './types/types';
   ```

## Step 5 — Infrastructure layer

1. `infrastructure/datasources/{FeatureSingular}DatasourceImpl.ts`:
   ```ts
   import type { {Entity}, {Entity}Form, Paginated{Entity}s } from "@/features/<feature-name>/<feature-name>";
   import { {FeatureSingular}Datasource, Paginated{Entity}sSchema, {Entity}Schema } from "@/features/<feature-name>/<feature-name>";
   import { ApiResponseSchema } from "@/features/shared/shared";
   import { isAxiosError, type AxiosInstance } from "axios";

   export class {FeatureSingular}DatasourceImpl extends {FeatureSingular}Datasource {
       constructor(private api: AxiosInstance, private url = '<base-url>') {
           super();
       }

       async create{Entity}(payload: {Entity}Form): Promise<string> {
           try {
               const { data } = await this.api.post(this.url, payload);
               const response = ApiResponseSchema.safeParse(data);
               if (!response.success) throw new Error("Información no válida");
               return response.data.message;
           } catch (error) {
               if (isAxiosError(error)) throw new Error(error.response?.data.message);
               throw new Error("Error no controlado");
           }
       }

       // get{Entity}s  -> GET `${this.url}?limit=${limit}&page=${page}`,
       //                  parse with Paginated{Entity}sSchema, return response.data,
       //                  throw "Error no controlado" on schema failure.
       // get{Entity}By{Field}    -> GET `${this.url}/${code}`, parse data['data'] with {Entity}Schema.
       // update{Entity}By{Field} -> PUT `${this.url}/${code}`, parse with ApiResponseSchema.
       // delete{Entity}By{Field} -> DELETE `${this.url}/${code}`, parse with ApiResponseSchema.
       // (`code` above stands for the {field} param — substitute the real lookup field.)
   }
   ```
   Write out every method in full — the comments above are the spec, not the
   output. Each one wraps in the same `try/catch`:
   `if (isAxiosError(error)) throw new Error(error.response?.data.message); throw new Error("Error no controlado");`
   Use the Step 2.1 base URL as the `url` default.

2. `infrastructure/repositories/{FeatureSingular}RepositoryImpl.ts` —
   implements the abstract repository by delegating straight to the
   datasource (constructor takes `{FeatureSingular}Datasource`). **No try/catch
   here** — that's the datasource's job.

3. `infrastructure/utils/utils.ts` — empty file.

4. Barrels: `infrastructure/datasources/datasources.ts` and
   `infrastructure/repositories/repositories.ts` each get one
   `export * from './...'` line. `infrastructure/infrastructure.ts` copies the
   skeleton verbatim:
   ```ts
   export * from './datasources/datasources';
   export * from './repositories/repositories';
   export * from './utils/utils';
   ```

## Step 6 — Presentation layer

1. `presentation/providers/{FeatureSingular}Provider.ts` — a class wrapping the
   repository with the same public methods (no logic beyond delegation), plus
   the wiring at the bottom of the file:
   ```ts
   import api from "@/config/http/axios";
   // ...

   const datasource = new {FeatureSingular}DatasourceImpl(api);
   const repository = new {FeatureSingular}RepositoryImpl(datasource);
   export const {featureSingularCamelCase}Provider = new {FeatureSingular}Provider(repository);
   ```
   Note `api` is a **default export** of `@/config/http/axios` — import it
   without braces.

2. `presentation/components/{FeatureSingular}FormComponent.tsx` — one field
   component per entry from Step 2.5, following the `register`/`errors` props
   pattern. Map field type → the component that actually exists in
   `@/features/shared/shared`:

   | Field kind | Component | Wiring |
   |---|---|---|
   | text / number / email | `TextFormField` | `register` + `validation` + `type` |
   | long text | `TextAreaFormField` | `register` |
   | password | `PasswordFormField` | `register` |
   | date | `DateFormField` | `register` |
   | choice from a list | `SelectFormField` | **`control`**, not `register` |

   There is no `FileFormField` — don't reach for one. If a field needs a
   component that doesn't exist, ask the user before inventing it.

3. The 4 screens under `presentation/screens/`, using the Step 2.7 route base
   path and the provider:
   - `Index{FeaturePlural}.tsx` — `useQuery` + `usePagination(searchParams)`
     list with `Table`/`Thead`/`Th`/`Tbody`/`Tr`/`Td` and `Pagination`
     (`page`, `rowsPerPage`, `count`, `setSearchParams`), a create button
     navigating to `<route>/crear`, and row actions via `ActionsMenu`
     (view/edit/delete) navigating to `<route>/:{field}` and
     `<route>/:{field}/editar`, plus a delete `useMutation`.

     **Delete has no confirmation dialog for now** — the notification/toast
     infrastructure doesn't exist yet in this project. Fire the mutation
     directly and leave the marker:
     ```ts
     // TODO: confirmación pendiente de la infraestructura de notificaciones
     ```
   - `Create{FeatureSingular}.tsx` — `useForm<{Entity}Form>` +
     `{FeatureSingular}FormComponent` inside `CustomForm` + create
     `useMutation`, navigating back to `<route>` on success.
   - `Show{FeatureSingular}.tsx` — `useQuery` by the lookup field from
     `useParams()`, rendering the record. Ask the user what to display if a
     `Title`-only stub isn't enough for this feature.
   - `Update{FeatureSingular}.tsx` — `useQuery` to fetch, `useForm` +
     `setValue` in a `useEffect` to populate the form (stripping the lookup
     field and any non-form fields), then an update `useMutation`.

   Use `SpinnerComponent` for loading and `ErrorComponent` (`message` prop) for
   error states.

4. Barrels: `presentation/components/components.ts`,
   `presentation/providers/providers.ts`, `presentation/screens/screens.ts`
   each get one `export * from './...'` line per file created — the skeleton's
   `screens.ts` lists all four screens, so match that. `presentation/presentation.ts`
   copies the skeleton verbatim, in this order:
   ```ts
   export * from './components/components';
   export * from './screens/screens';
   export * from './providers/providers';
   ```

## Step 7 — Root barrel

`<feature-name>.ts`:
```ts
export * from './domain/domain';
export * from './infrastructure/infrastructure';
export * from './presentation/presentation';
```

## Step 8 — Report

Report the created tree back to the user, briefly, and remind them that routes
still need to be registered in `src/router.tsx` if they want the screens
reachable — this skill deliberately doesn't touch routing.

## Reference

- `src/references/[feature-name]` — the skeleton. Folder tree, barrel order and
  filename scheme come from here. Re-read it whenever a structural step is
  ambiguous; if it disagrees with this document, the skeleton wins.
- `src/features/shared/shared.ts` — the shared components, hooks and schemas
  the generated code imports. Read it before importing anything from it.
