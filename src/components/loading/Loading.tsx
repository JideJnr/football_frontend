// src/components/Loading.tsx
import { IonSpinner } from "@ionic/react";
import React from "react";

const Loading: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <IonSpinner name="crescent" />
    </div>
  );
};

export default Loading;