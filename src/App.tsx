import React from "react";
import Map from "./assets/Map.tsx";

const App: React.FC = () => {
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    return (
        <div>
            <h1>Mapa Kościołów</h1>
            <Map apiKey={googleMapsApiKey} />
        </div>
    );
};

export default App;