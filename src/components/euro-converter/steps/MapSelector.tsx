import React from 'react';

interface MapSelectorProps {
    country: 'bulgaria' | 'germany';
    onNext: () => void;
}

export default function MapSelector({ country, onNext }: MapSelectorProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">MAP: {country.toUpperCase()}</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Map Selector step - {country}
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Next
                </button>
            </div>
        </div>
    );
}
