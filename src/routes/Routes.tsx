import React from "react";
import { Redirect, Route } from "react-router-dom";
import { IonRouterOutlet } from "@ionic/react";
import { useAuth } from "../contexts/useAuthContext";

const Analytics = React.lazy(() => import("../pages/analytics/analytics"));
const UpcomingAnalytics = React.lazy(() => import("../pages/analytics/upcoming"));
const PredictionDashboard = React.lazy(() => import("../pages/main/prediction/dashboard"));
const ModelExplorer = React.lazy(() => import("../pages/main/prediction/model-explorer"));
const Builder = React.lazy(() => import("../pages/main/prediction/betbuilder/index"));
const Engine = React.lazy(() => import("../pages/main/prediction/engines/index"));
const EngineDetails = React.lazy(() => import("../pages/main/prediction/engines/details/index"));
const ValueBets = React.lazy(() => import("../pages/main/prediction/value-bets/index"));
const Suggestions = React.lazy(() => import("../pages/main/prediction/suggestion/index"));
const Rating = React.lazy(() => import("../pages/main/prediction/rating/index"));
const Competitions = React.lazy(() => import("../pages/main/competition/page"));
const CompetitionDetail = React.lazy(() => import("../pages/main/competition/detail"));
const Pipelines = React.lazy(() => import("../pages/main/pipelines/page"));
const Scheduler = React.lazy(() => import("../pages/main/scheduler/page"));
const Splash = React.lazy(() => import("../pages/splash/splash"));
const Home = React.lazy(() => import("../pages/main/main"));
const Loading = React.lazy(() => import("../components/loading/Loading"));
const MatchDetails = React.lazy(() => import("../pages/main/details/match/page"));
const PredictionPage = React.lazy(() => import("../pages/main/details/match/PredictionPage"));
const OddsMovementDetail = React.lazy(() => import("../pages/main/details/match/OddsMovementDetail"));
const CountryDetails = React.lazy(() => import("../pages/main/details/country/page"));
const TeamDetails = React.lazy(() => import("../pages/main/details/team/page"));
const LeagueDetails = React.lazy(() => import("../pages/main/details/league/page"));
const SignIn = React.lazy(() => import("../pages/authentication/sign-in/page"));
const SignUpStepOne = React.lazy(() => import("../pages/authentication/sign-up/step-one/page"));
const SignUpStepTwo = React.lazy(() => import("../pages/authentication/sign-up/step-two/page"));
const Welcome = React.lazy(() => import("../pages/authentication/welcome/page"));

const Routes: React.FC = () => {
  return (
    <IonRouterOutlet>
      {/* Auth */}
      <Route path="/sign-in" exact component={SignIn} />
      <Route path="/sign-up" exact component={SignUpStepOne} />
      <Route path="/sign-up/step-two" exact component={SignUpStepTwo} />
      <Route path="/welcome" exact component={Welcome} />

      {/* Main */}
      <Route path="/analytics" exact component={Analytics} />
      <Route path="/analytics/upcoming" exact component={UpcomingAnalytics} />
      <Route path="/prediction/dashboard" exact component={PredictionDashboard} />
      <Route path="/prediction/picks-hub" exact component={Builder} />
      <Route path="/prediction/picks" exact component={Builder} />
      <Route path="/prediction/model-explorer" exact component={ModelExplorer} />
      <Route path="/builder" exact component={Builder} />
      <Route path="/engines" exact component={Engine} />
      <Route path="/prediction/value-bets" exact component={ValueBets} />
      <Route path="/suggestions" exact component={Suggestions} />
      <Route path="/rating" exact component={Rating} />
      <Route path="/competitions" exact component={Competitions} />
      <Route path="/competition/:key" exact component={CompetitionDetail} />
      <Route path="/pipelines" exact component={Pipelines} />
      <Route path="/scheduler" exact component={Scheduler} />
      <Route path="/country/:id" exact component={CountryDetails} />
      <Route path="/team/:id" exact component={TeamDetails} />
      <Route path="/league/:id" exact component={LeagueDetails} />
      <Route path="/engine/:id" exact component={React.lazy(() => import('../pages/main/prediction/engines/signals'))} />
      <Route path="/engine/:id/details" exact component={EngineDetails} />

      {/*
        Match routes — odds detail MUST come before the base match route.
        Both use path prefix matching on location.pathname internally
        because match IDs can contain encoded colons (sr%3Amatch%3A...).
        The regex path ensures React Router doesn't confuse the encoded
        colon segments with nested route params.
      */}
      <Route
        path="/match/:matchId/odds/:index"
        exact
        component={OddsMovementDetail}
      />
      <Route
        path="/match/:matchId"
        exact
        component={MatchDetails}
      />
      <Route
        path="/match/:matchId/prediction"
        exact
        component={PredictionPage}
      />

      <Route path="/home" exact component={Home} />
      <Route path="/" exact component={Splash} />
      <Route render={() => <Redirect to="/home" />} />
    </IonRouterOutlet>
  );
};

export default Routes;
