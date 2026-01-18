import React, { useEffect, useRef, useState } from 'react';
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";
import './App.css'; 

// Import thuật toán
import { dijkstra } from './algorithms/dijkstra'; 
import { bfs } from './algorithms/bfs';
import { dfs } from './algorithms/dfs';
import { checkBipartite } from './algorithms/bipartite';
import { prim } from './algorithms/prim';       
import { kruskal } from './algorithms/kruskal'; 
import { getRepresentations } from './utils/graph-converter'; 
import { fordFulkerson } from './algorithms/ford-fulkerson';
import { fleury, hierholzer } from './algorithms/euler';

type ToolMode = 'cursor' | 'add-node' | 'add-edge' | 'delete' | 'edit';
type AlgoType = 'dijkstra' | 'bfs' | 'dfs' | 'bipartite' | 'prim' | 'kruskal' | 'fordfulkerson' | 'fleury' | 'hierholzer';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  
  // FIX 1: Thêm "as any" để tránh lỗi overload Type
  const nodesRef = useRef<any>(new DataSet([
    { id: '1', label: '1', x: -100, y: 0 }, 
    { id: '2', label: '2', x: 100, y: 0 }, 
    { id: '3', label: '3', x: 0, y: 100 }
  ] as any));

  const edgesRef = useRef<any>(new DataSet([
    { from: '1', to: '2', label: '10', weight: 10 },
    { from: '2', to: '3', label: '5', weight: 5 },
    { from: '1', to: '3', label: '15', weight: 15 }
  ] as any));

  const edgeCallbackRef = useRef<any>(null);
  const activeToolRef = useRef<ToolMode>('cursor'); 

  // States
  const [activeTool, setActiveTool] = useState<ToolMode>('cursor');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoType>('dijkstra');
  const [isDirected, setIsDirected] = useState(false);
  
  const [startNode, setStartNode] = useState('1');
  const [endNode, setEndNode] = useState('2');
  const [resultLog, setResultLog] = useState<React.ReactNode>(<span className="placeholder-text">Sẵn sàng...</span>);
  const [isRunning, setIsRunning] = useState(false);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [representations, setRepresentations] = useState({ matrixStr: "", adjListStr: "", edgeListStr: "" });
  
  const [edgeData, setEdgeData] = useState<any>(null);
  const [inputWeight, setInputWeight] = useState(1);
  const inputWeightRef = useRef<HTMLInputElement>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

  // --- 1. KHỞI TẠO VIS (CHẠY TRƯỚC) ---
  useEffect(() => {
    if (!containerRef.current) return;
    const options = {
      nodes: {
        shape: "dot", size: 25, borderWidth: 2,
        color: { background: "#ffffff", border: "#4f46e5", highlight: { background: "#e0e7ff", border: "#4338ca" } },
        font: { size: 16, color: "#1e293b", strokeWidth: 0 },
        shadow: { enabled: true, color: "rgba(0,0,0,0.1)", size: 10, x: 2, y: 2 },
      },
      edges: {
        width: 2, color: { color: "#94a3b8", highlight: "#4f46e5" }, 
        font: { align: "top", size: 16, color: "#4f46e5", strokeWidth: 3, strokeColor: "#ffffff" },
        // Khởi tạo mũi tên dựa trên state ban đầu luôn
        arrows: { to: { enabled: isDirected } },
        // FIX 2: Thêm enabled: true
        smooth: { enabled: true, type: isDirected ? 'curvedCW' : 'continuous', roundness: 0.2 }
      },
      physics: false, 
      interaction: { hover: true, dragNodes: true, dragView: true, zoomView: true, selectConnectedEdges: false },
      manipulation: {
        enabled: false,
        addNode: (data: any, callback: any) => {
          const allIds = nodesRef.current.getIds().map((id: any) => parseInt(id));
          const maxId = allIds.length > 0 ? Math.max(...allIds) : 0;
          const newId = String(maxId + 1);
          data.id = newId; data.label = newId;
          callback(data);
          setTimeout(() => { if (activeToolRef.current === 'add-node' && networkRef.current) networkRef.current.addNodeMode(); }, 10);
        },
        addEdge: (data: any, callback: any) => {
          if (data.from === data.to) { callback(null); return; }
          const exists = edgesRef.current.get().some((e:any) => {
              if (isDirected) return e.from === data.from && e.to === data.to;
              return (e.from === data.from && e.to === data.to) || (e.from === data.to && e.from === data.from);
          });
          if(exists) {
            Toastify({ text: "Đã có đường nối!", backgroundColor: "#ef4444" }).showToast();
            callback(null);
            setTimeout(() => { if (activeToolRef.current === 'add-edge' && networkRef.current) networkRef.current.addEdgeMode(); }, 10);
            return;
          }
          setEdgeData(data);
          edgeCallbackRef.current = callback;
          setEditingEdgeId(null);
          setInputWeight(1);
          setModalOpen(true);
        }
      }
    };
    // FIX 1: cast nodes/edges as any
    const net = new Network(containerRef.current, { nodes: nodesRef.current, edges: edgesRef.current } as any, options);
    networkRef.current = net;
    
    net.on("click", (params) => {
        if (activeToolRef.current === 'delete') {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                nodesRef.current.remove(nodeId);
                const connectedEdges = net.getConnectedEdges(nodeId);
                edgesRef.current.remove(connectedEdges);
            } else if (params.edges.length > 0) edgesRef.current.remove(params.edges[0]);
        }
        else if (activeToolRef.current === 'edit' && params.edges.length > 0) {
            const edgeId = params.edges[0];
            const edge = edgesRef.current.get(edgeId);
            if (edge) {
                setEditingEdgeId(edgeId); setInputWeight(edge.weight || 1); setModalOpen(true);
            }
        }
    });
    net.on("resize", () => { net.fit(); });
    return () => { net.destroy(); };
  }, []); // Chỉ chạy 1 lần khi Mount

  // --- 2. CẬP NHẬT KHI ĐỔI CHẾ ĐỘ (FIX LỖI CRASH) ---
  useEffect(() => {
      // Chỉ chạy khi network đã tồn tại
      if (networkRef.current) {
          networkRef.current.setOptions({
              edges: {
                  arrows: { to: { enabled: isDirected } }, 
                  // FIX 2: Thêm enabled: true vào update
                  smooth: { enabled: true, type: isDirected ? 'curvedCW' : 'continuous', roundness: 0.2 } 
              }
          });
      }
  }, [isDirected]);

  useEffect(() => {
    const net = networkRef.current; if (!net) return;
    net.disableEditMode(); const container = containerRef.current; if(container) container.style.cursor = 'default';
    if (activeTool === 'add-node') net.addNodeMode();
    else if (activeTool === 'add-edge') net.addEdgeMode();
    else if (activeTool === 'delete' && container) container.style.cursor = 'not-allowed';
    else if (activeTool === 'edit' && container) container.style.cursor = 'pointer';
  }, [activeTool]);

  useEffect(() => {
    if (modalOpen && inputWeightRef.current) setTimeout(() => inputWeightRef.current?.focus(), 50);
  }, [modalOpen]);

  // Logic Lưu
  const handleSaveEdge = () => {
    const weight = Number(inputWeight);
    if (weight <= 0) return;
    if (editingEdgeId) {
        edgesRef.current.update({ id: editingEdgeId, label: String(weight), weight: weight });
        setEditingEdgeId(null); setModalOpen(false);
    } else if (edgeData && edgeCallbackRef.current) {
        edgeData.label = String(weight); edgeData.weight = weight;
        edgeCallbackRef.current(edgeData); edgeCallbackRef.current = null; setModalOpen(false);
        setTimeout(() => { if (activeToolRef.current === 'add-edge' && networkRef.current) networkRef.current.addEdgeMode(); }, 10);
    }
  };
  const handleCancelEdge = () => {
    if (edgeCallbackRef.current) { edgeCallbackRef.current(null); edgeCallbackRef.current = null; }
    setEditingEdgeId(null); setModalOpen(false);
    setTimeout(() => { if (activeToolRef.current === 'add-edge' && networkRef.current) networkRef.current.addEdgeMode(); }, 10);
  };
  const handleClearGraph = () => {
    if (window.confirm("Xóa toàn bộ?")) {
      nodesRef.current.clear(); edgesRef.current.clear();
      setResultLog(<span className="placeholder-text">Sẵn sàng...</span>);
      setStartNode(""); setEndNode("");
    }
  };

  const handleShowRep = () => {
    const nodes = nodesRef.current.get();
    const edges = edgesRef.current.get();
    const data = getRepresentations(nodes, edges, isDirected);
    setRepresentations(data);
    setRepModalOpen(true);
  };

  // --- HÀM CHẠY THUẬT TOÁN ---
  const handleRun = async () => {
    if (isRunning) return; setActiveTool('cursor');
    nodesRef.current.update(nodesRef.current.get().map((n:any) => ({ id: n.id, color: { background: "#ffffff", border: "#4f46e5" }, borderWidth: 2 })));
    edgesRef.current.update(edgesRef.current.get().map((e:any) => ({ id: e.id, color: { color: "#94a3b8" }, width: 2, label: String(e.weight || e.label || 1) })));

    if (nodesRef.current.length === 0) { Toastify({ text: "Đồ thị trống!", backgroundColor: "#ef4444" }).showToast(); return; }

    const adjList: any = {};
    // FIX 3: Xóa biến nodesArr chưa dùng (hoặc để đó nhưng ko dùng cũng ko sao, nhưng xóa cho sạch)
    // const nodesArr = nodesRef.current.getIds(); 
    nodesRef.current.forEach((n: any) => { adjList[String(n.id)] = []; });
    const edgesArr: any[] = [];
    
    edgesRef.current.forEach((e: any) => {
      const u = String(e.from); const v = String(e.to);
      const w = Number(e.weight !== undefined ? e.weight : (e.label || 1));
      if(adjList[u]) adjList[u].push([v, w]);
      if(!isDirected && adjList[v]) adjList[v].push([u, w]);
      edgesArr.push({ from: u, to: v, weight: w, id: e.id });
    });

    setIsRunning(true);

    // --- 1. PRIM / KRUSKAL (MST) ---
    if (selectedAlgo === 'prim' || selectedAlgo === 'kruskal') {
        if (isDirected) Toastify({ text: "MST thường dùng cho vô hướng!", backgroundColor: "#f59e0b", duration: 3000 }).showToast();
        let mstEdges: any[] = [], totalCost = 0, algoName = selectedAlgo === 'prim' ? "Prim" : "Kruskal";
        if (selectedAlgo === 'prim') { const res = prim(adjList); mstEdges = res.mstEdges; totalCost = res.cost; } 
        else { const res = kruskal(nodesRef.current.getIds() as string[], edgesArr); mstEdges = res.mstEdges; totalCost = res.cost; }

        setResultLog(<div>🚀 Đang chạy {algoName}...</div>);
        for (const edge of mstEdges) {
            const visEdge = edgesRef.current.get().find((e:any) => (String(e.from)===edge.from && String(e.to)===edge.to) || (!isDirected && String(e.from)===edge.to && String(e.to)===edge.from));
            if (visEdge) {
                edgesRef.current.update({ id: visEdge.id, color: { color: "#10b981" }, width: 4 });
                nodesRef.current.update({ id: edge.from, color: { background: "#d1fae5", border: "#10b981" }, borderWidth: 3 });
                nodesRef.current.update({ id: edge.to, color: { background: "#d1fae5", border: "#10b981" }, borderWidth: 3 });
                await sleep(500);
            }
        }
        setResultLog(<div>✅ <b>{algoName} XONG</b><br/>Tổng trọng số: {totalCost}</div>);
        setIsRunning(false); return;
    }

    // --- 2. FORD-FULKERSON (Max Flow) ---
    if (selectedAlgo === 'fordfulkerson') {
        if (!isDirected) Toastify({ text: "Max Flow cần đồ thị CÓ HƯỚNG!", backgroundColor: "#ef4444", duration: 3000 }).showToast();
        const sNode = String(startNode).trim(), eNode = String(endNode).trim();
        const result = fordFulkerson(adjList, sNode, eNode);
        
        setResultLog(<div>🚀 Đang tìm luồng cực đại...</div>); await sleep(500);
        
        for (const flowEdge of result.flowEdges) {
            const visEdge = edgesRef.current.get().find((e:any) => String(e.from)===flowEdge.from && String(e.to)===flowEdge.to);
            if (visEdge) {
                const capacity = visEdge.weight || 1;
                edgesRef.current.update({ 
                    id: visEdge.id, 
                    label: `${flowEdge.flow}/${capacity}`, 
                    color: { color: "#ef4444" }, width: 4,
                    font: { color: "#ef4444", strokeWidth: 4, strokeColor: 'white' }
                });
                await sleep(300);
            }
        }
        setResultLog(<div>✅ <b>Max Flow: {result.maxFlow}</b><br/>Đã cập nhật trên dây (Flow/Cap).</div>);
        setIsRunning(false); return;
    }

    // --- 3. FLEURY / HIERHOLZER (Euler) ---
    if (selectedAlgo === 'fleury' || selectedAlgo === 'hierholzer') {
        const algoName = selectedAlgo === 'fleury' ? "Fleury" : "Hierholzer";
        let res: any = {};
        if (selectedAlgo === 'fleury') res = fleury(adjList, isDirected);
        else res = hierholzer(adjList, isDirected);

        if (res.error) {
            setResultLog(<div style={{color:'#ef4444'}}>❌ Lỗi: {res.error}</div>);
            Toastify({ text: "Không thỏa mãn điều kiện Euler!", backgroundColor: "#ef4444" }).showToast();
        } else {
            setResultLog(<div>🚀 Đang chạy {algoName}...</div>);
            const path = res.path;
            const allEdges = edgesRef.current.get();
            
            for (let i = 0; i < path.length - 1; i++) {
                const u = path[i]; const v = path[i+1];
                nodesRef.current.update({ id: u, color: { background: "#fee2e2", border: "#ef4444" }, borderWidth: 4 });
                await sleep(400);
                const edge = allEdges.find((e: any) => 
                     (String(e.from) === u && String(e.to) === v) || (!isDirected && String(e.from) === v && String(e.to) === u)
                );
                if (edge) {
                    edgesRef.current.update({ id: edge.id, color: { color: "#ef4444" }, width: 4 });
                    const oldLabel = edge.label || "";
                    edgesRef.current.update({ id: edge.id, label: `${oldLabel} [${i+1}]` });
                }
                await sleep(400);
            }
            nodesRef.current.update({ id: path[path.length-1], color: { background: "#fee2e2", border: "#ef4444" }, borderWidth: 4 });
            setResultLog(<div>✅ <b>{algoName} ({res.type})</b><br/>Path: {path.join(' -> ')}</div>);
        }
        setIsRunning(false); return;
    }

    // --- 4. Bipartite & Tìm đường ---
    if (selectedAlgo === 'bipartite') {
        setResultLog(<div>🔍 Kiểm tra...</div>); await sleep(500);
        const result = checkBipartite(adjList);
        if (result.isBipartite) {
            setResultLog(<div>✅ <b>2 PHÍA</b><br/>A: {result.setA.join(',')}<br/>B: {result.setB.join(',')}</div>);
            result.setA.forEach(id => nodesRef.current.update({ id, color: { background: "#ffedd5", border: "#f97316" } }));
            result.setB.forEach(id => nodesRef.current.update({ id, color: { background: "#ede9fe", border: "#8b5cf6" } }));
        } else {
            setResultLog(<div style={{color:'#ef4444'}}>❌ Không phải 2 phía (Xung đột: {result.conflictNode})</div>);
            if(result.conflictNode) nodesRef.current.update({ id: result.conflictNode, color: { background: "#fee2e2", border: "#ef4444" } });
        }
        setIsRunning(false); return;
    }

    const sNode = String(startNode).trim(); const eNode = String(endNode).trim();
    if(!sNode || !eNode) { Toastify({ text: "Nhập Start/End!", backgroundColor: "#f59e0b" }).showToast(); setIsRunning(false); return; }
    
    let result: any = { path: [], cost: 0 };
    let algoName = "";
    if (selectedAlgo === 'dijkstra') { algoName = "Dijkstra"; result = dijkstra(adjList, sNode, eNode); }
    else if (selectedAlgo === 'bfs') { algoName = "BFS"; result = bfs(adjList, sNode, eNode); }
    else if (selectedAlgo === 'dfs') { algoName = "DFS"; result = dfs(adjList, sNode, eNode); }

    if (result.error || result.path.length === 0) { setResultLog(<span style={{color:"#ef4444"}}>⚠️ Không thấy đường!</span>); setIsRunning(false); return; }

    setResultLog(<div>🚀 Đang chạy {algoName}...</div>);
    const path = result.path; const allEdges = edgesRef.current.get();
    for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        nodesRef.current.update({ id: nodeId, color: { background: "#fee2e2", border: "#ef4444" }, borderWidth: 4 });
        await sleep(400);
        if (i < path.length - 1) {
            const nextNodeId = path[i+1];
            const edge = allEdges.find((e: any) => 
                 (String(e.from) === nodeId && String(e.to) === nextNodeId) ||
                 (!isDirected && String(e.from) === nextNodeId && String(e.to) === nodeId)
            );
            if (edge) { edgesRef.current.update({ id: edge.id, color: { color: "#ef4444" }, width: 4 }); await sleep(400); }
        }
    }
    setResultLog(<div>✅ <b>{algoName} XONG</b><br/>Cost: {result.cost}<br/>Path: {path.join('->')}</div>);
    setIsRunning(false);
  };

  return (
    <div id="app">
      <aside className="sidebar">
        <div className="brand"><i className="fa-solid fa-share-nodes"></i> Graph Algo</div>
        <div className="panel">
          
          <div style={{marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'}} onClick={() => setIsDirected(!isDirected)}>
              <div style={{width: 40, height: 20, background: isDirected ? '#4f46e5' : '#cbd5e1', borderRadius: 20, position: 'relative', transition: '0.2s'}}>
                  <div style={{width: 16, height: 16, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, left: isDirected ? 22 : 2, transition: '0.2s'}}></div>
              </div>
              <span style={{fontWeight: 'bold', fontSize: '0.9rem'}}>{isDirected ? 'Đồ thị Có hướng' : 'Đồ thị Vô hướng'}</span>
          </div>

          <h3>Thuật toán</h3>
          <select className="custom-select" value={selectedAlgo} onChange={(e) => setSelectedAlgo(e.target.value as AlgoType)} style={{width:'100%', padding:'10px', marginBottom:10}}>
             <option value="dijkstra">Dijkstra</option>
             <option value="bfs">BFS</option>
             <option value="dfs">DFS</option>
             <option value="bipartite">Check Bipartite</option>
             <option value="prim">Prim (MST)</option>
             <option value="kruskal">Kruskal (MST)</option>
             <option disabled>──────────</option>
             <option value="fordfulkerson">Ford-Fulkerson (Max Flow)</option>
             <option value="fleury">Fleury (Euler Cycle)</option>
             <option value="hierholzer">Hierholzer (Euler Cycle)</option>
          </select>

          {['dijkstra','bfs','dfs','fordfulkerson'].includes(selectedAlgo) && (
            <div className="input-row">
                <input type="text" placeholder="Start" value={startNode} onChange={e => setStartNode(e.target.value)} />
                <i className="fa-solid fa-arrow-right"></i>
                <input type="text" placeholder="End" value={endNode} onChange={e => setEndNode(e.target.value)} />
            </div>
          )}
          
          <button className="btn-primary" onClick={handleRun} disabled={isRunning}>
             {isRunning ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-play"></i>} {isRunning ? '...' : ' CHẠY'}
          </button>
          
          <button className="btn-secondary" style={{marginTop: 10, width: '100%'}} onClick={handleShowRep}>
             <i className="fa-solid fa-code"></i> Xem Biểu Diễn
          </button>
          
          <button className="btn-secondary" style={{marginTop: 5, width: '100%'}} onClick={handleClearGraph} disabled={isRunning}>
             Reset
          </button>
        </div>
        <div className="log-box">{resultLog}</div>
      </aside>

      <main className="canvas-area">
        <div id="graph-container" ref={containerRef}></div>
        <div className="floating-toolbar">
           <button className={`tool-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => setActiveTool('cursor')}><i className="fa-solid fa-arrow-pointer"></i></button>
           <button className={`tool-btn ${activeTool === 'add-node' ? 'active' : ''}`} onClick={() => setActiveTool('add-node')}><i className="fa-solid fa-plus"></i></button>
           <button className={`tool-btn ${activeTool === 'add-edge' ? 'active' : ''}`} onClick={() => setActiveTool('add-edge')}><i className="fa-solid fa-bezier-curve"></i></button>
           <button className={`tool-btn ${activeTool === 'edit' ? 'active' : ''}`} onClick={() => setActiveTool('edit')}><i className="fa-solid fa-pen-to-square"></i></button>
           <button className={`tool-btn ${activeTool === 'delete' ? 'active' : ''}`} onClick={() => setActiveTool('delete')}><i className="fa-solid fa-eraser"></i></button>
        </div>
      </main>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Nhập Trọng số</h3>
            <input ref={inputWeightRef} type="number" value={inputWeight} onChange={e => setInputWeight(parseInt(e.target.value))} min="1" onKeyDown={e => e.key === 'Enter' && handleSaveEdge()}/>
            <div className="modal-actions"><button className="btn-primary" onClick={handleSaveEdge}>Lưu</button><button className="btn-secondary" onClick={handleCancelEdge}>Hủy</button></div>
          </div>
        </div>
      )}

      {repModalOpen && (
        <div className="modal-overlay" onClick={() => setRepModalOpen(false)}>
           <div className="modal-content" style={{width: 600, textAlign: 'left'}} onClick={e => e.stopPropagation()}>
             <h3>Biểu Diễn Đồ Thị ({isDirected ? 'Có hướng' : 'Vô hướng'})</h3>
             <div style={{maxHeight: 400, overflowY: 'auto', background: '#f1f5f9', padding: 10, borderRadius: 8}}>
                 <h4>1. Ma Trận Kề:</h4><pre style={{fontSize: 12}}>{representations.matrixStr}</pre>
                 <h4>2. Danh Sách Kề:</h4><pre style={{fontSize: 12}}>{representations.adjListStr}</pre>
                 <h4>3. Danh Sách Cạnh:</h4><pre style={{fontSize: 12}}>{representations.edgeListStr}</pre>
             </div>
             <div className="modal-actions" style={{marginTop: 15}}><button className="btn-secondary" onClick={() => setRepModalOpen(false)}>Đóng</button></div>
           </div>
        </div>
      )}
    </div>
  );
};
export default App;