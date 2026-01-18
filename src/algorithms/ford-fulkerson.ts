// src/algorithms/ford-fulkerson.ts

export interface FlowResult {
  maxFlow: number;
  flowEdges: { from: string, to: string, flow: number, capacity: number }[];
  error?: string;
}

export function fordFulkerson(adjList: any, s: string, t: string): FlowResult {
  console.log(`Running Max Flow from ${s} to ${t}`);

  if (!adjList[s]) return { maxFlow: 0, flowEdges: [], error: `❌ Không tìm thấy điểm bắt đầu "${s}"` };
  if (!adjList[t]) return { maxFlow: 0, flowEdges: [], error: `❌ Không tìm thấy điểm kết thúc "${t}"` };
  if (s === t) return { maxFlow: 0, flowEdges: [], error: "❌ Điểm đầu và cuối không được trùng nhau!" };

  // 1. Tạo cấu trúc dữ liệu cho đồ thị thặng dư (Residual Graph)
  // capacity[u][v] lưu sức chứa còn lại của cạnh u->v
  const capacity: Record<string, Record<string, number>> = {};
  const graph: Record<string, string[]> = {}; // Danh sách kề để duyệt BFS

  // Init graph
  for (let u in adjList) {
    graph[u] = [];
    capacity[u] = {};
    // Khởi tạo capacity = 0 cho tất cả cặp đỉnh có thể
    // (Thực tế chỉ cần init những cặp có cạnh nối, nhưng làm vậy cho an toàn)
    for (let v in adjList) {
       capacity[u][v] = 0;
    }
  }

  // Fill capacity từ dữ liệu đầu vào (Trọng số = Capacity)
  for (let u in adjList) {
    for (const [v, w] of adjList[u]) {
      const cap = Number(w);
      if (cap < 0) return { maxFlow: 0, flowEdges: [], error: "❌ Max Flow không hỗ trợ trọng số âm!" };
      
      capacity[u][v] = cap; // Cạnh xuôi
      
      // Xây dựng danh sách kề cho đồ thị thặng dư (gồm cả xuôi và ngược)
      if (!graph[u].includes(v)) graph[u].push(v);
      if (!graph[v]) graph[v] = [];
      if (!graph[v].includes(u)) graph[v].push(u); // Cạnh ngược để undo luồng
    }
  }

  let maxFlow = 0;
  const parent: Record<string, string | null> = {};

  // 2. Vòng lặp Edmonds-Karp: Tìm đường tăng luồng ngắn nhất bằng BFS
  while (true) {
    // Reset parent cho vòng BFS mới
    for (let node in adjList) parent[node] = null;
    
    const queue = [s];
    parent[s] = s; // Đánh dấu đã thăm start

    // BFS tìm đường từ s -> t trong đồ thị thặng dư
    while (queue.length > 0) {
      const u = queue.shift()!;
      if (u === t) break; // Tìm thấy đích

      const neighbors = graph[u] || [];
      for (const v of neighbors) {
        // Điều kiện: Chưa thăm VÀ Cạnh còn sức chứa (Residual Capacity > 0)
        if (parent[v] === null && capacity[u][v] > 0) {
          parent[v] = u;
          queue.push(v);
        }
      }
    }

    // Nếu không tìm thấy đường đến t nữa -> Dừng thuật toán
    if (parent[t] === null) break;

    // 3. Tính luồng bottleneck (nhỏ nhất trên đường vừa tìm)
    let pathFlow = Infinity;
    let curr = t;
    while (curr !== s) {
      const prev = parent[curr]!;
      pathFlow = Math.min(pathFlow, capacity[prev][curr]);
      curr = prev;
    }

    // 4. Cập nhật đồ thị thặng dư
    curr = t;
    while (curr !== s) {
      const prev = parent[curr]!;
      capacity[prev][curr] -= pathFlow; // Giảm sức chứa chiều xuôi
      capacity[curr][prev] += pathFlow; // Tăng sức chứa chiều ngược (để có thể undo)
      curr = prev;
    }

    maxFlow += pathFlow;
  }

  // 5. Tính toán luồng thực tế trên từng cạnh để hiển thị
  // Luồng thực tế = Capacity ban đầu - Capacity còn lại trong thặng dư
  const flowEdges: { from: string, to: string, flow: number, capacity: number }[] = [];

  for (let u in adjList) {
    for (const [v, w] of adjList[u]) {
      const initialCap = Number(w);
      const remainingCap = capacity[u][v]; // Sức chứa còn lại
      const actualFlow = initialCap - remainingCap;

      // Chỉ hiển thị những cạnh có luồng chảy qua > 0 hoặc để hiển thị 0/Max
      if (initialCap > 0) {
          flowEdges.push({ 
              from: u, 
              to: v, 
              flow: actualFlow, // Luồng đang chảy
              capacity: initialCap 
          });
      }
    }
  }

  return { maxFlow, flowEdges };
}