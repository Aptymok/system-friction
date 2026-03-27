(function () {
  const script = document.currentScript || document.querySelector("script[data-mihm-state]");
  if (!script) return;

  const stateUrl = script.getAttribute("data-mihm-state");
  const eqUrl = script.getAttribute("data-mihm-equations");

  const ihgEl = document.getElementById("mihm-ihg");
  const ntiEl = document.getElementById("mihm-nti");
  const updatedEl = document.getElementById("mihm-updated");
  const nodesTable = document.getElementById("mihm-nodes-table");
  const eqTable = document.getElementById("mihm-equations-table");
  const eqVersion = document.getElementById("mihm-equations-version");

  function fmt(n) {
    if (typeof n !== "number") return "—";
    return (n > 0 ? "+" : "") + n.toFixed(2);
  }

  if (stateUrl) {
    fetch(stateUrl)
      .then(function (r) { return r.json(); })
      .then(function (state) {
        const nodes = state.nodes || [];
        if (updatedEl) updatedEl.textContent = state.updated_at || "—";
        if (nodes.length > 0) {
          const primary = nodes[0];
          if (ihgEl) ihgEl.textContent = fmt(primary.ihg);
          if (ntiEl) ntiEl.textContent = fmt(primary.nti);
        }
        if (nodesTable) {
          if (nodes.length === 0) {
            nodesTable.innerHTML = "<tr><td colspan='6'>Sin nodos activos.</td></tr>";
          } else {
            nodesTable.innerHTML = "";
            const colCount = (nodesTable.closest("table") && nodesTable.closest("table").querySelectorAll("thead th").length) || 6;
            nodes.forEach(function (n) {
              const tr = document.createElement("tr");
              if (colCount <= 5) {
                tr.innerHTML =
                  "<td>" + (n.label || n.node_id || "—") + "</td>" +
                  "<td>" + fmt(n.nti) + "</td>" +
                  "<td>" + (n.status || "—") + "</td>" +
                  "<td>" + (n.source_cycle || "—") + "</td>" +
                  "<td>" + (n.notes || "") + "</td>";
              } else {
                tr.innerHTML =
                  "<td>" + (n.label || n.node_id || "—") + "</td>" +
                  "<td>" + fmt(n.ihg) + "</td>" +
                  "<td>" + fmt(n.nti) + "</td>" +
                  "<td>" + (n.status || "—") + "</td>" +
                  "<td>" + (n.source_cycle || "—") + "</td>" +
                  "<td>" + (n.notes || "") + "</td>";
              }
              nodesTable.appendChild(tr);
            });
          }
        }
      })
      .catch(function (e) {
        console.warn("MIHM state load failed", e);
      });
  }

  if (eqUrl && eqTable) {
    fetch(eqUrl)
      .then(function (r) { return r.json(); })
      .then(function (payload) {
        const eqs = payload.equations || [];
        if (eqVersion) eqVersion.textContent = (payload.version || "—") + " · " + (payload.updated_at || "—");
        if (eqs.length === 0) {
          eqTable.innerHTML = "<tr><td colspan='4'>Sin ecuaciones publicadas.</td></tr>";
          return;
        }
        eqTable.innerHTML = "";
        eqs.forEach(function (item) {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" + (item.sf_pattern || "—") + "</td>" +
            "<td>" + (item.mihm_variable || "—") + "</td>" +
            "<td>" + (item.equation || "—") + "</td>" +
            "<td>" + (item.falsation || "—") + "</td>";
          eqTable.appendChild(tr);
        });
      })
      .catch(function (e) {
        console.warn("MIHM equations load failed", e);
      });
  }
})();
