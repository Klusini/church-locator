import {GoogleMap, Marker, useLoadScript} from "@react-google-maps/api"
import "./Map.css"
import React, {useState} from "react";

interface MarkerData {
    id: number;
    name: string;
    position: google.maps.LatLngLiteral;
}

const options = {
    disableDefaultUI: true, // Wyłącza wszystkie domyślne przyciski
    zoomControl: false,     // Wyłącza przycisk zoomowania
    fullscreenControl: false, // Wyłącza fullscreen
    streetViewControl: false, // Wyłącza street view
    mapTypeControl: false, // Ukrywa przełącznik "Map/Satellite"
};

interface MapProps {
    apiKey: string
}

const Map: React.FC<MapProps> = ({ apiKey }) =>  {
    const [center, setCenter] = useState<google.maps.LatLngLiteral>({lat: 51.9194, lng: 19.1451})
    const [location, setLocation] = useState("");
    const [markers, setMarkers] = useState<MarkerData[]>([
        {id: 1, name: "Kościół A", position: {lat: 51.9194, lng: 19.1451}},
        {id: 2, name: "Kościół B", position: {lat: 50.0614, lng: 19.9372}},
    ]);
    const clear = () => {
        setMarkers([])
    }
    const {isLoaded} = useLoadScript({
        googleMapsApiKey: apiKey
    });

    const geocode = async (request: google.maps.GeocoderRequest) => {

        const geocoder = new google.maps.Geocoder();

        try {
            await geocoder.geocode(request, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                    const center = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng(),
                    };
                    setCenter(center);

                    const newMarker: MarkerData = {
                        id: Date.now(), // Używamy bieżącego czasu jako unikalnego ID
                        name: request.address || "",
                        position: center,
                    };
                    setMarkers((prevMarkers) => [...prevMarkers, newMarker]);

                } else {
                    console.error("Geocode failed due to: " + status);
                }
            });
        } catch (error) {
            console.error("Error during geocoding", error);
        }
    }

    if (!isLoaded) return <div>Loading...</div>;

    return (
        <div className="map-container">
            <GoogleMap mapContainerClassName={"google-map"} center={center} zoom={6} options={options}>
                {markers.map(marker => (
                    <Marker key={marker.id} position={marker.position}/>
                ))}
            </GoogleMap>
            <div className={"map-buttons"}>
                <input type={"text"} className={"location-input"} placeholder={"Enter a location"}
                       onChange={(e) => setLocation(e.target.value)}/>
                <button type={"button"} className={"map-button"} onClick={ async () => {
                        try {
                            await geocode({address: location});
                            console.log("Geocode succeeded");
                        } catch (error) {
                            console.error("Geocode error:", error);
                        }
                }}>
                    Geocode
                </button>
                <button type={"button"} className={"map-button"} onClick={() => {
                    clear()
                }}>
                    Clear
                </button>
            </div>
        </div>
    );
}

export default Map;