import { useState } from 'react';
import { useFetchResume } from '@cvmesh/react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  headline: string;
  location: string;
  summary: string;
  website: string;
  github: string;
  linkedin: string;
  skills: string[];
  work: Array<{ company: string; position: string; period: string; summary?: string }>;
}

const emptyForm: FormData = {
  name: '',
  email: '',
  phone: '',
  headline: '',
  location: '',
  summary: '',
  website: '',
  github: '',
  linkedin: '',
  skills: [],
  work: [],
};

export function App() {
  const [baseUrl, setBaseUrl] = useState('https://cvmesh.net');
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const { fetchResume, getButtonProps, loading, resume, token, reset } = useFetchResume({
    config: {
      baseUrl,
    },
    sections: ['basics', 'work', 'education', 'skills'],
    onSuccess: ({ resume: fetchedResume, token: redeemedToken }) => {
      setStatusMessage({
        type: 'success',
        text: `Resume for "${fetchedResume.basics.name}" successfully imported! (Token: ${redeemedToken.substring(0, 14)}...)`,
      });

      // Populate form from standard JSON Resume schema
      setFormData({
        name: fetchedResume.basics.name || '',
        email: fetchedResume.basics.email || '',
        phone: fetchedResume.basics.phone || '',
        headline: fetchedResume.basics.label || '',
        location: [fetchedResume.basics.location?.city, fetchedResume.basics.location?.countryCode]
          .filter(Boolean)
          .join(', '),
        summary: fetchedResume.basics.summary || '',
        website: fetchedResume.basics.url || '',
        github: fetchedResume.basics.github || '',
        linkedin: fetchedResume.basics.linkedin || '',
        skills: (fetchedResume.skills || []).map((s) => s.name).filter(Boolean),
        work: (fetchedResume.work || []).map((w) => ({
          company: w.name,
          position: w.position,
          period: `${w.startDate} - ${w.endDate || 'Present'}`,
          summary: w.summary,
        })),
      });
    },
    onCancel: () => {
      setStatusMessage({
        type: 'warning',
        text: 'Candidate dismissed the popup or cancelled sharing.',
      });
    },
    onError: (err) => {
      setStatusMessage({
        type: 'error',
        text: `Failed to fetch resume: ${err.message}`,
      });
    },
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFormData(emptyForm);
    setStatusMessage(null);
    reset();
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Candidate Application Portal</h1>
        <p>Example third-party job application form integrated with <strong>@cvmesh/react</strong></p>
      </div>

      {/* CVMesh Configuration / Target Environment */}
      <div className="card">
        <div className="card-title">
          <span>Target CVMesh Environment</span>
          <span className="badge badge-blue">Open Resume Share</span>
        </div>
        <div className="config-bar">
          <label htmlFor="base-url-input">CVMesh Base URL:</label>
          <input
            id="base-url-input"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://cvmesh.net"
          />
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={() => setBaseUrl('https://cvmesh.net')}
          >
            Production
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={() => setBaseUrl('http://localhost:3000')}
          >
            Local (localhost:3000)
          </button>
        </div>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          By default, requests point to <code>https://cvmesh.net</code>. If running CVMesh locally for testing, switch to <code>http://localhost:3000</code>.
        </p>
      </div>

      {/* Application Form */}
      <div className="card">
        <div className="card-title">
          <span>Job Application Form</span>
          {resume && (
            <span className="badge badge-green">
              Autofilled via CVMesh {token ? `(${token.substring(0, 10)}...)` : ''}
            </span>
          )}
        </div>

        {/* Action Row demonstrating useFetchResume */}
        <div className="actions-row">
          {/* Method A: Using getButtonProps */}
          <button
            {...getButtonProps({
              className: 'btn btn-primary',
            })}
          >
            {loading && <span className="spinner" />}
            {loading ? 'Connecting to CVMesh...' : '? Autofill with CVMesh'}
          </button>

          {/* Method B: Direct fetchResume call */}
          <button
            type="button"
            className="btn btn-outline"
            disabled={loading}
            onClick={() => fetchResume({ sections: ['basics', 'skills'] })}
            title="Fetches only basic info and skills sections"
          >
            Autofill (Basics & Skills Only)
          </button>

          <button
            type="button"
            className="btn btn-outline"
            disabled={loading}
            onClick={handleClear}
          >
            Clear Form
          </button>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div
            className={`alert ${
              statusMessage.type === 'success'
                ? 'alert-success'
                : statusMessage.type === 'warning'
                ? 'alert-warning'
                : 'alert-danger'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* The Form Fields */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="e.g. jane@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +1 (555) 012-3456"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Professional Headline</label>
              <input
                type="text"
                placeholder="e.g. Senior Full Stack Engineer"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g. San Francisco, US"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Portfolio / Website</label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>LinkedIn</label>
              <input
                type="text"
                placeholder="linkedin.com/in/..."
                value={formData.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>GitHub</label>
              <input
                type="text"
                placeholder="github.com/..."
                value={formData.github}
                onChange={(e) => handleInputChange('github', e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>Professional Summary</label>
              <textarea
                placeholder="Brief summary of your professional background..."
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
              />
            </div>

            {formData.skills.length > 0 && (
              <div className="form-group full-width">
                <label>Skills ({formData.skills.length})</label>
                <div className="skills-list">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formData.work.length > 0 && (
              <div className="form-group full-width">
                <label>Work Experience ({formData.work.length})</label>
                <div>
                  {formData.work.map((w, index) => (
                    <div key={index} className="work-item">
                      <div className="work-title">
                        {w.position} at {w.company}
                      </div>
                      <div className="work-meta">{w.period}</div>
                      {w.summary && <p style={{ fontSize: '13px', marginTop: '4px' }}>{w.summary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Raw JSON Debug Viewer */}
      {resume && (
        <div className="card">
          <div className="card-title">
            <span>Redeemed JSON Resume (Schema Output)</span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => setShowRawJson((prev) => !prev)}
            >
              {showRawJson ? 'Hide JSON' : 'View JSON'}
            </button>
          </div>
          {showRawJson && (
            <pre className="raw-json">
              <code>{JSON.stringify(resume, null, 2)}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
