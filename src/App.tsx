import React, {useEffect, useRef, useState} from "react";
import {Libraries, useLoadScript} from "@react-google-maps/api";
import NewMap from "./components/Map/Map.tsx";
import MapButtons from "./components/Map/MapButtons";
import useGeocode from "./hooks/useGeocode";
import "./styles/App.css"
import useNearbySearch from "./hooks/useNearbySearch.ts";
import GoogleLoginButton from "./components/GoogleLoginButton.tsx";
import {CredentialResponse} from "@react-oauth/google";
import UserInfo from "./components/UserInfo.tsx";

interface MarkerData {
    id: number;
    name: string;
    position: google.maps.LatLngLiteral;
    description?: string;
    address?: string;
    hours?: string;
    isFavourite?: boolean;
}


interface UserData {
    name: string;
    avatarUrl: string;
}

const options = {
    disableDefaultUI: true, // Wyłącza wszystkie domyślne przyciski
    zoomControl: false,     // Wyłącza przycisk zoomowania
    fullscreenControl: false, // Wyłącza fullscreen
    streetViewControl: false, // Wyłącza street view
    mapTypeControl: false, // Ukrywa przełącznik "Map/Satellite"
};

const LIBRARIES: Libraries = ["places", "marker"];

const App: React.FC = () => {

    const apiKey: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const [user, setUser] = useState<UserData | null>(null);

    const [center, setCenter] = useState<google.maps.LatLngLiteral>({lat: 51.9194, lng: 19.1451})
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [shouldFetchMarkers, setShouldFetchMarkers] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null); // Referencja do mapy
    const {searchNearby} = useNearbySearch(mapRef.current); // Hook do Nearby Search
    const {geocode} = useGeocode()

    const {isLoaded} = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES
    });

    const handleGeocode = async (location: string) => {
        try {
            const result = await geocode(location)
            if (result) {
                const favorites: MarkerData[] = JSON.parse(localStorage.getItem("favorites") || "[]");

                const newMarker = {
                    id: Date.now(),
                    name: location,
                    position: result,
                    isFavourite: !!favorites.find((fav) =>
                        fav.position.lat === result.lat && fav.position.lng === result.lng
                    ),
                };

                setCenter(result)
                setMarkers((prev) => [...prev, newMarker]);
            }
            setShouldFetchMarkers(true)
        } catch (error) {
            console.error(error);
        }
    }


    useEffect(() => {
        // Wykonaj wyszukiwanie, gdy mapRef istnieje
        if (mapRef.current && shouldFetchMarkers) {
            searchNearby(center, 5000) // 5000m (5 km) promień wyszukiwania
                .then((places) => {
                    const favorites: MarkerData[] = JSON.parse(localStorage.getItem("favorites") || "[]");

                    const churchMarkers = places.map((place, index) => {
                        const position = {
                            lat: place.geometry?.location?.lat() ?? 0,
                            lng: place.geometry?.location?.lng() ?? 0,
                        };

                        // Sprawdź, czy marker jest w ulubionych
                        const isFavourite = !!favorites.find((fav) =>
                            fav.position.lat === position.lat && fav.position.lng === position.lng
                        );

                        return {
                            id: index,
                            name: place.name || "Nieznany kościół",
                            position,
                            description: place.types?.join(", ") || "Brak opisu",
                            address: place.vicinity || "Brak adresu",
                            hours: place.opening_hours?.weekday_text?.join("<br>") || "Brak informacji o godzinach",
                            isFavourite, // Dodaj właściwość
                        };
                    });
                    setMarkers(churchMarkers);
                })
                .catch(console.error)
            setShouldFetchMarkers(false)
        }
    }, [shouldFetchMarkers, searchNearby, center]); // Aktualizuj, gdy zmienia się "center"

    const clearMarkers = () => {
        setMarkers([])
        setShouldFetchMarkers(false)
    }

    const infoWindow = useRef<google.maps.InfoWindow | null>(null);

    useEffect(() => {
        if (!isLoaded) return;
        if (!infoWindow.current) {
            infoWindow.current = new google.maps.InfoWindow();
        }
    }, [isLoaded]);

    const handleMarkerClick = (
        marker: MarkerData
    ) => {
        if (!mapRef.current || !infoWindow.current) {
            console.error("Map or InfoWindow is not available.");
            return;
        }

        const {id, name, description, position, address, hours, isFavourite} = marker;
        const content = user
            ? `
            <div>
                <h3>${name}</h3>
                <p>${description}</p>
                <p><strong>Adres:</strong> ${address}</p>
                <p><strong>Godziny otwarcia:</strong> ${hours}</p>
                <button id="add-to-favorites-${id}" style="background-color: transparent">
                <img src="${isFavourite ? "favourite.png" : "notFavourite.png"}"  alt="Heart icon" width="24" height="24"/>
            </button>
            </div>
        `
            : `
            <div>
                <h3>${name}</h3>
                <p>${description}</p>
                <p><strong>Adres:</strong> ${address}</p>
                <p><strong>Godziny otwarcia:</strong> ${hours}</p>
                <p style="color: red;">Zaloguj się, aby dodać do ulubionych.</p>
            </div>
        `;

        infoWindow.current.setContent(content);
        infoWindow.current.setPosition(position);
        infoWindow.current.open(mapRef.current);

        google.maps.event.addListenerOnce(infoWindow.current, "domready", () => {
            const button = document.getElementById(`add-to-favorites-${id}`);
            if (button) {
                button.addEventListener("click", () => AddAndRemoveFavoriteMarkers(marker));
            }
        });

    };

    const AddAndRemoveFavoriteMarkers = (marker: MarkerData) => {
        if (!user) {
            alert("Musisz być zalogowany, aby dodać marker do ulubionych.");
            return;
        }

        const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        const alreadyFavorite = favorites.some((fav: MarkerData) => fav.id === marker.id);

        let updatedFavorites;
        let updatedMarkers;

        if (alreadyFavorite) {
            // Usuń marker z ulubionych
            updatedFavorites = favorites.filter((fav: MarkerData) => fav.id !== marker.id);
            updatedMarkers = markers.map((m) =>
                m.id === marker.id ? {...m, isFavourite: false} : m
            );
            alert(`${marker.name} został usunięty z ulubionych.`);
        } else {
            // Dodaj marker do ulubionych
            updatedFavorites = [...favorites, {...marker, isFavourite: true}];
            updatedMarkers = markers.map((m) =>
                m.id === marker.id ? {...m, isFavourite: true} : m
            );
            alert(`${marker.name} został dodany do ulubionych!`);
        }

        // Zapisz ulubione w localStorage
        localStorage.setItem("favorites", JSON.stringify(updatedFavorites));

        // Zaktualizuj stan markerów
        setMarkers(updatedMarkers);
    };

    const loadFavorites = () => {
        const favorites: MarkerData[] = JSON.parse(localStorage.getItem("favorites") || "[]");

        setMarkers(
            favorites.map((fav) => ({
                ...fav,
                isFavourite: true, // Każdy załadowany marker jest ulubiony
            }))
        );
    };

    const handleSuccess = (response: CredentialResponse) => {
        console.log("Logged in successfully!", response.credential);

        const userData: UserData = {
            name: "John Doe",
            avatarUrl: "https://example.com/avatar.jpg",
        };

        setUser(userData);
        loadFavorites();
    };

    const handleError = () => {
        console.error("Login failed");
    };

    const handleLogout = () => {
        setUser(null);
    };

    if (!isLoaded) return <div>Loading...</div>;

    return (
        <div>
            <div className="map-container">
                <MapButtons onGeocode={handleGeocode} onClear={clearMarkers}/>
                <NewMap center={center} markers={markers} options={options} mapRef={(map) => (mapRef.current = map)}
                        onClickMarker={(marker) => handleMarkerClick(marker)}/>
            </div>
            <div className={"google-login-container"}>
                {!user ? (
                    <GoogleLoginButton onSuccess={handleSuccess} onError={handleError}/>
                ) : (
                    <UserInfo
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        onLogout={handleLogout}
                    />
                )}
            </div>
        </div>
    )
}

export default App
