# @cvmesh/fetcher

Framework-agnostic TypeScript/JavaScript library to request and fetch resumes from [CVMesh](https://cvmesh.net) using the **Open Resume Share** protocol.

Zero dependencies. Works in modern browsers (Chrome, Firefox, Safari, Edge) and Node.js (for direct token redemption).

---

## Features

- ?? **Zero-Registration Flow**: No API keys, client secrets, or registration overhead needed.
- ?? **Secure Ephemeral Tokens**: Ephemeral 3-minute single-use HMAC-SHA256 tokens.
- ?? **Standard JSON Resume**: Returns candidate data compliant with [jsonresume.org](https://jsonresume.org/schema).
- ?? **Zero Dependencies**: Lightweight and tree-shakeable, with ESM and CommonJS builds.
- ??? **Comprehensive Error Handling**: Typed errors for popup blockers, user cancellations, and timeouts.

---

## Installation

```bash
npm install @cvmesh/fetcher
# or
pnpm add @cvmesh/fetcher
# or
yarn add @cvmesh/fetcher
```

---

## Quick Start (Browser)

### 1. Simple One-Liner

```ts
import { requestResume } from '@cvmesh/fetcher';

async function handleFetchResume() {
  try {
    const { resume, token } = await requestResume();
    console.log('Candidate name:', resume.basics.name);
    console.log('Candidate email:', resume.basics.email);
    console.log('Work experience:', resume.work);
  } catch (error) {
    console.error('Failed to fetch resume:', error);
  }
}
```

### 2. Using `CVMeshClient` for Advanced Control

```ts
import { CVMeshClient, UserCancelledError, PopupBlockedError } from '@cvmesh/fetcher';

const client = new CVMeshClient({
  baseUrl: 'https://cvmesh.net', // optional (defaults to https://cvmesh.net)
  timeout: 180000,               // 3 minutes
});

async function autofillForm() {
  try {
    const { resume } = await client.requestResume({
      sections: ['basics', 'work', 'education', 'skills'],
    });

    document.querySelector('#nameInput').value = resume.basics.name;
    document.querySelector('#emailInput').value = resume.basics.email;
  } catch (err) {
    if (err instanceof PopupBlockedError) {
      alert('Please allow popups to connect your CVMesh resume.');
    } else if (err instanceof UserCancelledError) {
      console.log('Candidate chose not to share their resume.');
    } else {
      console.error('Unexpected error:', err);
    }
  }
}
```

---

## Server-Side Token Redemption (Node.js / Express / Next.js)

If you prefer redeeming the share token on your backend server to prevent client-side data tampering:

```ts
import { CVMeshClient } from '@cvmesh/fetcher';

const client = new CVMeshClient();

// In your Express / Next.js route handler
app.post('/api/apply', async (req, res) => {
  const { shareToken } = req.body;

  try {
    const resume = await client.redeemToken(shareToken);
    // Ingest JSON Resume data into your ATS / database
    await saveCandidate(resume);

    res.json({ success: true, candidate: resume.basics });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## API Reference

### `CVMeshClient`

#### `new CVMeshClient(config?: CVMeshConfig)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `'https://cvmesh.net'` | Base URL of the CVMesh service |
| `popupFeatures` | `string` | `'width=520,height=720,scrollbars=yes'` | Window features passed to `window.open` |
| `timeout` | `number` | `300000` (5 min) | Milliseconds before rejecting with `TimeoutError` |
| `origin` | `string` | `window.location.origin` | Caller origin for token verification |

#### `client.requestResume(options?: ResumeRequestOptions): Promise<FetchResumeResult>`

Opens the consent popup and resolves with the redeemed resume data.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sections` | `string[]` | `undefined` | Requested resume sections (e.g. `['basics', 'work', 'skills']`) |
| `format` | `'json' \| 'xml'` | `'json'` | Response format |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

#### `client.redeemToken(token: string, options?: ResumeRequestOptions): Promise<JsonResume>`

Directly redeems a `cvs_...` single-use token against the CVMesh API.

#### `client.destroy(): void`

Cancels any pending popup event listeners and intervals.

---

### Error Classes

- `CVMeshError` (Base error class)
- `PopupBlockedError` (Browser blocked popup)
- `UserCancelledError` (Candidate closed popup or clicked Cancel)
- `TimeoutError` (Request exceeded configured timeout)
- `TokenRedemptionError` (HTTP 401, 403, 410, etc. from CVMesh API; includes `.status` and `.details`)

---

## License

MIT � [CVMesh](https://cvmesh.net)
