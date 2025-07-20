import React from "react";
import { Redirect, Route } from "react-router-dom";
import { IonRouterOutlet } from "@ionic/react";
import { useAuth } from "../contexts/useAuthContext";

const Loading= React.lazy(() => import( "../components/loading/Loading"));
const Main = React.lazy(() => import("../pages/main/main"));
const Services = React.lazy(() => import("../pages/services/services"));
const  MatchDetails = React.lazy(() => import( "../pages/main/details/match/page"));
const  CountryDetails = React.lazy(() => import( "../pages/main/details/country/page"));
const  TeamDetails = React.lazy(() => import( "../pages/main/details/team/page"));
const  LeagueDetails = React.lazy(() => import( "../pages/main/details/league/page"));

const ProtectedRoute: React.FC<{
  component: React.ComponentType<any>;
  path: string;
  exact?: boolean;
  allowedRoles?: string[];
}> = ({ component: Component, allowedRoles, ...rest }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          !allowedRoles || allowedRoles.includes(user?.role?.toLowerCase()) ? (
            <Component {...props} />
          ) : (
            <Redirect to="/unauthorized" />
          )
        ) : (
          <Redirect to="/sign-in" />
        )
      }
    />
  );
};

const Routes: React.FC = () => {
  return (
    <IonRouterOutlet>
      <Route path="/country/:id" exact component={CountryDetails} />
      <Route path="/team/:id" exact component={TeamDetails} />
      <Route path="/league/:id" exact component={LeagueDetails} />
      <Route path="/match/:id" exact component={MatchDetails} />
      <Route path="/services" exact component={Services} />
      <Route path="/" exact component={Main} />

      
      <Route render={() => <Redirect to="/" />} />
   
    </IonRouterOutlet>
  );
};

export default Routes;