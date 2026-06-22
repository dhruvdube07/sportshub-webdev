import { useEffect, useRef, useState } from "react";
import { getSupabase, supabaseErrorMessage } from "../lib/supabaseClient";

const initialForm = {
  name: "",
  email: "",
  surveyTitle: "",
  feedback: "",
  rating: "5",
};

function SurveyPage() {
  const [form, setForm] = useState(initialForm);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [submittedSurvey, setSubmittedSurvey] = useState(null);
  const [previewSurvey, setPreviewSurvey] = useState(null);
  const [timer, setTimer] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Fill out the survey and submit it. You have 60 seconds to edit or delete it, or choose direct submit to finalize immediately."
  );
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);
  const [devUrl, setDevUrl] = useState("");
  const [devKey, setDevKey] = useState("");
  const [clientAvailable, setClientAvailable] = useState(!!getSupabase());
  const [clientInfo, setClientInfo] = useState(null);

  useEffect(() => {
    if (!activeSurvey || activeSurvey.is_finalized) {
      setTimer(0);
      return;
    }

    const refresh = async () => {
      const expires = new Date(activeSurvey.pending_expires_at).getTime();
      const remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
      setTimer(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        await finalizeSurvey(activeSurvey.id);
      }
    };

    refresh();
    timerRef.current = setInterval(refresh, 500);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [activeSurvey]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setPreviewSurvey(null);
  };

  const getClientInfo = () => {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      return { source: 'env', url: import.meta.env.VITE_SUPABASE_URL, key: `${key.slice(0,6)}...${key.slice(-6)}` };
    }

    if (typeof window !== 'undefined') {
      const devUrl = sessionStorage.getItem('DEV_SUPABASE_URL');
      const devKey = sessionStorage.getItem('DEV_SUPABASE_ANON_KEY');
      if (devUrl && devKey) return { source: 'session', url: devUrl, key: `${devKey.slice(0,6)}...${devKey.slice(-6)}` };
    }

    return null;
  };

  useEffect(() => {
    setClientInfo(getClientInfo());
  }, [clientAvailable]);

  const buildPayload = (direct = false) => ({
    name: form.name,
    email: form.email,
    survey_title: form.surveyTitle,
    feedback: form.feedback,
    rating: Number(form.rating),
    is_finalized: direct,
    pending_expires_at: direct ? null : new Date(Date.now() + 60000).toISOString(),
    last_updated_at: new Date().toISOString(),
  });

  const submitSurvey = async ({ direct = false } = {}) => {
    const supabase = getSupabase();
    if (!supabase) {
      setStatusMessage(supabaseErrorMessage);
      return;
    }

    if (!form.name || !form.email || !form.surveyTitle) {
      setStatusMessage("Please enter your name, email, and survey title.");
      return;
    }

    setBusy(true);

    try {
      const payload = buildPayload(direct);

      if (activeSurvey && !activeSurvey.is_finalized) {
        const { data, error } = await supabase
          .from("surveys")
          .update(payload)
          .eq("id", activeSurvey.id)
          .select()
          .single();

        if (error) throw error;

        setActiveSurvey(data);
        setSubmittedSurvey(data);
        setForm(initialForm);
        setStatusMessage(
          direct
            ? "Survey finalized immediately."
            : "Survey submitted. Thank you for your feedback."
        );
      } else {
        const { data, error } = await supabase
          .from("surveys")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        setActiveSurvey(data);
        setSubmittedSurvey(data);
        setForm(initialForm);
        setStatusMessage(
          direct
            ? "Survey submitted directly. It is now final."
            : "Survey submitted. Thank you for your feedback."
        );
      }
    } catch (error) {
      console.error("Supabase error:", error);
      const details = error?.details || error?.message || JSON.stringify(error);
      setStatusMessage(`Error: ${details}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = (event) => {
    if (event) event.preventDefault();

    const preview = {
      name: form.name,
      email: form.email,
      survey_title: form.surveyTitle,
      feedback: form.feedback,
      rating: Number(form.rating),
      is_finalized: false,
    };

    setPreviewSurvey(preview);
    setStatusMessage("Survey preview updated. Use Submit final to save it permanently.");
  };

  const handleDirectSubmit = async () => {
    await submitSurvey({ direct: true });
  };

  const finalizeSurvey = async (surveyId) => {
    if (!surveyId) return;

    const supabase = getSupabase();
    if (!supabase) {
      setStatusMessage(supabaseErrorMessage);
      return;
    }

    const { error } = await supabase
      .from("surveys")
      .update({ is_finalized: true })
      .eq("id", surveyId);

    if (error) {
      setStatusMessage("Could not finalize survey. Check your Supabase table settings.");
      return;
    }

    setActiveSurvey((prev) => (prev ? { ...prev, is_finalized: true } : prev));
    setStatusMessage("Your survey is now final and stored permanently.");
  };

  const handleDelete = async () => {
    if (!activeSurvey) return;

    const supabase = getSupabase();
    if (!supabase) {
      setStatusMessage(supabaseErrorMessage);
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("surveys")
      .delete()
      .eq("id", activeSurvey.id);

    if (error) {
      setStatusMessage("Could not delete survey. Try again.");
      setBusy(false);
      return;
    }

    setActiveSurvey(null);
    setForm(initialForm);
    setStatusMessage("Survey deleted. You can submit a new one anytime.");
    setBusy(false);
  };

  const previewSource = previewSurvey || activeSurvey;

  if (submittedSurvey) {
    return (
      <section className="survey-page">
        <h2>Survey Submitted</h2>
        <p>Thanks for your response! Your survey has been saved successfully.</p>
        <div className="survey-card">
          <p className="status">{statusMessage}</p>
          <p>
            If you want to submit another survey, refresh the page or navigate back here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="survey-page">
      <h2>Sports Survey Studio</h2>
      <p>
        Create a one-of-a-kind sports survey and submit it to Supabase. After submission, you have 60 seconds to change or delete it before it becomes final.
      </p>

      {/* Dev helper: allow pasting anon key at runtime to test without editing files */}
      {!clientAvailable && (
        <div className="survey-preview">
          <h3>Supabase configuration missing</h3>
          <p>{supabaseErrorMessage}</p>
          <p>
            Create `learn/.env.local` with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the dev server.
          </p>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontWeight: 600 }}>Temp Project URL</label>
            <input
              value={devUrl}
              onChange={(e) => setDevUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              style={{ width: '100%', padding: 8, marginTop: 6 }}
            />

            <label style={{ display: 'block', fontWeight: 600, marginTop: 12 }}>Temp ANON Key</label>
            <input
              value={devKey}
              onChange={(e) => setDevKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              style={{ width: '100%', padding: 8, marginTop: 6 }}
            />

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="survey-button"
                onClick={() => {
                  try {
                    sessionStorage.setItem('DEV_SUPABASE_URL', devUrl);
                    sessionStorage.setItem('DEV_SUPABASE_ANON_KEY', devKey);
                    setClientAvailable(!!getSupabase());
                    setStatusMessage('Temporary key saved to session. You can now submit.');
                  } catch (e) {
                    setStatusMessage('Could not save key to sessionStorage.');
                  }
                }}
              >
                Save temp key
              </button>

              <button
                type="button"
                className="survey-delete"
                onClick={() => {
                  sessionStorage.removeItem('DEV_SUPABASE_URL');
                  sessionStorage.removeItem('DEV_SUPABASE_ANON_KEY');
                  setClientAvailable(!!getSupabase());
                  setStatusMessage('Temporary key cleared. Restart dev server or add env variables.');
                }}
              >
                Clear temp key
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <strong>Active client:</strong>
              <div style={{ marginTop: 6 }}>{clientInfo ? `${clientInfo.source} — ${clientInfo.url} — ${clientInfo.key}` : 'none'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="survey-grid">
        <div className="survey-card">
          <form onSubmit={handlePreview}>
            <div className="survey-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="survey-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="survey-field">
              <label htmlFor="surveyTitle">Survey Title</label>
              <input
                id="surveyTitle"
                value={form.surveyTitle}
                onChange={(event) => updateField("surveyTitle", event.target.value)}
                placeholder="Favorite championship or event"
              />
            </div>

            <div className="survey-field">
              <label htmlFor="rating">How would you rate this season?</label>
              <select
                id="rating"
                value={form.rating}
                onChange={(event) => updateField("rating", event.target.value)}
              >
                <option value="5">5 — Legendary</option>
                <option value="4">4 — Great</option>
                <option value="3">3 — Good</option>
                <option value="2">2 — Meh</option>
                <option value="1">1 — Needs work</option>
              </select>
            </div>

            <div className="survey-field">
              <label htmlFor="feedback">What should change next season?</label>
              <textarea
                id="feedback"
                value={form.feedback}
                onChange={(event) => updateField("feedback", event.target.value)}
                placeholder="Tell us what matters most."
              />
            </div>

            <div className="survey-actions">
              <button className="survey-button" type="submit" disabled={busy}>
                Preview survey
              </button>
              <button
                type="button"
                className="survey-button"
                onClick={handleDirectSubmit}
                disabled={busy}
              >
                {activeSurvey && !activeSurvey.is_finalized ? "Finalize now" : "Submit final"}
              </button>
              {activeSurvey && !activeSurvey.is_finalized && (
                <button
                  type="button"
                  className="survey-delete"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  Delete survey
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="survey-preview">
          <h3>Survey preview</h3>
          <p className="status">{statusMessage}</p>

          {previewSource ? (
            <>
              <p>
                <strong>Title:</strong> {previewSource.survey_title}
              </p>
              <p>
                <strong>Name:</strong> {previewSource.name}
              </p>
              <p>
                <strong>Email:</strong> {previewSource.email}
              </p>
              <p>
                <strong>Rating:</strong> {previewSource.rating} / 5
              </p>
              <p>
                <strong>Feedback:</strong> {previewSource.feedback || "No extra notes provided."}
              </p>
              <div className="countdown">
                {previewSource.is_finalized ? (
                  <span className="final">This survey is final.</span>
                ) : (
                  <span>Editable for {timer} second{timer === 1 ? "" : "s"}.</span>
                )}
              </div>
            </>
          ) : (
            <p>Complete the form and click Preview survey to see it here.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default SurveyPage;
