# CVMesh React Sample Application

A functional Vite + React sample application demonstrating how to integrate `@cvmesh/react` and `@cvmesh/fetcher` into a job application or candidate registration form.

---

## How to Run

From the root of the repository:

```bash
# Start the sample dev server
pnpm --filter cvmesh-react-sample dev
```

Or from within this directory (`packages/react/sample`):

```bash
pnpm dev
```

The sample app will be available at `http://localhost:5173`.

---

## What It Demonstrates

1. **`useFetchResume` Hook**:
   - Spreading `getButtonProps()` directly onto a standard `<button>` element to automatically handle `disabled`, `aria-busy`, and `onClick`.
   - Direct execution via `fetchResume({ sections: ['basics', 'skills'] })` to selectively request specific resume sections.
2. **Form Autofill**:
   - Uses the `onSuccess` callback to ingest the returned standard [JSON Resume](https://jsonresume.org/schema) object and populate form inputs (name, email, headline, skills, work history).
3. **Cancellation & Error Handling**:
   - Handles `onCancel` (user closes or dismisses the popup) gracefully without breaking the user experience.
   - Handles `onError` with helpful feedback.
4. **Environment Switching**:
   - Includes an in-app toggle to switch between the production CVMesh service (`https://cvmesh.net`) and a local CVMesh instance (`http://localhost:3000`).
5. **Raw Schema Inspection**:
   - Expandable JSON viewer to see the exact payload returned by the Open Resume Share endpoint.
