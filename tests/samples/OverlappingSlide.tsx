import React from 'react';

const OverlappingSlide = () => {
    return (
        <div style={{
            width: '1280px',
            height: '720px',
            position: 'relative',
            backgroundColor: '#111827',
            color: 'white',
            fontFamily: 'system-ui'
        }}>
            <div style={{
                position: 'absolute',
                top: '100px',
                left: '100px',
                width: '400px',
                height: '400px',
                backgroundColor: '#ef4444',
                zIndex: 1,
                padding: '20px'
            }}>
                <h2>Layer 1 (Z=1)</h2>
                <p>This red box is at the bottom.</p>
            </div>

            <div style={{
                position: 'absolute',
                top: '200px',
                left: '200px',
                width: '400px',
                height: '400px',
                backgroundColor: '#3b82f6',
                zIndex: 10,
                padding: '20px',
                opacity: 0.9
            }}>
                <h2>Layer 2 (Z=10)</h2>
                <p>This blue box overlaps the red one. It has 90% opacity.</p>
            </div>

            <div style={{
                position: 'absolute',
                top: '300px',
                left: '300px',
                width: '400px',
                height: '400px',
                backgroundColor: '#10b981',
                zIndex: 5,
                padding: '20px'
            }}>
                <h2>Layer 3 (Z=5)</h2>
                <p>This green box should be BETWEEN red and blue visually despite being declared last.</p>
            </div>

            <h1 style={{ position: 'absolute', bottom: '50px', right: '50px' }}>Z-Index Test</h1>
        </div>
    );
};

export default OverlappingSlide;
