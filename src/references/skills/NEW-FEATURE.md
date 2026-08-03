---
name: new-feature
description: Scaffolds a complete CRUD feature under src/features — folder structure, barrel files, schemas/types, abstract + impl datasources and repositories, provider, the 4 default screens, and the form component — following the src/features/packing-materials convention. Use when the user asks to create, scaffold, or set up a new feature/module folder.
---

# Scaffold Feature

Creates a new feature module under `src/features/<feature-name>` following this
project's layered convention (domain / infrastructure / presentation), fully
wired for CRUD: schemas, types, datasource (abstract + impl), repository
(abstract + impl), provider, the 4 default screens, and the form component.

`src/features/packing-materials` is the reference implementation for every
step below — when unsure how something should look, read it.

## Step 1 — Gather the feature name

- If the user already gave a name when invoking this skill (as an argument
  or in their message), use it. Otherwise ask: "What is the name of the
  feature to scaffold?"
- Normalize to kebab-case (matches existing features, e.g. `packing-materials`,
  `positions`, `lines`).
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
   (see Step 2 note below on why this can differ from the entity name).

3. **Entity name.** The PascalCase singular name used for the schema, types,
   and method names — call it `{Entity}`. Ask the user for it; it defaults
   to `{FeatureSingular}` but often isn't the same. For example, in
   `packing-materials` the feature singular is `PackingMaterial` but the
   entity is `PackingMaterialItem` — that's what drives `PackingMaterialItemSchema`,
   `PackingMaterialItemForm`, and method names like `createPackingMaterialItem`.
   Also confirm the regular-plural form of `{Entity}` (default: append `s`;
   ask if it's irregular, e.g. `Category` → `Categories`).

4. **Entity schema structure.** The full field list (name + type) for the
   record as returned by the API — this becomes `{Entity}Schema`. Ask the
   user for every field and its zod type (string, number, boolean, date,
   etc.). Do not invent fields.

5. **Form structure.** The field list (name + type) for `{Entity}Form` —
   this is often a subset of the entity schema (e.g. it excludes
   server-managed fields like `id` or a `blocked` status flag, as in
   `PackingMaterialItemForm`). Ask the user explicitly; don't assume it's
   identical to the entity schema.

6. **Single-record lookup field.** Ask which field the get-one /
   update / delete endpoints key off: `id`, `code`, or some other specific
   field. This decides the method suffix — `getById`/`updateById`/`deleteById`,
   `getByCode`/`updateByCode`/`deleteByCode`, or `getBy{Field}`/... for
   anything else — mirroring `getPackingMaterialItemByCode` /
   `updatePackingMaterialItemByCode` / `deletePackingMaterialItemByCode`.

7. **Route base path.** The path segment used in `navigate()` calls inside
   the generated screens (e.g. `/items-material-empaque`, matching
   `CreatePackingMaterial.tsx`'s navigation back to `/items-material-empaque`
   and to `/items-material-empaque/crear`, `/:code`, `/:code/editar`). Ask
   the user for it. This skill only uses it inside the generated screens —
   it does not register routes in the app router unless the user separately
   asks for that.

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

## Step 3 — Create the folder structure

Under `src/features/<feature-name>`:

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
  presentation/
    screens/
    components/
    providers/
```

(No `infrastructure/utils/` unless the feature actually needs one — packing-materials
doesn't have it.)

## Step 4 — Domain layer

1. `domain/schemas/schemas.ts` — written directly in this file (no
   per-entity file, matching packing-materials):
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

2. `domain/types/types.ts` — also written directly in this file:
   ```ts
   import { {Entity}Schema, Paginated{Entity}sSchema } from "@/features/<feature-name>/<feature-name>";
   import type { z } from "zod";

   export type Paginated{Entity}s = z.infer<typeof Paginated{Entity}sSchema>;
   export type {Entity} = z.infer<typeof {Entity}Schema>;

   export type {Entity}Form = {
       // fields from Step 2.5
   }
   ```

3. `domain/datasources/{FeatureSingular}Datasource.ts` — abstract class, CRUD
   shaped exactly like `PackingMaterialDatasource.ts`:
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
   Replace `{Field}`/`{field}` per the Step 2.6 answer (e.g. `ByCode`/`code`,
   `ById`/`id`, or the custom field given).

4. `domain/repositories/{FeatureSingular}Repository.ts` — abstract class with
   the identical method signatures, mirroring `PackingMaterialRepository.ts`.

5. Update `domain/datasources/datasources.ts`, `domain/repositories/repositories.ts`,
   `domain/schemas/schemas.ts` is content (not a barrel) — same for `types/types.ts`.
   The datasource/repository leaf barrels each get one line:
   `export * from './{FeatureSingular}Datasource';` /
   `export * from './{FeatureSingular}Repository';`.

6. `domain/domain.ts`:
   ```ts
   export * from './datasources/datasources';
   export * from './repositories/repositories';
   export * from './schemas/schemas';
   export * from './types/types';
   ```

## Step 5 — Infrastructure layer

1. `infrastructure/datasources/{FeatureSingular}DatasourceImpl.ts` — implements
   the abstract datasource against `AxiosInstance`, one method per CRUD op,
   following `PackingMaterialDatasourceImpl.ts` exactly:
   - Constructor: `constructor(private api: AxiosInstance, private url = '<base-url>') { }`
     using the Step 2.1 base URL.
   - `create{Entity}`: `POST this.url`, parse response with `ApiResponseSchema`,
     return `response.data.message`, throw `"Información no válida"` on schema
     failure.
   - `get{Entity}s`: `GET ${this.url}?limit=${limit}&page=${page}`, parse
     with `Paginated{Entity}sSchema`, return `response.data`, throw
     `"Error no controlado"` on schema failure.
   - `get{Entity}By{Field}`: `GET ${this.url}/${field}`, parse
     `data['data']` with `{Entity}Schema`.
   - `update{Entity}By{Field}`: `PUT ${this.url}/${field}`, parse with
     `ApiResponseSchema`.
   - `delete{Entity}By{Field}`: `DELETE ${this.url}/${field}`, parse with
     `ApiResponseSchema`.
   - Every method wraps in `try/catch`: `if (isAxiosError(error)) throw new Error(error.response?.data.message); throw new Error("Error no controlado");`

2. `infrastructure/repositories/{FeatureSingular}RepositoryImpl.ts` —
   implements the abstract repository by delegating straight to the
   datasource (constructor takes `{FeatureSingular}Datasource`), mirroring
   `PackingMaterialRepositoryImpl.ts`. No try/catch here — that's the
   datasource's job.

3. Barrels: `infrastructure/datasources/datasources.ts` and
   `infrastructure/repositories/repositories.ts` each get one
   `export * from './...'` line. `infrastructure/infrastructure.ts`:
   ```ts
   export * from './datasources/datasources';
   export * from './repositories/repositories';
   ```

## Step 6 — Presentation layer

1. `presentation/providers/{FeatureSingular}Provider.ts` — mirrors
   `PackingMaterialProvider.ts`: a class wrapping the repository with the
   same public methods (no logic beyond delegation), plus the wiring at the
   bottom of the file:
   ```ts
   const datasource = new {FeatureSingular}DatasourceImpl(api);
   const repository = new {FeatureSingular}RepositoryImpl(datasource);
   export const {featureSingularCamelCase}Provider = new {FeatureSingular}Provider(repository);
   ```
   (`api` imported from `@/config/http/axios`.)

2. `presentation/components/{FeatureSingular}FormComponent.tsx` — one
   `TextFormField<{Entity}Form>` (or the closest matching field component
   from `@/features/shared/shared` — `DateFormField`, `SelectFormField`,
   `FileFormField`, `PasswordFormField` — pick per field type) per field from
   Step 2.5, following `PackingMaterialFormComponent.tsx`'s `register`/`errors`
   props pattern. Ask the user for validation rules per field if not already
   given; otherwise default to `{ required: 'El campo es requerido' }` for
   required-looking fields.

3. The 4 screens under `presentation/screens/`, using the Step 2.7 route base
   path and the provider, matching packing-materials' screens file-for-file:
   - `Index{FeaturePlural}.tsx` — `useQuery` + `usePagination` list with a
     table (`Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td` from shared), a create
     button navigating to `<route>/crear`, row actions (view/edit/delete)
     navigating to `<route>/:field`, `<route>/:field/editar`, and a delete
     `useMutation` + `notification.question` confirm.
   - `Create{FeatureSingular}.tsx` — `useForm<{Entity}Form>` +
     `{FeatureSingular}FormComponent` + create `useMutation`, navigating back
     to `<route>` on success.
   - `Show{FeatureSingular}.tsx` — `useQuery` by the lookup field from
     `useParams()`, rendering the record (ask the user what to display if the
     packing-materials stub — title only — isn't enough for this feature).
   - `Update{FeatureSingular}.tsx` — `useQuery` to fetch, `useForm` +
     `setValues` in a `useEffect` to populate the form (stripping the lookup
     field and any non-form fields), then update `useMutation`.

4. Barrels: `presentation/components/components.ts`,
   `presentation/providers/providers.ts`, `presentation/screens/screens.ts`
   each get one `export * from './...'` line per file created.
   `presentation/presentation.ts`:
   ```ts
   export * from './screens/screens';
   export * from './components/components';
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

Report the created tree back to the user, briefly, and remind them that
routes still need to be registered in the app router if they want the
screens reachable (this skill deliberately doesn't touch routing).

## Reference

`src/features/packing-materials` is the filled-out example this entire skill
is modeled on — every file listed above has a 1:1 counterpart there. Read it
whenever a step is ambiguous.
