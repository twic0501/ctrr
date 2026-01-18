// src/Main.tsx
import React, { useState } from 'react';
import App from './App'; // Import App cũ
import RealMap from './RealMap'; // Import App thực tế

const Push: React.FC = () => {
    // State để quản lý đang xem màn hình nào
    // 'menu': Màn hình chọn
    // 'app': Màn hình đồ thị (cũ)
    // 'real': Màn hình thực tế
    const [view, setView] = useState<'menu' | 'app' | 'real'>('menu');

    // Nếu đang chọn view App thì hiển thị App.tsx
    if (view === 'app') {
        return (
            <div>
                {/* Nút nhỏ để quay về menu */}
                <button 
                    onClick={() => setView('menu')}
                    style={{position: 'fixed', top: 10, left: 10, zIndex: 9999, padding: '5px 10px', background: 'black', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: 0.5}}
                    title="Quay về Menu"
                >
                    <i className="fa-solid fa-house"></i>
                </button>
                <App />
            </div>
        );
    }

    // Nếu đang chọn view Real thì hiển thị Real.tsx
    if (view === 'real') {
        return <RealMap onBack={() => setView('menu')} />;
    }

    // Mặc định: Hiển thị Menu
    return (
        <div style={{
            height: '100vh', width: '100vw', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            <h1 style={{fontSize: '3rem', color: '#1e293b', marginBottom: 10, textShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                <i className="fa-solid fa-share-nodes" style={{color: '#4f46e5'}}></i> Đồ Án Giải Thuật
            </h1>
            <p style={{fontSize: '1.2rem', color: '#64748b', marginBottom: 50}}>Mô phỏng thuật toán đồ thị & Ứng dụng thực tế</p>

            <div style={{display: 'flex', gap: 40}}>
                {/* Thẻ chọn App Cũ */}
                <div 
                    onClick={() => setView('app')}
                    style={{
                        width: 300, padding: 40, background: 'white', borderRadius: 20, cursor: 'pointer',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s',
                        textAlign: 'center', border: '2px solid transparent'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                    <div style={{fontSize: '4rem', color: '#3b82f6', marginBottom: 20}}><i className="fa-solid fa-graduation-cap"></i></div>
                    <h2 style={{color: '#1e293b', marginBottom: 10}}>Học Tập</h2>
                    <p style={{color: '#64748b'}}>Vẽ đồ thị tự do, thử nghiệm các thuật toán cơ bản (Dijkstra, BFS, DFS...).</p>
                </div>

                {/* Thẻ chọn App Mới */}
                <div 
                    onClick={() => setView('real')}
                    style={{
                        width: 300, padding: 40, background: 'white', borderRadius: 20, cursor: 'pointer',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s',
                        textAlign: 'center', border: '2px solid transparent'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                    <div style={{fontSize: '4rem', color: '#8b5cf6', marginBottom: 20}}><i className="fa-solid fa-city"></i></div>
                    <h2 style={{color: '#1e293b', marginBottom: 10}}>Ứng Dụng</h2>
                    <p style={{color: '#64748b'}}>Hệ thống Smart City. Mô phỏng cứu hỏa, cấp nước, quy hoạch trên bản đồ thực.</p>
                </div>
            </div>

            <div style={{marginTop: 60, color: '#94a3b8', fontSize: '0.9rem'}}>Thực hiện bởi: Nhóm TMT-0501</div>
        </div>
    );
};

export default Push;