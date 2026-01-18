// src/utils/graph-converter.ts

export const getRepresentations = (nodes: any[], edges: any[], isDirected: boolean) => {
    // 1. Sắp xếp danh sách đỉnh theo thứ tự tăng dần (1, 2, 3...)
    // Để đảm bảo hiển thị đẹp mắt theo thứ tự
    const sortedNodes = [...nodes].sort((a, b) => Number(a.id) - Number(b.id));
    const nodeIds = sortedNodes.map(n => String(n.id));
  
    // 2. Tạo Map lưu danh sách kề
    const adj: Record<string, string[]> = {};
    nodeIds.forEach(id => adj[id] = []);
  
    // 3. Duyệt qua các cạnh để điền vào danh sách kề
    edges.forEach(e => {
        const u = String(e.from);
        const v = String(e.to);
        
        // Nếu đỉnh tồn tại trong danh sách (đề phòng lỗi data rác)
        if (adj[u]) adj[u].push(v);
        
        // Nếu vô hướng, thêm chiều ngược lại
        if (!isDirected && adj[v]) {
            adj[v].push(u);
        }
    });
  
    // --- A. TẠO CHUỖI DANH SÁCH KỀ (ADJACENCY LIST) THEO MẪU ẢNH ---
    // Định dạng: 1 -> { 2, 3, 4 }
    let adjListStr = "";
    nodeIds.forEach(id => {
        // Lọc trùng và sắp xếp các hàng xóm tăng dần
        const neighbors = [...new Set(adj[id])].sort((a, b) => Number(a) - Number(b));
        
        // Format giống trong ảnh bạn gửi: canh lề một chút cho đẹp
        const neighborsStr = neighbors.length > 0 ? `{ ${neighbors.join(", ")} }` : "{ }";
        adjListStr += `${id.padEnd(4)} ->  ${neighborsStr}\n`;
    });
  
    // --- B. TẠO MA TRẬN KỀ (ADJACENCY MATRIX) ---
    // Tạo header:     1  2  3  4
    let matrixStr = "      " + nodeIds.map(id => id.padEnd(3)).join("") + "\n";
    matrixStr += "      " + "-".repeat(nodeIds.length * 3) + "\n";
  
    nodeIds.forEach(rowId => {
        let rowStr = `${rowId.padEnd(4)}| `;
        nodeIds.forEach(colId => {
            // Tìm cạnh nối row -> col
            const edge = edges.find((e: any) => 
                (String(e.from) === rowId && String(e.to) === colId) ||
                (!isDirected && String(e.from) === colId && String(e.to) === rowId)
            );
            
            // Nếu có cạnh thì lấy trọng số, không thì là 0
            const val = edge ? (edge.weight || 1) : 0;
            rowStr += `${val}`.padEnd(3);
        });
        matrixStr += rowStr + "\n";
    });
  
    // --- C. TẠO DANH SÁCH CẠNH (EDGE LIST) ---
    // Định dạng: (1, 2) - w: 4
    let edgeListStr = "";
    // Sắp xếp cạnh: theo điểm đầu tăng dần, rồi đến điểm cuối tăng dần
    const sortedEdges = [...edges].sort((a, b) => {
        return Number(a.from) - Number(b.from) || Number(a.to) - Number(b.to);
    });
  
    sortedEdges.forEach(e => {
        edgeListStr += `(${e.from}, ${e.to})    Weight: ${e.weight || 0}\n`;
    });
  
    return { matrixStr, adjListStr, edgeListStr };
  };