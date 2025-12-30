import React from 'react';

interface QueueWaitProps {
    queueNumber: number;
    servingNumber: number;
    onNext: () => void;
}

export default function QueueWait({ queueNumber, servingNumber, onNext }: QueueWaitProps) {
    return (
        <div className="chaos-box">
            <h2 className="chaos-title">QUEUE WAIT</h2>
            <p style={{ textAlign: 'center', margin: '1rem 0' }}>
                [Stub] Queue Wait step
            </p>
            <p style={{ textAlign: 'center' }}>
                Your number: {queueNumber} | Now serving: {servingNumber}
            </p>
            <div style={{ textAlign: 'center' }}>
                <button className="chaos-button" onClick={onNext}>
                    Next
                </button>
            </div>
        </div>
    );
}
