import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { useFootballContext } from '../../../../contexts/useFootballContext';
import {
  enrichMatch,
  getSofascoreCandidates,
  matchSofascoreCandidate,
  predictMatch,
  analyzeMatchWithAi,
  analyzeMatchWithOllama,
} from '../../../../services/apis/footballApi';

import { TABS, Tab } from './shared';
import MatchHero from './MatchHero';
import MatchingPanel from './MatchingPanel';
import TabOverview from './TabOverview';
import TabDetails from './TabDetails';
import TabLineups from './TabLineups';
import TabStats from './TabStats';
import TabOdds from './TabOdds';
import TabComparison from './TabComparison';
import TabH2H from './TabH2H';
import TabPredictions from './TabPredictions';
import TabSimilar from './TabSimilar';
import { Sec } from './shared';

const actionError = (err: any, fallback: string) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.message) {
    if (Array.isArray(detail?.readiness?.missing) && detail.readiness.missing.length) {
      return `${detail.message}: ${detail.readiness.missing.join(', ')}`;
    }
    const reason = detail?.refresh?.reason || detail?.refresh?.scope || '';
    return reason ? `${detail.message}: ${reason}` : detail.message;
  }
  return err?.message || fallback;
};

// ─── Match page ───────────────────────────────────────────────────────────────

const Match = () => {
  const params = useParams<{ matchId: string }>();
  const location = useLocation();
  const id = decodeURIComponent(
    location.pathname.split('/match/')[1]?.split('/')[0] || params.matchId || ''
  );

  const router = useIonRouter();
  const { getMatchDetail, matchDetail, loading, error } = useFootballContext();

  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [enriching, setEnriching]     = useState(false);
  const [predicting, setPredicting]   = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const [analyzingOllama, setAnalyzingOllama] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidates, setCandidates]   = useState<any[]>([]);
  const [matching, setMatching]       = useState<string | null>(null);
  const [actionMsg, setActionMsg]     = useState('');

  useEffect(() => {
    if (!id) return;
    setCandidates([]);
    getMatchDetail(id);
  }, [id]);

  const refresh = async () => { if (id) await getMatchDetail(id); };

  const handleEnrich = async () => {
    if (!id) return;
    setEnriching(true);
    setActionMsg('');
    try {
      const res = await enrichMatch(id);
      if (res?.matched_sofascore) {
        const web = res?.has_web_context ? 'DuckDuckGo snippets found' : 'DuckDuckGo searched, no snippets';
        setActionMsg(`Enriched from SofaScore. ${web}.`);
      } else {
        setActionMsg('No automatic SofaScore match found');
      }
      await refresh();
    } catch (err: any) {
      setActionMsg(actionError(err, 'Enrichment failed'));
    } finally {
      setEnriching(false);
    }
  };

  const handlePredict = async () => {
    if (!id) return;
    setPredicting(true);
    setActionMsg('');
    try {
      await predictMatch(id);
      setActionMsg('Prediction complete');
      await refresh();
    } catch (err: any) {
      setActionMsg(actionError(err, 'Prediction failed'));
    } finally {
      setPredicting(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!id) return;
    setAnalyzing(true);
    setActionMsg('');
    try {
      await analyzeMatchWithAi(id);
      setActionMsg('AI analysis complete');
      await refresh();
    } catch (err: any) {
      setActionMsg(actionError(err, 'AI analysis failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOllamaAnalysis = async () => {
    if (!id) return;
    setAnalyzingOllama(true);
    setActionMsg('');
    try {
      await analyzeMatchWithOllama(id, 'all');
      setActionMsg('Ollama analysis complete (Qwen3 + DeepSeek-R1)');
      await refresh();
    } catch (err: any) {
      setActionMsg(actionError(err, 'Ollama analysis failed — is Ollama running?'));
    } finally {
      setAnalyzingOllama(false);
    }
  };

  const loadCandidates = async () => {
    if (!id) return;
    setCandidateLoading(true);
    setActionMsg('');
    try {
      const res = await getSofascoreCandidates(id);
      // backend now returns status:'error' with empty candidates instead of 502
      if (res?.status === 'error') {
        setActionMsg(res.error || 'SofaScore scan failed');
        setCandidates([]);
        return;
      }
      setCandidates(res?.candidates || []);
      if (!res?.candidates?.length) setActionMsg('No SofaScore matches found for this match state');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '';
      setActionMsg(detail.includes('not found') ? 'Match not in buffer yet — wait for next ingest cycle' : `Scan failed: ${detail}`);
    } finally {
      setCandidateLoading(false);
    }
  };

  const selectCandidate = async (candidate: any) => {
    if (!id) return;
    setMatching(String(candidate.id));
    setActionMsg('');
    try {
      await matchSofascoreCandidate(id, { sofascore_id: candidate.id, match_date: candidate.match_date, event: candidate.event || candidate });
      setActionMsg('SofaScore match saved. Click Enrich to pull SofaScore detail and DuckDuckGo context.');
      setCandidates([]);
      await refresh();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || 'Matching failed');
    } finally {
      setMatching(null);
    }
  };

  const renderTab = (m: any) => {
    switch (activeTab) {
      case 'Home':
        return (
          <>
            <div className="px-4 pt-4">
              <MatchingPanel
                m={m}
                candidates={candidates}
                loading={candidateLoading}
                matching={matching}
                onLoad={loadCandidates}
                onSelect={selectCandidate}
              />
            </div>
            <TabOverview m={m} onEnrich={handleEnrich} onPredict={handlePredict} enriching={enriching} predicting={predicting} actionMsg={actionMsg} />
          </>
        );
      case 'Details':    return <TabDetails m={m} />;
      case 'Lineups':    return <TabLineups m={m} />;
      case 'Statistics': return <TabStats m={m} />;
      case 'Odds':       return <TabOdds m={m} />;
      case 'Comparison': return <TabComparison m={m} />;
      case 'H2H':        return <TabH2H m={m} />;
      case 'Prediction': return <TabPredictions m={m} onPredict={handlePredict} onAnalyze={handleAiAnalysis} onAnalyzeOllama={handleOllamaAnalysis} predicting={predicting} analyzing={analyzing} analyzingOllama={analyzingOllama} actionMsg={actionMsg} />;
      case 'Similar':    return <TabSimilar m={m} />;
      default:           return <TabOverview m={m} onEnrich={handleEnrich} onPredict={handlePredict} enriching={enriching} predicting={predicting} actionMsg={actionMsg} />;
    }
  };

  const notFound = !loading && !matchDetail;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding-0">
        <IonRefresher slot="fixed" onIonRefresh={async (event) => { await refresh(); event.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] text-white pb-8">
          {/* Back button */}
          <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 border-b border-white/[0.06] px-4 py-3 backdrop-blur">
            <button onClick={() => router.goBack()} className="text-xs font-semibold text-gray-400 hover:text-white">
              Back
            </button>
          </div>

          {matchDetail && (
            <>
              <MatchHero m={matchDetail} activeTab={activeTab} setActiveTab={setActiveTab} />
              {renderTab(matchDetail)}
            </>
          )}

          {loading && !matchDetail && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-500">Loading match...</div>
          )}

          {notFound && (
            <div className="px-4 py-12">
              <Sec title="Match Not Found">
                <p className="text-sm text-gray-500 leading-relaxed">
                  This match is not in the live buffer or finished archive yet. Run the upcoming/live scan, then open it again.
                </p>
                {error && <p className="text-xs text-red-400">{error}</p>}
              </Sec>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Match;
