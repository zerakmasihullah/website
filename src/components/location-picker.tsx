"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import { Icon } from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPin, Navigation } from "lucide-react"

interface LocationPickerProps {
  latitude: string
  longitude: string
  onLocationChange: (lat: string, lng: string) => void
  height?: string
}

// Custom marker icon - larger and more visible
const createCustomIcon = () => {
  return new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#f97316" stroke="#fff" stroke-width="2.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="4" fill="#fff"></circle>
      </svg>
    `),
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  })
}

// Component to handle map clicks
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: string, lng: string) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      onLocationChange(lat.toFixed(6), lng.toFixed(6))
    },
  })
  return null
}

// Component to update map center when coordinates change
function MapCenterUpdater({ lat, lng, isDragging }: { lat: number; lng: number; isDragging: boolean }) {
  const map = useMap()
  
  useEffect(() => {
    if (!isDragging && lat && lng && lat !== 0 && lng !== 0) {
      map.setView([lat, lng], 16) // Higher zoom for better visibility
    }
  }, [lat, lng, map, isDragging])
  
  return null
}

export default function LocationPicker({ latitude, longitude, onLocationChange, height = '400px' }: LocationPickerProps) {
  const [mapKey, setMapKey] = useState(0)
  const [currentLat, setCurrentLat] = useState(latitude)
  const [currentLng, setCurrentLng] = useState(longitude)
  const [isDragging, setIsDragging] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Update local state when props change
  useEffect(() => {
    if (!isDragging) {
      if (latitude && longitude && latitude !== "0" && longitude !== "0") {
        setCurrentLat(latitude)
        setCurrentLng(longitude)
      } else if (!latitude || !longitude || latitude === "0" || longitude === "0") {
        setCurrentLat("")
        setCurrentLng("")
      }
    }
  }, [latitude, longitude, isDragging])

  const defaultLat = currentLat ? parseFloat(currentLat) : 52.6680
  const defaultLng = currentLng ? parseFloat(currentLng) : -8.6264

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser")
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        setCurrentLat(lat)
        setCurrentLng(lng)
        onLocationChange(lat, lng)
        setIsGettingLocation(false)
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions.")
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable.")
            break
          case error.TIMEOUT:
            setLocationError("Location request timed out.")
            break
          default:
            setLocationError("An unknown error occurred.")
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const isCompact = height && parseInt(height) < 200

  return (
    <div className="flex flex-col h-full">
      {/* Simple header */}
      <div className={`flex items-center justify-between ${isCompact ? 'mb-1.5' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
        <MapPin className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-orange-500`} />
          <span className={`text-foreground font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>Select your location</span>
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className={`flex items-center gap-1.5 ${isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'} bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-orange-600`}
        >
          <Navigation className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isGettingLocation ? 'animate-spin' : ''}`} />
          {isGettingLocation ? 'Getting...' : isCompact ? 'Current' : 'Use Current Location'}
        </button>
      </div>

      {/* Error message */}
      {locationError && (
        <div className={`${isCompact ? 'mb-1.5 p-2 text-xs' : 'mb-3 p-3 text-xs'} bg-red-500/10 dark:bg-red-500/20 border border-red-500/50 rounded-lg text-red-600 dark:text-red-300`}>
          {locationError}
        </div>
      )}

      {/* Map container - larger and more visible */}
      <div className={`relative rounded-lg overflow-hidden ${isCompact ? 'border border-orange-500/30' : 'border-2 border-orange-500/30'} bg-card shadow-xl`} style={{ height: height, minHeight: height }}>
        <MapContainer
          key={mapKey}
          center={[defaultLat, defaultLng]}
          zoom={currentLat && currentLng && currentLat !== "0" && currentLng !== "0" ? 16 : 13}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="rounded-lg"
          zoomControl={true}
        >
          {/* Use a brighter tile layer for better visibility */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapClickHandler onLocationChange={(lat, lng) => {
            setCurrentLat(lat)
            setCurrentLng(lng)
            onLocationChange(lat, lng)
          }} />
          <MapCenterUpdater lat={defaultLat} lng={defaultLng} isDragging={isDragging} />
          {currentLat && currentLng && currentLat !== "0" && currentLng !== "0" && (
            <Marker
              position={[parseFloat(currentLat), parseFloat(currentLng)]}
              icon={createCustomIcon()}
              draggable={true}
              eventHandlers={{
                dragstart: () => {
                  setIsDragging(true)
                },
                drag: (e) => {
                  const marker = e.target
                  const position = marker.getLatLng()
                  setCurrentLat(position.lat.toFixed(6))
                  setCurrentLng(position.lng.toFixed(6))
                },
                dragend: (e) => {
                  const marker = e.target
                  const position = marker.getLatLng()
                  const newLat = position.lat.toFixed(6)
                  const newLng = position.lng.toFixed(6)
                  setCurrentLat(newLat)
                  setCurrentLng(newLng)
                  setIsDragging(false)
                  onLocationChange(newLat, newLng)
                }
              }}
            />
          )}
        </MapContainer>
        
        {/* Simple instruction text */}
        {(!currentLat || !currentLng || currentLat === "0" || currentLng === "0") && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/90 dark:bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 text-foreground text-sm z-[1000] pointer-events-none border border-border shadow-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>Click on the map to set your location</span>
            </div>
          </div>
        )}
      </div>

      {/* Location confirmation */}
      {currentLat && currentLng && currentLat !== "0" && currentLng !== "0" && !isCompact && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
          <MapPin className="w-5 h-5 flex-shrink-0 text-green-500" />
          <span className="flex-1">Location selected: {parseFloat(currentLat).toFixed(4)}, {parseFloat(currentLng).toFixed(4)}</span>
        </div>
      )}
    </div>
  )
}

