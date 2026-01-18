// src/algorithms/dijkstra.ts

export interface DijkstraResult {
  path: string[];
  cost: number;
  visitedOrder: string[]; // Thứ tự các đỉnh đã duyệt qua (để làm animation)
  error?: string;
}

export function dijkstra(adjList: any, start: string, end: string): DijkstraResult {
  console.log(`🏁 Dijkstra running: ${start} -> ${end}`);

  // 1. Kiểm tra đỉnh tồn tại
  if (!adjList[start]) return { path: [], cost: 0, visitedOrder: [], error: `❌ Không tìm thấy điểm bắt đầu "${start}"` };
  if (!adjList[end]) return { path: [], cost: 0, visitedOrder: [], error: `❌ Không tìm thấy điểm kết thúc "${end}"` };

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visitedOrder: string[] = [];
  const pq: { id: string; dist: number }[] = []; // Priority Queue đơn giản

  // Khởi tạo
  for (const node in adjList) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[start] = 0;
  pq.push({ id: start, dist: 0 });

  let safety = 0; // Chống treo trình duyệt

  while (pq.length > 0) {
    safety++;
    if (safety > 10000) return { path: [], cost: 0, visitedOrder: [], error: "⚠️ Lỗi: Vòng lặp quá giới hạn!" };

    // Lấy đỉnh có khoảng cách nhỏ nhất
    pq.sort((a, b) => a.dist - b.dist);
    const item = pq.shift(); 
    if (!item) break;
    
    const { id: u, dist: currentDist } = item;

    // Nếu khoảng cách lấy ra lớn hơn khoảng cách hiện tại đã lưu -> Bỏ qua (Lazy deletion)
    if (currentDist > distances[u]) continue;

    visitedOrder.push(u); // Ghi nhận đỉnh đã được "chốt" (settled)
    if (u === end) break; // Đã tìm thấy đích -> Dừng sớm

    // Duyệt các đỉnh kề
    const neighbors = adjList[u] || [];
    for (const [v, weight] of neighbors) {
      const w = Number(weight);

      // 🛑 QUAN TRỌNG: Dijkstra không chạy với trọng số âm
      if (w < 0) {
        return { 
            path: [], cost: 0, visitedOrder: [], 
            error: `⛔ Lỗi thuật toán: Dijkstra không hỗ trợ trọng số âm (Cạnh ${u}-${v}: ${w})` 
        };
      }

      const newDist = currentDist + w;
      if (newDist < distances[v]) {
        distances[v] = newDist;
        previous[v] = u;
        pq.push({ id: v, dist: newDist });
      }
    }
  }

  // Nếu không đến được đích
  if (distances[end] === Infinity) {
    return { path: [], cost: Infinity, visitedOrder, error: "⚠️ Không tìm thấy đường đi!" };
  }

  // Truy vết ngược lại đường đi (Backtracking)
  const path: string[] = [];
  let curr: string | null = end;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return { path, cost: distances[end], visitedOrder };
}