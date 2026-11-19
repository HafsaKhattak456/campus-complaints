import React, { useEffect, useState } from 'react';

function ComplaintEditor({ complaint, teams, statuses, api, onSaved }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage('');
    setError('');
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const { complaint: updated } = await api('admin/complaints/' + complaint.id, fields, 'PATCH');
      onSaved(updated);
      setMessage('Saved as ' + updated.status + '.');
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <li>
      <h3>{complaint.category}</h3>
      <p>{complaint.location}</p>
      <p className="description">{complaint.description}</p>
      <p>Reported by {complaint.student ? complaint.student.name + ' (' + complaint.student.email + ')' : 'Unavailable'}</p>
      {complaint.feedback && <p className="description">
        <strong>Student feedback · {complaint.feedback.rating}/5</strong>
        {complaint.feedback.comment && <><br />{complaint.feedback.comment}</>}
      </p>}
      <small>Complaint ID {complaint.id}</small>
      <form onSubmit={save}>
        <fieldset disabled={pending}>
          <label htmlFor={complaint.id + '-team'}>Assigned team</label>
          <select id={complaint.id + '-team'} name="assignedTeam" defaultValue={complaint.assignedTeam}>
            <option value="">Unassigned</option>
            {teams.map((team) => <option key={team}>{team}</option>)}
          </select>
          <label htmlFor={complaint.id + '-status'}>Status</label>
          <select id={complaint.id + '-status'} name="status" defaultValue={complaint.status}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <label htmlFor={complaint.id + '-note'}>Student-visible note</label>
          <textarea id={complaint.id + '-note'} name="resolutionNote"
            defaultValue={complaint.resolutionNote} rows={3} maxLength={1000} />
          <small>Required when resolving or rejecting a complaint.</small>
          <button>{pending ? 'Saving…' : 'Save changes'}</button>
        </fieldset>
        {message && <p role="status" className="notice">{message}</p>}
        {error && <p role="alert" className="error">{error}</p>}
      </form>
    </li>
  );
}

function ComplaintStatistics({ complaints, categories, statuses }) {
  const byStatus = new Map(statuses.map((status) => [status, 0]));
  const byCategory = new Map(categories.map((category) => [category, 0]));
  for (const complaint of complaints) {
    byStatus.set(complaint.status, (byStatus.get(complaint.status) ?? 0) + 1);
    byCategory.set(complaint.category, (byCategory.get(complaint.category) ?? 0) + 1);
  }
  return (
    <section className="statistics" aria-labelledby="statistics-title">
      <h2 id="statistics-title">Complaint overview</h2>
      <dl className="stat-grid">
        {[['Total complaints', complaints.length], ...byStatus].map(([label, count]) => (
          <div key={label}><dt>{label}</dt><dd>{count}</dd></div>
        ))}
      </dl>
      <table className="category-table">
        <caption>Complaints by category</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Count</th></tr></thead>
        <tbody>{[...byCategory].map(([category, count]) => (
          <tr key={category}><th scope="row">{category}</th><td>{count}</td></tr>
        ))}</tbody>
      </table>
    </section>
  );
}

export function AdminComplaints({ api }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api('admin/complaints').then((result) => { if (active) setData(result); })
      .catch((error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [api]);

  function updateComplaint(updated) {
    setData((previous) => ({
      ...previous,
      complaints: previous.complaints.map((record) =>
        record.id === updated.id ? { ...record, ...updated } : record),
    }));
  }

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <p role="status">Loading complaints…</p>;

  return (
    <div className="dashboard-block">
      <ComplaintStatistics {...data} />
      <h2>Complaint queue</h2>
      {data.complaints.length === 0 ? <p>No complaints have been submitted yet.</p> : (
        <ul className="complaints">
          {data.complaints.map((complaint) => (
            <ComplaintEditor key={complaint.id} complaint={complaint}
              statuses={data.statuses} teams={data.teams} api={api} onSaved={updateComplaint} />
          ))}
        </ul>
      )}
    </div>
  );
}
