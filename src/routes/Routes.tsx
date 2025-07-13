import React from "react";
import { Redirect, Route } from "react-router-dom";
import { IonRouterOutlet } from "@ionic/react";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/loading/Loading";

const Main = React.lazy(() => import("../pages/main/main"));
const Services = React.lazy(() => import("../pages/services/services"));

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
      <Route path="/services" exact component={Services} />
      <Route path="/" exact component={Main} />

      
      <Route render={() => <Redirect to="/" />} />
   
    </IonRouterOutlet>
  );
};

export default Routes;