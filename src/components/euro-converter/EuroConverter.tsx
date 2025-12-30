import React from 'react';

/**
 * EuroConverter - The Worst Currency Converter Ever Made
 *
 * This is a placeholder component that will be replaced in Phase 2
 * with the full frustratingly terrible UX implementation.
 */
export default function EuroConverter() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                EURBGN Converter
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
                The worst currency converter ever made
            </p>
            <p style={{ marginTop: '2rem', fontStyle: 'italic' }}>
                Coming soon... prepare yourself for frustration.
            </p>
        </div>
    );
}
