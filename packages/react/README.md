# @cvmesh/react

React hooks and provider for the [CVMesh](https://cvmesh.net) **Open Resume Share** protocol.

Easily integrate verified candidate resume fetching into **any existing button, modal, or form** in your React application. Compatible with **React 17, 18, and 19**.

---

## Features

- ? **Framework Native**: Clean `useFetchResume` hook with zero unnecessary UI components.
- ?? **Unopinionated Styling**: Attach it to your existing buttons, whether using Tailwind CSS, MUI, Shadcn UI, Ant Design, or plain HTML.
- ??? **Zero-Registration Auth**: Third-party sites don't need client IDs or server credentials.
- ?? **Standard JSON Resume**: Returns candidate profiles compliant with the official [JSON Resume](https://jsonresume.org/schema) schema.
- ?? **Convenient `getButtonProps`**: Spread directly onto buttons for instant `onClick`, `disabled`, and `aria-busy` handling.

---

## Installation

```bash
npm install @cvmesh/react @cvmesh/fetcher
# or
pnpm add @cvmesh/react @cvmesh/fetcher
# or
yarn add @cvmesh/react @cvmesh/fetcher
```

---

## Quick Start

### Example 1: Basic Button Integration

Attach `fetchResume` directly to your button's `onClick`:

```tsx
import React from 'react';
import { useFetchResume } from '@cvmesh/react';

export function JobApplicationForm() {
  const { fetchResume, loading, resume, error } = useFetchResume({
    onSuccess: ({ resume }) => {
      console.log('Candidate Name:', resume.basics.name);
      console.log('Candidate Email:', resume.basics.email);
    },
    onCancel: () => {
      console.log('Candidate cancelled resume selection.');
    },
    onError: (err) => {
      console.error('Failed to retrieve resume:', err);
    },
  });

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => fetchResume()}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow disabled:opacity-50"
      >
        {loading ? 'Connecting to CVMesh...' : '?? Autofill with CVMesh'}
      </button>

      {error && <p className="text-red-500 text-sm">{error.message}</p>}

      {resume && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold text-green-900">Loaded resume for: {resume.basics.name}</p>
        </div>
      )}
    </div>
  );
}
```

---

### Example 2: Zero-Boilerplate with `getButtonProps`

`getButtonProps()` automatically binds `onClick`, sets `disabled={loading}`, and manages accessibility attributes (`aria-busy`):

```tsx
import React from 'react';
import { useFetchResume } from '@cvmesh/react';

export function QuickApplyButton() {
  const { getButtonProps, loading } = useFetchResume({
    onSuccess: ({ resume }) => {
      alert(`Welcome, ${resume.basics.name}!`);
    },
  });

  return (
    <button
      {...getButtonProps({
        className: 'btn btn-primary',
        onClick: () => console.log('Button clicked!'), // Combined automatically
      })}
    >
      {loading ? 'Fetching...' : 'Apply with CVMesh'}
    </button>
  );
}
```

---

### Example 3: Integrating with Existing UI Libraries

#### Ant Design
```tsx
import { Button } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useFetchResume } from '@cvmesh/react';

export function AntdApply() {
  const { fetchResume, loading } = useFetchResume({
    onSuccess: ({ resume }) => populateAntdForm(resume),
  });

  return (
    <Button
      type="primary"
      icon={<FileTextOutlined />}
      loading={loading}
      onClick={() => fetchResume()}
    >
      Fetch Resume from CVMesh
    </Button>
  );
}
```

#### Material UI (MUI)
```tsx
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useFetchResume } from '@cvmesh/react';

export function MuiApply() {
  const { fetchResume, loading } = useFetchResume({
    onSuccess: ({ resume }) => fillMuiFields(resume),
  });

  return (
    <Button
      variant="contained"
      color="primary"
      disabled={loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
      onClick={() => fetchResume()}
    >
      {loading ? 'Connecting...' : 'Autofill with CVMesh'}
    </Button>
  );
}
```

#### Shadcn UI / Tailwind
```tsx
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { useFetchResume } from '@cvmesh/react';

export function ShadcnApply() {
  const { fetchResume, loading } = useFetchResume({
    onSuccess: ({ resume }) => populateInputs(resume),
  });

  return (
    <Button variant="outline" disabled={loading} onClick={() => fetchResume()}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      Import CVMesh Resume
    </Button>
  );
}
```

---

### Example 4: Requesting Specific Resume Sections

You can restrict the sections requested (candidates can also review and grant/deny specific sections inside the consent popup):

```tsx
const { fetchResume } = useFetchResume({
  // Only request basics, education, and skills
  sections: ['basics', 'education', 'skills'],
  onSuccess: ({ resume }) => {
    // resume.basics and resume.skills are populated
  },
});
```

---

### Example 5: Global Configuration with `CVMeshProvider`

Wrap your application root (e.g. `App.tsx` or `_app.tsx`) to set global default options:

```tsx
import React from 'react';
import { CVMeshProvider } from '@cvmesh/react';

export function App() {
  return (
    <CVMeshProvider
      config={{
        baseUrl: 'https://cvmesh.net', // default: https://cvmesh.net
        timeout: 180000,               // 3 minutes timeout
      }}
    >
      <YourJobPortal />
    </CVMeshProvider>
  );
}
```

---

## API Reference

### `useFetchResume(options?: UseFetchResumeOptions)`

#### Parameters: `options`

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `config` | `CVMeshConfig` | `undefined` | Custom configuration overrides for this hook |
| `sections` | `string[]` | `undefined` | Default sections to request (`basics`, `work`, `skills`, etc.) |
| `format` | `'json' \| 'xml'` | `'json'` | Response format |
| `onSuccess` | `(result: FetchResumeResult) => void` | `undefined` | Called on successful retrieval and token redemption |
| `onError` | `(error: Error) => void` | `undefined` | Called on failure (popup blocked, network error, etc.) |
| `onCancel` | `() => void` | `undefined` | Called when candidate closes the popup or denies sharing |

#### Return Values: `UseFetchResumeReturn`

| Property | Type | Description |
| --- | --- | --- |
| `fetchResume` | `(overrideOptions?) => Promise<FetchResumeResult \| null>` | Triggers the consent popup flow |
| `getButtonProps` | `(userProps?) => ButtonHTMLAttributes` | Generates props to spread onto any button element |
| `resume` | `JsonResume \| null` | The last retrieved JSON Resume object |
| `token` | `string \| null` | The single-use redeemed share token |
| `loading` | `boolean` | `true` while the popup is open or token is being redeemed |
| `error` | `Error \| null` | Error object if request failed or was cancelled |
| `reset` | `() => void` | Clears `resume`, `token`, `error`, and `loading` states |

---

### Error Handling

The hook automatically classifies errors:

- `PopupBlockedError`: Browser blocked the popup window.
- `UserCancelledError`: Candidate dismissed the popup or pressed cancel.
- `TimeoutError`: Request timed out before user interaction.
- `TokenRedemptionError`: HTTP error during token redemption (e.g. expired 3-min token).

```tsx
import { useFetchResume, PopupBlockedError } from '@cvmesh/react';

const { fetchResume } = useFetchResume({
  onError: (err) => {
    if (err instanceof PopupBlockedError) {
      alert('Please allow popups to connect your CVMesh account.');
    }
  },
});
```

---

## License

MIT � [CVMesh](https://cvmesh.net)
