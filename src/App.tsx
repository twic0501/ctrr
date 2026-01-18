// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";
import './App.css'; 

// --- IMPORT CÁC THUẬT TOÁN ---
import { dijkstra } from './algorithms/dijkstra'; 
import { bfs } from './algorithms/bfs';
import { dfs } from './algorithms/dfs';
import { checkBipartite } from './algorithms/bipartite';
import { prim } from './algorithms/prim';       
import { kruskal } from './algorithms/kruskal'; 
import { getRepresentations } from './utils/graph-converter'; 
import { fordFulkerson } from './algorithms/ford-fulkerson';
import { fleury, hierholzer } from './algorithms/euler';

// --- TYPES ---
type ToolMode = 'cursor' | 'add-node' | 'add-edge' | 'delete' | 'edit';
type AlgoType = 'dijkstra' | 'bfs' | 'dfs' | 'bipartite' | 'prim' | 'kruskal' | 'fordfulkerson' | 'fleury' | 'hierholzer';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const bottomLogRef = useRef<HTMLDivElement>(null); 
  
  // --- DỮ LIỆU KHỞI TẠO ---
  const nodesRef = useRef<any>(new DataSet<any>([
    { id: '1', label: '1', x: -100, y: 0 }, { id: '2', label: '2', x: 0, y: -80 }, 
    { id: '3', label: '3', x: 100, y: 0 }, { id: '4', label: '4', x: 0, y: 80 }
  ]));
  const edgesRef = useRef<any>(new DataSet<any>([
    { from: '1', to: '2', label: '4', weight: 4 }, { from: '2', to: '3', label: '5', weight: 5 },
    { from: '3', to: '4', label: '2', weight: 2 }, { from: '4', to: '1', label: '8', weight: 8 },
    { from: '2', to: '4', label: '1', weight: 1 }
  ]));

  const activeToolRef = useRef<ToolMode>('cursor'); 

  // --- STATES ---
  const [activeTool, setActiveTool] = useState<ToolMode>('cursor');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoType>('dijkstra');
  const [isDirected, setIsDirected] = useState(false);
  
  const [startNode, setStartNode] = useState('1');
  const [endNode, setEndNode] = useState('3');
  const [resultLog, setResultLog] = useState<React.ReactNode>(<div style={{opacity: 0.6}}>... Ready ...</div>);
  const [isRunning, setIsRunning] = useState(false);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [representations, setRepresentations] = useState({ matrixStr: "", adjListStr: "", edgeListStr: "" });
  const [inputWeight, setInputWeight] = useState(1);
  const inputWeightRef = useRef<HTMLInputElement>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

  // Sync ref & Auto scroll log
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { if (bottomLogRef.current) bottomLogRef.current.scrollTop = bottomLogRef.current.scrollHeight; }, [resultLog]);

  // --- LOGIC: CHUYỂN ĐỔI CHẾ ĐỘ (Mode Switch) ---
  const handleSwitchMode = (targetModeDirected: boolean) => {
      if (isDirected === targetModeDirected) return;
      // QUAN TRỌNG: Xóa hết cạnh khi đổi chế độ để tránh lỗi logic đồ thị
      edgesRef.current.clear(); 
      Toastify({ 
          text: `Đã chuyển sang ${targetModeDirected ? "Có hướng" : "Vô hướng"} (Reset cạnh)`, 
          backgroundColor: "#4f46e5", 
          gravity: "bottom" 
      }).showToast();
      setIsDirected(targetModeDirected);
  };

  // --- INIT VIS-NETWORK ---
  useEffect(() => {
    if (!containerRef.current) return;
    const options = {
      nodes: {
        shape: "circle", size: 26, borderWidth: 2,
        color: { background: "#ffffff", border: "#4f46e5", highlight: { background: "#e0e7ff", border: "#4338ca" } },
        font: { size: 16, color: "#4f46e5", bold: true, align: 'center', face: 'Inter, sans-serif' },
        shadow: { enabled: true, color: "rgba(0,0,0,0.1)", size: 4, x: 1, y: 1 },
      },
      edges: {
        width: 2, color: { color: "#94a3b8", highlight: "#4f46e5" }, 
        font: { align: "top", size: 15, color: "#4f46e5", strokeWidth: 3, strokeColor: "#ffffff", background: 'none' },
        arrows: { to: { enabled: isDirected, scaleFactor: 1.1 } },
        smooth: { enabled: true, type: isDirected ? 'curvedCW' : 'continuous', roundness: 0.1 }
      },
      physics: false, 
      interaction: { hover: true, dragNodes: true, selectConnectedEdges: false },
      manipulation: {
        enabled: false,
        addNode: (data: any, callback: any) => {
          const allIds = nodesRef.current.getIds().map((id: any) => parseInt(id));
          const newId = String((allIds.length > 0 ? Math.max(...allIds) : 0) + 1);
          data.id = newId; data.label = newId; callback(data);
          setTimeout(() => { if (activeToolRef.current === 'add-node') networkRef.current?.addNodeMode(); }, 10);
        },
        addEdge: (data: any, callback: any) => {
          if (data.from === data.to) { callback(null); return; }
          const exists = edgesRef.current.get().some((e:any) => {
              if (isDirected) return e.from === data.from && e.to === data.to;
              return (e.from === data.from && e.to === data.to) || (e.from === data.to && e.from === data.from);
          });
          if(exists) { Toastify({ text: "Đã có cạnh!", backgroundColor: "#ef4444" }).showToast(); callback(null); } 
          else { data.weight = 0; data.label = ""; callback(data); } 
          setTimeout(() => { if (activeToolRef.current === 'add-edge') networkRef.current?.addEdgeMode(); }, 10);
        }
      }
    };
    const net = new Network(containerRef.current, { nodes: nodesRef.current, edges: edgesRef.current } as any, options);
    networkRef.current = net;
    
    // Sự kiện Click
    net.on("click", (params) => {
        if (activeToolRef.current === 'delete') {
            if (params.nodes.length > 0) {
                nodesRef.current.remove(params.nodes[0]);
                edgesRef.current.remove(net.getConnectedEdges(params.nodes[0]));
            } else if (params.edges.length > 0) edgesRef.current.remove(params.edges[0]);
        } else if (activeToolRef.current === 'edit' && params.edges.length > 0) {
            const edgeId = params.edges[0];
            const edge = edgesRef.current.get(edgeId);
            if (edge) { setEditingEdgeId(edgeId); setInputWeight(edge.weight || 0); setModalOpen(true); }
        }
    });
    net.on("resize", () => net.fit());
    return () => net.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cập nhật option khi đổi mode
  useEffect(() => {
      if (networkRef.current) {
          networkRef.current.setOptions({ edges: { arrows: { to: { enabled: isDirected } }, smooth: { enabled: true, type: isDirected ? 'curvedCW' : 'continuous' } } });
      }
  }, [isDirected]);

  // Cập nhật con trỏ chuột theo Tool
  useEffect(() => {
    const net = networkRef.current; if (!net) return;
    net.disableEditMode(); containerRef.current!.style.cursor = 'default';
    if (activeTool === 'add-node') net.addNodeMode();
    else if (activeTool === 'add-edge') net.addEdgeMode();
    else if (activeTool === 'delete') containerRef.current!.style.cursor = 'not-allowed';
    else if (activeTool === 'edit') containerRef.current!.style.cursor = 'pointer';
  }, [activeTool]);

  useEffect(() => { if (modalOpen) setTimeout(() => inputWeightRef.current?.focus(), 50); }, [modalOpen]);

  // --- HANDLERS ---
  const handleSaveWeight = () => {
    if (editingEdgeId) {
        const w = Number(inputWeight);
        edgesRef.current.update({ id: editingEdgeId, label: w === 0 ? "" : String(w), weight: w });
        setEditingEdgeId(null); setModalOpen(false);
    }
  };
  const handleNoWeight = () => {
    if (editingEdgeId) { edgesRef.current.update({ id: editingEdgeId, label: "", weight: 0 }); setEditingEdgeId(null); setModalOpen(false); }
  };
  const handleClear = () => { if (window.confirm("Xóa toàn bộ đồ thị?")) { nodesRef.current.clear(); edgesRef.current.clear(); setResultLog("Graph Cleared"); } };
  const handleShowRep = () => { setRepresentations(getRepresentations(nodesRef.current.get(), edgesRef.current.get(), isDirected)); setRepModalOpen(true); };

  // ===========================================
  // MASTER FUNCTION: HANDLE RUN (CORE LOGIC)
  // ===========================================
  const handleRun = async () => {
    if (isRunning) return; setActiveTool('cursor');
    
    // 1. RESET GRAPH STYLES
    nodesRef.current.update(nodesRef.current.get().map((n:any) => ({ 
        id: n.id, color: { background: "#ffffff", border: "#4f46e5" }, 
        shadow: { enabled: true, color: "rgba(0,0,0,0.1)", size: 4 } 
    })));
    edgesRef.current.update(edgesRef.current.get().map((e:any) => ({ 
        id: e.id, color: { color: "#94a3b8" }, width: 2, 
        font: { color: "#4f46e5", strokeWidth: 3, strokeColor: 'white' }, 
        label: e.weight ? String(e.weight) : "" 
    })));

    const allNodes = nodesRef.current.get();
    const allEdges = edgesRef.current.get();
    if (allNodes.length === 0) { Toastify({ text: "Đồ thị trống!", backgroundColor: "#ef4444" }).showToast(); return; }

    // 2. CHECK TRỌNG SỐ CHO DIJKSTRA
    if (selectedAlgo === 'dijkstra') {
        const invalid = allEdges.filter((e: any) => !e.weight || Number(e.weight) <= 0);
        if (invalid.length > 0) {
            Toastify({ text: "⚠️ Dijkstra cần trọng số dương!", backgroundColor: "#f59e0b" }).showToast();
            invalid.forEach((e:any) => edgesRef.current.update({ id: e.id, color: { color: "#ef4444" }, width: 3 }));
            return;
        }
    }

    // 3. BUILD DATA STRUCTURE
    const adjList: any = {};
    allNodes.forEach((n: any) => adjList[String(n.id)] = []);
    const edgesArr: any[] = []; 

    allEdges.forEach((e: any) => {
      const u = String(e.from), v = String(e.to), w = Number(e.weight || 0);
      // AdjList cho thuật toán tìm đường
      if(adjList[u]) adjList[u].push([v, w]);
      // Nếu vô hướng thì thêm chiều ngược lại vào AdjList logic
      if(!isDirected && adjList[v]) adjList[v].push([u, w]);
      // Edge List cho Kruskal
      edgesArr.push({ from: u, to: v, weight: w, id: e.id });
    });

    setIsRunning(true);
    const sNode = String(startNode).trim(); const eNode = String(endNode).trim();

    // --- STYLE CONFIG ---
    // Style cho việc QUÉT (Scanning/Traversal) - Xanh Dương
    const scanStyle = { 
        node: { background: "#bfdbfe", border: "#3b82f6" }, 
        edge: { color: "#3b82f6", width: 4 }               
    };
    // Style cho KẾT QUẢ ĐƯỜNG ĐI (Path) - Vàng Cam
    const pathStyle = { 
        node: { background: "#facc15", border: "#eab308", shadow: { enabled: true, color: "rgba(250, 204, 21, 0.6)", size: 10 } },
        edge: { color: "#facc15", width: 6, shadow: { enabled: true, color: "rgba(250, 204, 21, 0.6)", size: 10 } }
    };
    const mstStyle = { node: { background: "#10b981", border: "#059669" }, edge: { color: "#10b981", width: 5 } };
    const flowStyle = { edge: { color: "#ef4444", width: 4 } };

    // Helper: Tìm và tô màu cạnh
    const highlightEdge = async (u: string, v: string, style: any) => {
        const edge = allEdges.find((e: any) => 
            (String(e.from) === u && String(e.to) === v) || 
            (!isDirected && String(e.from) === v && String(e.to) === u)
        );
        if (edge) {
            edgesRef.current.update({ id: edge.id, ...style.edge });
            await sleep(150);
        }
    };

    // ================================
    // ALGORITHM EXECUTION BLOCK
    // ================================

    // 1. BFS & DFS (Chế độ DUYỆT - Traversal)
    if (selectedAlgo === 'bfs' || selectedAlgo === 'dfs') {
        if(!sNode) { Toastify({ text: "Chọn điểm bắt đầu!", backgroundColor: "#f59e0b" }).showToast(); setIsRunning(false); return; }
        
        let res: any;
        if (selectedAlgo === 'bfs') {
             res = bfs(adjList, sNode); // Chỉ cần Start Node
             setResultLog(<div>🌊 <b>BFS Traversal</b> (Lan truyền)</div>);
        } else {
             res = dfs(adjList, sNode); // Chỉ cần Start Node
             setResultLog(<div>⛏️ <b>DFS Traversal</b> (Đào sâu)</div>);
        }

        if (res.error) {
            setResultLog(<span className="error-text">{res.error}</span>);
        } else {
            // Animation: Hiển thị cây duyệt
            for (const nodeId of res.visitedOrder) {
                nodesRef.current.update({ id: nodeId, ...scanStyle.node });
                const parentId = res.previous[nodeId];
                if (parentId) await highlightEdge(parentId, nodeId, scanStyle);
                else await sleep(200); 
            }
            setResultLog(<div>✅ <b>Duyệt Hoàn Tất!</b><br/>Thứ tự: {res.visitedOrder.join(" ➔ ")}</div>);
        }
    }

    // 2. DIJKSTRA (Tìm đường ngắn nhất)
    else if (selectedAlgo === 'dijkstra') {
        if(!sNode || !eNode) { Toastify({ text: "Nhập Start & End!", backgroundColor: "#f59e0b" }).showToast(); setIsRunning(false); return; }
        
        const res = dijkstra(adjList, sNode, eNode);
        if (res.error) setResultLog(<span className="error-text">{res.error}</span>);
        else {
            setResultLog(<div>🚀 Dijkstra Scanning...</div>);
            // Quá trình quét (Scanning)
            for (const n of res.visitedOrder) { 
                nodesRef.current.update({ id: n, background: "#e0e7ff", border: "#a5b4fc" }); 
                await sleep(50); 
            }
            // Vẽ đường đi (Path)
            if (res.path.length > 0) {
                for (let i = 0; i < res.path.length; i++) {
                    const u = res.path[i];
                    nodesRef.current.update({ id: u, ...pathStyle.node }); await sleep(200);
                    if (i < res.path.length - 1) await highlightEdge(u, res.path[i+1], pathStyle);
                }
                setResultLog(<div>✅ <b>Dijkstra Done</b><br/>Cost: {res.cost}<br/>Path: {res.path.join(" ➔ ")}</div>);
            } else setResultLog(<div className="error-text">Không tìm thấy đường đi!</div>);
        }
    }
    
    // 3. MST (PRIM / KRUSKAL) - Chỉ Vô Hướng
    else if (selectedAlgo === 'prim' || selectedAlgo === 'kruskal') {
        if (isDirected) {
            Toastify({ text: "⛔ MST chỉ dùng cho đồ thị VÔ HƯỚNG!", backgroundColor: "#ef4444", duration: 3000 }).showToast();
            setIsRunning(false); return;
        }
        
        setResultLog(<div>🚀 Running {selectedAlgo.toUpperCase()}...</div>);
        let mstEdges: any[] = []; let totalCost = 0;
        
        if (selectedAlgo === 'prim') {
            const res = prim(adjList); mstEdges = res.mstEdges; totalCost = res.cost;
        } else {
            const res = kruskal(allNodes.map((n:any)=>String(n.id)), edgesArr); mstEdges = res.mstEdges; totalCost = res.cost;
        }

        for (const edge of mstEdges) {
            nodesRef.current.update([{id: edge.from, ...mstStyle.node}, {id: edge.to, ...mstStyle.node}]);
            await highlightEdge(edge.from, edge.to, mstStyle);
        }
        setResultLog(<div>✅ <b>MST Done</b><br/>Total Cost: <b>{totalCost}</b></div>);
    }

    // 4. CHECK BIPARTITE - Chỉ Vô Hướng
    else if (selectedAlgo === 'bipartite') {
        if (isDirected) {
            Toastify({ text: "⚠️ Thường dùng cho đồ thị VÔ HƯỚNG!", backgroundColor: "#f59e0b" }).showToast();
            setIsRunning(false); return;
        }
        setResultLog("🔍 Checking Bipartite..."); await sleep(500);
        const res = checkBipartite(adjList);
        if (res.isBipartite) {
            res.setA.forEach(id => nodesRef.current.update({ id, color: { background: "#fca5a5", border: "#dc2626" } })); // Red set
            res.setB.forEach(id => nodesRef.current.update({ id, color: { background: "#93c5fd", border: "#2563eb" } })); // Blue set
            setResultLog(<div>✅ <b>Đồ thị 2 phía</b> (Bipartite)</div>);
        } else {
            setResultLog(<div className="error-text">❌ Không phải 2 phía<br/>Conflict: {res.conflictNode}</div>);
            if(res.conflictNode) nodesRef.current.update({ id: res.conflictNode, color: { background: "#000", border: "red" } });
        }
    }

    // 5. EULER - Tự động tìm Start
    else if (selectedAlgo === 'fleury' || selectedAlgo === 'hierholzer') {
        const res = selectedAlgo === 'fleury' ? fleury(adjList, isDirected) : hierholzer(adjList, isDirected);
        if (res.error) setResultLog(<span className="error-text">{res.error}</span>);
        else {
            setResultLog(<div>🚀 Euler Path ({res.type})...</div>);
            const path = res.path;
            for(let i=0; i<path.length; i++) {
                nodesRef.current.update({ id: path[i], ...pathStyle.node }); await sleep(300);
                if(i < path.length-1) await highlightEdge(path[i], path[i+1], pathStyle);
            }
            setResultLog(<div>✅ <b>Euler Found</b><br/>{path.join(" ➔ ")}</div>);
        }
    }

    // 6. MAX FLOW (FORD-FULKERSON) - Chỉ Có Hướng
    else if (selectedAlgo === 'fordfulkerson') {
         if (!isDirected) { Toastify({ text: "⛔ Max Flow cần đồ thị CÓ HƯỚNG!", backgroundColor: "#ef4444" }).showToast(); setIsRunning(false); return; }
         if(!sNode || !eNode) { Toastify({ text: "Nhập Start & End!", backgroundColor: "#f59e0b" }).showToast(); setIsRunning(false); return; }

         const res = fordFulkerson(adjList, sNode, eNode);
         if (res.error) setResultLog(<span className="error-text">{res.error}</span>);
         else {
             setResultLog(<div>🚀 Calculating Max Flow...</div>); await sleep(500);
             for(const fe of res.flowEdges) {
                const visEdge = allEdges.find((e:any) => String(e.from)===fe.from && String(e.to)===fe.to);
                if(visEdge) {
                    const capacity = visEdge.weight || 0;
                    edgesRef.current.update({ 
                        id: visEdge.id, 
                        label: `${fe.flow}/${capacity}`, // Label: Flow/Cap
                        ...flowStyle.edge 
                    });
                    await sleep(200);
                }
            }
            setResultLog(<div>✅ <b>Max Flow: {res.maxFlow}</b></div>);
         }
    }

    setIsRunning(false);
  };

  return (
    <div id="app">
      <aside className="sidebar">
        <div className="brand"><i className="fa-solid fa-share-nodes"></i> Graph Algo</div>
        <div className="panel">
          <h3>Thuật toán</h3>
          <select className="custom-select" value={selectedAlgo} onChange={(e) => setSelectedAlgo(e.target.value as AlgoType)}>
             <option value="dijkstra">Dijkstra (Shortest Path)</option>
             <option value="bfs">BFS (Traversal)</option>
             <option value="dfs">DFS (Traversal)</option>
             <option disabled>──────────</option>
             <option value="prim">Prim (MST)</option>
             <option value="kruskal">Kruskal (MST)</option>
             <option value="bipartite">Check Bipartite</option>
             <option disabled>──────────</option>
             <option value="fordfulkerson">Ford-Fulkerson (Max Flow)</option>
             <option value="fleury">Fleury (Euler)</option>
             <option value="hierholzer">Hierholzer (Euler)</option>
          </select>

          {/* INPUT AREA: HIỂN THỊ CÓ ĐIỀU KIỆN */}
          <div className="input-row">
             {/* Chỉ hiện Start Node cho các thuật toán cần điểm bắt đầu thủ công */}
             {['dijkstra','bfs','dfs','fordfulkerson'].includes(selectedAlgo) && (
                <input type="text" placeholder="Start" value={startNode} onChange={e => setStartNode(e.target.value)} title="Start Node"/>
             )}

             {/* Chỉ hiện End Node cho tìm đường và luồng */}
             {['dijkstra','fordfulkerson'].includes(selectedAlgo) && (
                <>
                    <i className="fa-solid fa-arrow-right" style={{color: '#94a3b8', margin: '0 5px'}}></i>
                    <input type="text" placeholder="End" value={endNode} onChange={e => setEndNode(e.target.value)} title="End Node"/>
                </>
             )}
          </div>

          {/* Thông báo nhỏ cho Euler */}
          {['fleury', 'hierholzer'].includes(selectedAlgo) && (
            <div style={{fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginBottom: 10, fontStyle: 'italic'}}>
                *Tự động tìm điểm bắt đầu
            </div>
          )}
          
          <button className="btn-primary" onClick={handleRun} disabled={isRunning}>
             {isRunning ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-play"></i>} {isRunning ? 'RUNNING...' : 'CHẠY'}
          </button>
          
          <button className="btn-secondary" onClick={handleShowRep}><i className="fa-solid fa-code"></i> Code Representation</button>
          <button className="btn-secondary" onClick={handleClear} disabled={isRunning}>Reset Graph</button>
        </div>
      </aside>

      <div className="main-content">
          <div className="canvas-area">
              <div id="graph-container" ref={containerRef}></div>
              
              <div className="floating-toolbar">
                 {/* MODE SWITCHER */}
                 <div className="mode-switch-container">
                    <div className="mode-bg-slider" style={{ transform: isDirected ? 'translateX(100%)' : 'translateX(0)' }}></div>
                    <div className={`mode-option ${!isDirected ? 'active' : ''}`} onClick={() => handleSwitchMode(false)}>Vô hướng</div>
                    <div className={`mode-option ${isDirected ? 'active' : ''}`} onClick={() => handleSwitchMode(true)}>Có hướng</div>
                 </div>
                 <div className="toolbar-divider"></div>
                 {/* TOOL BUTTONS */}
                 <div className="tools-group">
                    <button className={`tool-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => setActiveTool('cursor')} title="Di chuyển"><i className="fa-solid fa-arrow-pointer"></i></button>
                    <button className={`tool-btn ${activeTool === 'add-node' ? 'active' : ''}`} onClick={() => setActiveTool('add-node')} title="Thêm Đỉnh"><i className="fa-solid fa-plus"></i></button>
                    <button className={`tool-btn ${activeTool === 'add-edge' ? 'active' : ''}`} onClick={() => setActiveTool('add-edge')} title="Nối Cạnh"><i className="fa-solid fa-bezier-curve"></i></button>
                    <button className={`tool-btn ${activeTool === 'edit' ? 'active' : ''}`} onClick={() => setActiveTool('edit')} title="Sửa Trọng Số"><i className="fa-solid fa-pen-to-square"></i></button>
                    <button className={`tool-btn ${activeTool === 'delete' ? 'active' : ''}`} onClick={() => setActiveTool('delete')} title="Xóa"><i className="fa-solid fa-eraser"></i></button>
                 </div>
              </div>
          </div>
          <div className="bottom-log-panel" ref={bottomLogRef}>
              <div className="log-header">Console Output</div>
              {resultLog}
          </div>
      </div>
      
      {/* MODAL EDIT WEIGHT */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Sửa Trọng số</h3>
            <input ref={inputWeightRef} type="number" value={inputWeight} onChange={e => setInputWeight(parseInt(e.target.value) || 0)} min="0" onKeyDown={e => e.key === 'Enter' && handleSaveWeight()}/>
            <div className="modal-actions">
                <div className="modal-row"><button className="btn-danger" onClick={handleNoWeight}>Không trọng số</button><button className="btn-primary" onClick={handleSaveWeight}>Lưu</button></div>
                <button className="btn-secondary" style={{width: '100%', marginTop: 5}} onClick={() => setModalOpen(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CODE REPRESENTATION */}
      {repModalOpen && (
        <div className="modal-overlay" onClick={() => setRepModalOpen(false)}>
           <div className="modal-content" style={{width: 600, textAlign: 'left'}} onClick={e => e.stopPropagation()}>
              <h3>Biểu Diễn Đồ Thị</h3>
              <div style={{maxHeight: 400, overflowY: 'auto', background: '#f1f5f9', padding: 10, borderRadius: 8}}>
                  <h4>Matrix:</h4><pre style={{fontSize: 12}}>{representations.matrixStr}</pre>
                  <h4>Adj List:</h4><pre style={{fontSize: 12}}>{representations.adjListStr}</pre>
                  <h4>Edge List:</h4><pre style={{fontSize: 12}}>{representations.edgeListStr}</pre>
              </div>
              <div className="modal-actions" style={{marginTop: 15}}><button className="btn-secondary" onClick={() => setRepModalOpen(false)}>Đóng</button></div>
           </div>
        </div>
      )}
    </div>
  );
};
export default App;