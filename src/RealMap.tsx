// src/RealMap.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";
import './App.css'; 

// IMPORT ALGORITHMS
import { dijkstra } from './algorithms/dijkstra';
import { bfs } from './algorithms/bfs';
import { dfs } from './algorithms/dfs';
import { prim } from './algorithms/prim';
import { kruskal } from './algorithms/kruskal';
import { checkBipartite } from './algorithms/bipartite';
import { fordFulkerson } from './algorithms/ford-fulkerson';
import { fleury, hierholzer } from './algorithms/euler';

// --- UTILS ---
const getLabelFromIndex = (index: number) => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (index < 26) return letters[index];
    return letters[index % 26] + (index + 1);
};

const fetchRealRoute = async (p1: any, p2: any) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes.length > 0) {
            const r = data.routes[0];
            return { 
                distance: parseFloat((r.distance / 1000).toFixed(2)), 
                geometry: r.geometry.coordinates.map((c: number[]) => [c[1], c[0]]) 
            };
        }
        return null;
    } catch { return null; }
};

// --- ICONS ---
const createLabelIcon = (label: string, color: string = '#ef4444') => {
    return L.divIcon({
        className: 'custom-pin-icon',
        html: `<div class="pin-content" style="color: ${color}"><i class="fa-solid fa-location-dot"></i><span class="pin-label">${label}</span></div>`,
        iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
    });
};
const ImgIcon = (url: string, size: [number, number]) => new L.Icon({ iconUrl: url, iconSize: size, iconAnchor: [size[0]/2, size[1]], popupAnchor: [0, -size[1]] });
const Icons = {
    ambulance: ImgIcon('https://cdn-icons-png.flaticon.com/512/2641/2641617.png', [50, 50]),
    garbageTruck: ImgIcon('https://cdn-icons-png.flaticon.com/512/2641/2641641.png', [50, 50]),
    car: ImgIcon('https://cdn-icons-png.flaticon.com/512/2555/2555013.png', [40, 40]),
    pole: ImgIcon('https://cdn-icons-png.flaticon.com/512/12423/12423924.png', [40, 40]),
};

// --- COMPONENT XE CHẠY ---
const MovingVehicle = ({ routeCoords, icon }: { routeCoords: any[], icon: any }) => {
    const [pos, setPos] = useState(routeCoords[0]);
    const idxRef = useRef(0);
    useEffect(() => {
        if (!routeCoords.length) return;
        idxRef.current = 0; setPos(routeCoords[0]);
        const interval = setInterval(() => {
            idxRef.current++;
            if (idxRef.current < routeCoords.length) setPos(routeCoords[idxRef.current]);
            else clearInterval(interval);
        }, 40);
        return () => clearInterval(interval);
    }, [routeCoords]);
    if (!pos) return null;
    return <Marker position={pos} icon={icon} zIndexOffset={9999} interactive={false} />;
};

interface RealMapProps { onBack: () => void; }
type AlgoType = 'dijkstra' | 'bfs' | 'dfs' | 'prim' | 'kruskal' | 'bipartite' | 'fordfulkerson' | 'fleury' | 'hierholzer';

const RealMap: React.FC<RealMapProps> = ({ onBack }) => {
    // DATA
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);
    
    // UI CONTROL
    const [activeTool, setActiveTool] = useState('cursor');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [startNodeId, setStartNodeId] = useState('');
    const [endNodeId, setEndNodeId] = useState('');
    const [selectedAlgo, setSelectedAlgo] = useState<AlgoType>('dijkstra');

    // VISUALS
    const [steps, setSteps] = useState<string[]>(["Sẵn sàng! Hãy thêm các điểm lên bản đồ."]); // Thay log đơn giản bằng mảng steps
    const [path, setPath] = useState<string[]>([]);
    const [highlightEdges, setHighlightEdges] = useState<any[]>([]);
    const [vehiclePath, setVehiclePath] = useState<any[]>([]);
    const [visitedNodes, setVisitedNodes] = useState<string[]>([]);
    const [nodeColors, setNodeColors] = useState<Record<string, string>>({});

    // Ref cho ô log để tự scroll xuống dưới
    const logContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [steps]);

    const isTwoPointsAlgo = ['dijkstra', 'fordfulkerson'].includes(selectedAlgo);

    // --- MAP EVENTS ---
    const MapEvents = () => {
        useMapEvents({ click(e) { if (activeTool === 'add-node') handleAddNode(e.latlng); } });
        return null;
    };

    const handleAddNode = (latlng: L.LatLng) => {
        const index = nodes.length;
        const newId = String(index + 1);
        const label = getLabelFromIndex(index);
        setNodes([...nodes, { id: newId, label: label, lat: latlng.lat, lng: latlng.lng }]);
    };

    // --- LOGIC CHỌN ĐIỂM ---
    const handleNodeClick = async (id: string) => {
        if (activeTool === 'add-edge') {
            if (selectedNodeId === null) {
                setSelectedNodeId(id);
                Toastify({ text: "Chọn điểm đến!", backgroundColor: "#3b82f6" }).showToast();
            } else {
                if (selectedNodeId === id) return;
                const n1 = nodes.find(n => n.id === selectedNodeId);
                const n2 = nodes.find(n => n.id === id);
                if (n1 && n2) {
                    addLog("⏳ Đang tìm đường thực tế từ OSRM...");
                    const data = await fetchRealRoute(n1, n2);
                    if (data) {
                        const exists = edges.some(e => (e.from===n1.id && e.to===n2.id) || (e.from===n2.id && e.to===n1.id));
                        if(!exists) {
                            setEdges([...edges, { from: n1.id, to: n2.id, weight: data.distance, label: `${data.distance} km`, geometry: data.geometry }]);
                            addLog(`✅ Đã nối đường: ${n1.label} ➔ ${n2.label} (${data.distance} km)`);
                        }
                    }
                }
                setSelectedNodeId(null);
            }
        } 
        else if (activeTool === 'delete') {
            setNodes(nodes.filter(n => n.id !== id));
            setEdges(edges.filter(e => e.from !== id && e.to !== id));
            if(startNodeId === id) setStartNodeId('');
            if(endNodeId === id) setEndNodeId('');
        }
        else {
            if (isTwoPointsAlgo) {
                if (!startNodeId) setStartNodeId(id);
                else if (!endNodeId && id !== startNodeId) setEndNodeId(id);
                else { setStartNodeId(id); setEndNodeId(''); handleResetResults(); }
            } else {
                setStartNodeId(id); setEndNodeId(''); handleResetResults();
            }
        }
    };

    const handleEdgeClick = (edgeIdx: number) => {
        if (activeTool === 'delete') {
            const newEdges = [...edges];
            newEdges.splice(edgeIdx, 1);
            setEdges(newEdges);
            Toastify({ text: "Đã xóa đường!", backgroundColor: "#64748b" }).showToast();
        }
    };

    // --- HELPER: THÊM DÒNG LOG ---
    const addLog = (msg: string) => {
        setSteps(prev => [...prev, msg]);
    };

    // --- HELPER: LẤY TÊN NODE (A, B, C) ---
    const getNodeName = (id: string) => nodes.find(n => n.id === id)?.label || id;

    const handleResetResults = () => {
        setPath([]); setHighlightEdges([]); setVehiclePath([]); setVisitedNodes([]); setNodeColors({});
        setSteps(["Đã xóa kết quả. Sẵn sàng chạy mới."]);
    };

    // --- ALGORITHM RUNNER ---
    const runAlgo = async (sId?: string, eId?: string) => {
        const start = sId || startNodeId;
        const end = eId || endNodeId;

        if (isTwoPointsAlgo && (!start || !end)) {
            Toastify({ text: "Vui lòng chọn đủ Start & End!", backgroundColor: "#ef4444" }).showToast();
            return;
        }
        if (!isTwoPointsAlgo && !start && selectedAlgo !== 'kruskal' && selectedAlgo !== 'bipartite') {
             Toastify({ text: "Vui lòng chọn Start!", backgroundColor: "#ef4444" }).showToast(); return;
        }

        handleResetResults();
        
        // Tạo log mở đầu
        const sLabel = getNodeName(start);
        const eLabel = getNodeName(end);
        setSteps([`🚀 BẮT ĐẦU CHẠY: ${selectedAlgo.toUpperCase()}`]);
        if (start) addLog(`📍 Điểm bắt đầu: ${sLabel}`);
        if (end) addLog(`🏁 Điểm kết thúc: ${eLabel}`);

        // Build Graph
        const adjList: any = {};
        nodes.forEach(n => adjList[n.id] = []);
        edges.forEach(e => {
            adjList[e.from].push([e.to, e.weight]);
            if (selectedAlgo !== 'fordfulkerson') adjList[e.to].push([e.from, e.weight]);
            else adjList[e.to].push([e.from, e.weight]); 
        });

        // --- EXECUTE & GENERATE DETAILED LOGS ---
        
        if (selectedAlgo === 'dijkstra') {
            const res = dijkstra(adjList, start, end);
            if (res.path?.length) {
                setPath(res.path);
                reconstructGeometryPath(res.path);
                
                // LOG CHI TIẾT DIJKSTRA
                addLog("--- CHI TIẾT ĐƯỜNG ĐI ---");
                let currentDist = 0;
                for(let i=0; i<res.path.length-1; i++) {
                    const u = res.path[i];
                    const v = res.path[i+1];
                    const edge = edges.find(e => (e.from===u && e.to===v) || (e.from===v && e.to===u));
                    const dist = edge?.weight || 0;
                    currentDist += dist;
                    addLog(`⬇️ Từ ${getNodeName(u)} đến ${getNodeName(v)}: ${dist} km (Tổng: ${currentDist.toFixed(2)} km)`);
                }
                addLog(`✅ ĐÃ ĐẾN ĐÍCH! Tổng quãng đường: ${res.cost} km`);
            } else addLog("❌ Không tìm thấy đường đi giữa 2 điểm này!");
        }
        
        else if (selectedAlgo === 'prim') {
            const res = prim(adjList);
            setHighlightEdges(res.mstEdges);
            
            // LOG CHI TIẾT PRIM
            addLog("--- QUÁ TRÌNH NỐI CÁP ---");
            res.mstEdges.forEach((e: any, idx: number) => {
                addLog(`⚡ Bước ${idx+1}: Nối ${getNodeName(e.from)} <-> ${getNodeName(e.to)} (Dây: ${e.weight} km)`);
            });
            addLog(`✅ HOÀN THÀNH LƯỚI ĐIỆN! Tổng dây cáp: ${res.cost} km`);
        }

        else if (selectedAlgo === 'kruskal') {
            const res = kruskal(nodes.map(n=>n.id), edges.map(e=>({from:e.from, to:e.to, weight:e.weight})));
            setHighlightEdges(res.mstEdges);
            
            // LOG CHI TIẾT KRUSKAL
            addLog("--- QUÁ TRÌNH GỘP CỤM ---");
            res.mstEdges.forEach((e: any, idx: number) => {
                addLog(`🔗 Bước ${idx+1}: Chọn cạnh rẻ nhất ${getNodeName(e.from)}-${getNodeName(e.to)} (${e.weight} km)`);
            });
            addLog(`✅ HOÀN THÀNH TOÀN CỤC! Tổng chi phí: ${res.cost}`);
        }

        else if (selectedAlgo === 'bfs' || selectedAlgo === 'dfs') {
            const res = selectedAlgo === 'bfs' ? bfs(adjList, start) : dfs(adjList, start);
            
            // LOG DUYỆT
            addLog(`--- THỨ TỰ DUYỆT (${res.visitedOrder.length} ĐIỂM) ---`);
            const orderNames = res.visitedOrder.map((id:string) => getNodeName(id)).join(" ➔ ");
            addLog(orderNames);

            // Animation & Log từng bước
            for(let i=0; i<res.visitedOrder.length; i++) {
                const id = res.visitedOrder[i];
                setVisitedNodes(prev => [...prev, id]);
                if (i > 0) addLog(`🔍 Đã lan truyền đến: ${getNodeName(id)}`);
                await new Promise(r => setTimeout(r, 300));
            }
            addLog("✅ Kết thúc quá trình duyệt!");
        }

        else if (selectedAlgo === 'fordfulkerson') {
            const res = fordFulkerson(adjList, start, end);
            const flowEdges: any[] = [];
            
            addLog("--- CHI TIẾT DÒNG CHẢY ---");
            res.flowEdges.forEach((fe:any) => { 
                if(fe.flow>0) {
                    flowEdges.push({from:fe.from, to:fe.to, label:`${fe.flow}/${fe.capacity}`});
                    addLog(`🌊 Ống ${getNodeName(fe.from)} -> ${getNodeName(fe.to)}: Đang chảy ${fe.flow} (Max ${fe.capacity})`);
                }
            });
            setHighlightEdges(flowEdges);
            addLog(`✅ TỔNG LƯU LƯỢNG TỐI ĐA: ${res.maxFlow}`);
            
            // Demo xe chạy
            if(res.maxFlow > 0) {
                 const simpleRes = dijkstra(adjList, start, end);
                 if(simpleRes.path) reconstructGeometryPath(simpleRes.path);
            }
        }

        else if (selectedAlgo.includes('euler')) {
             const res = selectedAlgo === 'fleury' ? fleury(adjList, false) : hierholzer(adjList, false);
             if (res.path) {
                 setPath(res.path);
                 reconstructGeometryPath(res.path);
                 
                 addLog("--- LỘ TRÌNH XE RÁC ---");
                 addLog(`🚛 Lộ trình: ${res.path.map((id:string) => getNodeName(id)).join(" -> ")}`);
                 addLog("✅ Đã quét sạch tất cả các con đường!");
             } else addLog("⚠️ Thất bại: Đồ thị không thỏa mãn điều kiện Euler (Bậc lẻ)!");
        }

        else if (selectedAlgo === 'bipartite') {
             const res = checkBipartite(adjList);
             if (res.isBipartite) {
                 const colors: any = {};
                 res.setA.forEach((id:string) => colors[id] = 'red');
                 res.setB.forEach((id:string) => colors[id] = 'blue');
                 setNodeColors(colors);
                 addLog("✅ Đồ thị 2 phía: TÁCH ĐƯỢC!");
                 addLog(`🔴 Phe Đỏ: ${res.setA.map((id:string) => getNodeName(id)).join(", ")}`);
                 addLog(`🔵 Phe Xanh: ${res.setB.map((id:string) => getNodeName(id)).join(", ")}`);
             } else {
                 if(res.conflictNode) setNodeColors({ [res.conflictNode]: 'violet' });
                 addLog(`❌ KHÔNG TÁCH ĐƯỢC! Xung đột tại điểm ${getNodeName(res.conflictNode)}`);
             }
        }
    };

    const reconstructGeometryPath = (nodePath: string[]) => {
        let fullCoords: any[] = [];
        for (let i = 0; i < nodePath.length - 1; i++) {
            const u = nodePath[i], v = nodePath[i+1];
            const edge = edges.find(e => (e.from===u && e.to===v) || (e.from===v && e.to===u));
            if (edge && edge.geometry) {
                let seg = [...edge.geometry];
                const nU = nodes.find(n=>n.id===u);
                if (Math.pow(seg[0][0]-nU.lat,2) + Math.pow(seg[0][1]-nU.lng,2) > Math.pow(seg[seg.length-1][0]-nU.lat,2) + Math.pow(seg[seg.length-1][1]-nU.lng,2)) seg.reverse();
                fullCoords = [...fullCoords, ...seg];
            } else {
                const n1=nodes.find(n=>n.id===u), n2=nodes.find(n=>n.id===v);
                if(n1&&n2) fullCoords.push([n1.lat, n1.lng], [n2.lat, n2.lng]);
            }
        }
        setVehiclePath(fullCoords);
    };

    const getStartLabel = () => nodes.find(n => n.id === startNodeId)?.label || '';
    const getEndLabel = () => nodes.find(n => n.id === endNodeId)?.label || '';

    // --- RENDER ---
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            {/* SIDEBAR */}
            <div style={{ width: 340, background: 'white', padding: 20, zIndex: 1000, boxShadow: '2px 0 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <button onClick={onBack} style={{ marginBottom: 15, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: '#64748b' }}>
                    <i className="fa-solid fa-arrow-left"></i> Quay lại
                </button>
                <h2 style={{color: '#2563eb', margin: '0 0 15px 0'}}>🗺️ Ứng Dụng Thực Tế</h2>
                
                <div style={{marginBottom: 10}}>
                    <label className="input-label">Chọn Nhiệm vụ:</label>
                    <select value={selectedAlgo} onChange={(e) => { setSelectedAlgo(e.target.value as AlgoType); setStartNodeId(''); setEndNodeId(''); handleResetResults(); }} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer'}}>
                        <optgroup label="Tìm đường">
                            <option value="dijkstra">🚑 Cấp cứu 115 (Dijkstra)</option>
                            <option value="fordfulkerson">🌊 Phân luồng (Max Flow)</option>
                        </optgroup>
                        <optgroup label="Lan truyền">
                            <option value="bfs">📡 Lan truyền sóng (BFS)</option>
                            <option value="dfs">🕵️ Truy vết (DFS)</option>
                            <option value="prim">⚡ Lưới điện (Prim)</option>
                            <option value="fleury">🚛 Xe rác (Fleury)</option>
                            <option value="hierholzer">🚛 Xe rác (Hierholzer)</option>
                        </optgroup>
                        <optgroup label="Toàn cục">
                            <option value="kruskal">⚡ Lưới điện (Kruskal)</option>
                            <option value="bipartite">⚔️ Phân chia (Bipartite)</option>
                        </optgroup>
                    </select>
                </div>

                <div style={{background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px'}}>
                    <div className="input-group">
                        <label className="input-label">Start</label>
                        <div className="input-box-wrapper" style={{borderColor: startNodeId ? '#10b981' : '#cbd5e1'}}>
                            <span className="input-box-icon" style={{color: '#10b981'}}><i className="fa-solid fa-location-dot"></i></span>
                            <input type="text" className="input-control" value={getStartLabel()} placeholder="Chọn trên bản đồ..." readOnly />
                        </div>
                    </div>
                    {isTwoPointsAlgo && (
                        <div className="input-group">
                            <label className="input-label">End</label>
                            <div className="input-box-wrapper" style={{borderColor: endNodeId ? '#ef4444' : '#cbd5e1'}}>
                                <span className="input-box-icon" style={{color: '#ef4444'}}><i className="fa-solid fa-flag-checkered"></i></span>
                                <input type="text" className="input-control" value={getEndLabel()} placeholder="Chọn trên bản đồ..." readOnly />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
                   <button onClick={() => setActiveTool('add-node')} style={btnStyle(activeTool==='add-node')}>➕ Thêm Điểm</button>
                   <button onClick={() => setActiveTool('add-edge')} style={btnStyle(activeTool==='add-edge')}>🔗 Nối Đường</button>
                   <button onClick={() => setActiveTool('cursor')} style={btnStyle(activeTool==='cursor')}>👆 Chọn</button>
                   <button onClick={() => setActiveTool('delete')} style={btnStyle(activeTool==='delete', true)}>❌ Xóa</button>
                </div>

                <button onClick={() => runAlgo()} className="btn-run-big" disabled={isTwoPointsAlgo && (!startNodeId || !endNodeId)}>
                    <i className="fa-solid fa-play"></i> CHẠY MÔ PHỎNG
                </button>
                <button onClick={handleResetResults} className="btn-stop">DỪNG & XÓA KẾT QUẢ</button>
                
                {/* KHUNG LOG MỚI (Step-by-step) */}
                <div ref={logContainerRef} className="log-container">
                    {steps.map((step, idx) => (
                        <div key={idx} className="log-step">
                            {idx === 0 && <span className="log-icon">💻</span>}
                            {step.startsWith('⬇️') && <span className="log-icon">👇</span>}
                            {step.startsWith('✅') && <span className="log-icon">🎉</span>}
                            {step.startsWith('❌') && <span className="log-icon">⛔</span>}
                            {step}
                        </div>
                    ))}
                </div>
            </div>

            {/* MAP */}
            <div style={{ flex: 1 }}>
                <MapContainer center={[10.7769, 106.6953]} zoom={16} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapEvents />

                    {/* LAYERS */}
                    {edges.map((edge, idx) => (
                         <Polyline key={`base-${idx}`} positions={edge.geometry || []} pathOptions={{ color: '#3388ff', weight: 4, opacity: 0.3 }} eventHandlers={{ click: () => handleEdgeClick(idx) }} />
                    ))}
                    {edges.map((edge, idx) => {
                        let isPath = false;
                        if (path.length > 0) {
                             for(let i=0; i<path.length-1; i++) if ((path[i]===edge.from && path[i+1]===edge.to) || (path[i]===edge.to && path[i+1]===edge.from)) { isPath = true; break; }
                        }
                        if (!isPath) return null;
                        return <Polyline key={`path-${idx}`} positions={edge.geometry || []} pathOptions={{ color: '#ef4444', weight: 8, opacity: 1, className: 'path-line' }} interactive={false} />;
                    })}
                    {edges.map((edge, idx) => {
                        const mstHit = highlightEdges.find(e => (e.from===edge.from && e.to===edge.to) || (e.from===edge.to && e.to===edge.from));
                        const isNeon = mstHit && (selectedAlgo === 'prim' || selectedAlgo === 'kruskal' || selectedAlgo === 'fordfulkerson');
                        if (!isNeon) return null;
                        const color = selectedAlgo === 'fordfulkerson' ? '#06b6d4' : '#fbbf24';
                        return <Polyline key={`neon-${idx}`} positions={edge.geometry || []} pathOptions={{ color: color, weight: 8, className: selectedAlgo === 'fordfulkerson' ? '' : 'neon-line', opacity: 1 }} interactive={false} />;
                    })}
                    {vehiclePath.length > 0 && <MovingVehicle routeCoords={vehiclePath} icon={selectedAlgo === 'dijkstra' ? Icons.ambulance : (selectedAlgo.includes('euler') ? Icons.garbageTruck : Icons.car)} />}
                    {nodes.map(n => {
                        let color = '#ef4444';
                        if (n.id === startNodeId) color = '#10b981'; else if (n.id === endNodeId) color = '#ef4444'; else color = '#3b82f6';
                        if (selectedAlgo === 'bipartite') { if (nodeColors[n.id] === 'red') color = '#ef4444'; else if (nodeColors[n.id] === 'blue') color = '#3b82f6'; else if (nodeColors[n.id] === 'violet') color = '#8b5cf6'; }
                        if (visitedNodes.includes(n.id)) color = '#eab308';
                        let icon = createLabelIcon(n.label, color);
                        if (selectedAlgo === 'prim' || selectedAlgo === 'kruskal') icon = Icons.pole;
                        return <Marker key={n.id} position={[n.lat, n.lng]} icon={icon} eventHandlers={{ click: () => handleNodeClick(n.id) }}><Popup>{n.label}</Popup></Marker>;
                    })}
                </MapContainer>
            </div>
        </div>
    );
};

const btnStyle = (active: boolean, isDelete: boolean = false) => ({ 
    padding: 8, borderRadius: 6, 
    border: `1px solid ${isDelete ? '#fca5a5' : '#cbd5e1'}`, 
    background: active ? (isDelete ? '#fef2f2' : '#eff6ff') : 'white', 
    color: isDelete ? '#dc2626' : (active ? '#2563eb' : 'black'),
    cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
});

export default RealMap;