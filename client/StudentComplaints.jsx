import React, { useEffect, useState } from 'react';

function ComplaintFeedback({ complaint, api, onSaved }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const result = await api('complaints/' + complaint.id + '/feedback', {
        rating: Number(fields.get('rating')),
        comment: fields.get('comment'),
      });
      onSaved(result.complaint);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  if (complaint.feedback) {
    return <p className="notice description"><strong>Your feedback · {complaint.feedback.rating}/5</strong>
      {complaint.feedback.comment && <><br />{complaint.feedback.comment}</>}
    </p>;
  }
  if (complaint.status !== 'Resolved') return null;

  return (
    <form onSubmit={submit}>
      <fieldset disabled={pending}>
        <legend>Rate the resolution</legend>
        <label htmlFor={complaint.id + '-rating'}>Rating</label>
        <select id={complaint.id + '-rating'} name="rating" defaultValue="" required>
          <option value="" disabled>Choose a rating</option>
          {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
        </select>
        <label htmlFor={complaint.id + '-feedback'}>Comment (optional)</label>
        <textarea id={complaint.id + '-feedback'} name="comment" rows={2} maxLength={500} />
        <button>{pending ? 'Sending…' : 'Submit feedback'}</button>
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}

export function StudentComplaints({ api }) {
  const [categories, setCategories] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api('complaints/categories'), api('complaints')])
      .then(([categoryData, complaintData]) => {
        if (!active) return;
        setCategories(categoryData.categories);
        setComplaints(complaintData.complaints);
      })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api]);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    setSubmitting(true);
    setSubmitError('');
    setNotice('');
    try {
      const { complaint } = await api('complaints', Object.fromEntries(new FormData(form)));
      setComplaints((previous) => [complaint, ...previous]);
      setNotice('Complaint submitted.');
      form.reset();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateComplaint(updated) {
    setComplaints((previous) => previous.map((record) => record.id === updated.id ? updated : record));
  }

  if (loading) return <p role="status">Loading your complaints…</p>;
  if (loadError) return <p role="alert" className="error">{loadError}</p>;

  return (
    <div className="student-layout">
      <section aria-labelledby="report-title">
        <h2 id="report-title">Report a campus issue</h2>
        <form onSubmit={submit}>
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue="" required>
            <option value="" disabled>Select a category</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <label htmlFor="location">Campus location</label>
          <input id="location" name="location" placeholder="e.g. Lab 3, CS Block"
            maxLength={120} required />
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} minLength={10}
            maxLength={1000} required />
          {submitError && <p role="alert" className="error">{submitError}</p>}
          {notice && <p role="status" className="notice">{notice}</p>}
          <button disabled={submitting}>{submitting ? 'Submitting…' : 'Submit complaint'}</button>
        </form>
      </section>
      <section className="student-history" aria-labelledby="history-title">
        <h2 id="history-title">My complaints</h2>
        {complaints.length === 0 ? <p>You haven’t submitted any complaints yet.</p> : (
          <ul className="complaints">
            {complaints.map((complaint) => (
              <li key={complaint.id}>
                <details name="student-complaint">
                  <summary>
                    <span className="complaint-summary">
                      <span>
                        <strong>{complaint.category}</strong>
                        <small>{complaint.location} · <time dateTime={complaint.createdAt}>
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </time></small>
                      </span>
                      <span className="complaint-status" data-status={complaint.status}>{complaint.status}</span>
                    </span>
                  </summary>
                  <div className="complaint-editor">
                    <p className="description">{complaint.description}</p>
                    {complaint.assignedTeam && <p>Assigned to {complaint.assignedTeam}</p>}
                    {complaint.resolutionNote && <p className="description">
                      <strong>Admin note</strong><br />{complaint.resolutionNote}
                    </p>}
                    <small>Complaint ID {complaint.id}</small>
                    <ComplaintFeedback complaint={complaint} api={api} onSaved={updateComplaint} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
