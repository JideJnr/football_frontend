import React from "react";
import { Redirect, Route } from "react-router-dom";
import { IonRouterOutlet } from "@ionic/react";
import { useAuth } from "../contexts/useAuthContext";

const Analytics = React.lazy(() => import("../pages/analytics/analytics"));
const Builder = React.lazy(() => import("../pages/main/prediction/betbuilder/index"));
const Engine = React.lazy(() => import("../pages/main/prediction/engines/index"));
const ValueBets = React.lazy(() => import("../pages/main/prediction/value-bets/index"));
const Suggestions = React.lazy(() => import("../pages/main/prediction/suggestion/index"));
const Rating = React.lazy(() => import("../pages/main/prediction/rating/index"));
const Splash = React.lazy(() => import("../pages/splash/splash"));
const Home = React.lazy(() => import("../pages/main/main"));
const Loading = React.lazy(() => import("../components/loading/Loading"));
const MatchDetails = React.lazy(() => import("../pages/main/details/match/page"));
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
      <Route path="/builder" exact component={Builder} />
      <Route path="/engines" exact component={Engine} />
      <Route path="/prediction/value-bets" exact component={ValueBets} />
      <Route path="/suggestions" exact component={Suggestions} />
      <Route path="/rating" exact component={Rating} />
      <Route path="/country/:id" exact component={CountryDetails} />
      <Route path="/team/:id" exact component={TeamDetails} />
      <Route path="/league/:id" exact component={LeagueDetails} />
      <Route path="/engine/:id" exact component={React.lazy(() => import('../pages/main/prediction/engines/signals'))} />

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

      <Route path="/home" exact component={Home} />
      <Route path="/" exact component={Splash} />
      <Route render={() => <Redirect to="/home" />} />
    </IonRouterOutlet>
  );
};

export default Routes;
