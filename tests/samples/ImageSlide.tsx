import React from 'react';

const ImageSlide = () => {
    // A small blue square base64
    const blueSquare = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADAQH/EA9OnQAAAABJRU5ErkJggg==";

    return (
        <div style={{
            width: '1280px',
            height: '720px',
            padding: '40px',
            backgroundColor: '#f8fafc',
            fontFamily: 'Inter, sans-serif'
        }}>
            <h1 style={{ color: '#1e293b', fontSize: '40px' }}>Visual Elements</h1>

            <div style={{ display: 'flex', gap: '40px', marginTop: '40px' }}>
                <div>
                    <h3>Base64 Image</h3>
                    <img src={blueSquare} alt="Blue Square" style={{ width: '200px', height: '200px', border: '2px solid #000' }} />
                </div>

                <div>
                    <h3>Inline SVG</h3>
                    <svg width="200" height="200" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="green" strokeWidth="4" fill="yellow" />
                        <rect x="20" y="20" width="30" height="30" fill="red" opacity="0.5" />
                    </svg>
                </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#e2e8f0', borderRadius: '10px' }}>
                <p>This slide tests image and SVG extraction functionality.</p>
            </div>
        </div>
    );
};

export default ImageSlide;
