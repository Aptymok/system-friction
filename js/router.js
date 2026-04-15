// ===== GLOBAL NAVTREE (available before any logic) =====
window.navTree = {
  nucleus: {
    children: {
      observatorio: {
        children: {
          flujo: { page: "flujo" },
          macro: { page: "macro" },
          simulation: { page: "simulation" },
          temporal: { page: "temporal" },
          dashboard: { page: "dashboard" },
          alerts: { page: "alerts" }
        }
      },
      instrumentos: {
        children: {
          audit: { page: "audit" },
          perenne: { page: "perenne" },
          amv: { page: "amv" },
          scorefriction: { page: "scorefriction" },
          frictionmanager: { page: "friction-manager" },
          atractor: { page: "atractor" },
          language: { page: "language" }
        }
      },
      repositorio: {
        children: {
          atlas: { page: "atlas" },
          patrones: { page: "patrones" },
          linguistica: { page: "linguistica" },
          logica: { page: "logica" },
          postulados: { page: "postulados" }
        }
      },
      laboratorio: {
        children: {
          eco: { page: "lab-eco" },
          pol: { page: "lab-pol" },
          cul: { page: "lab-cul" },
          cog: { page: "lab-cog" },
          geo: { page: "lab-geo" },
          sys: { page: "lab-sys" }
        }
      },
      instituto: {
        children: {
          about: { page: "about" },
          method: { page: "method" },
          sfi: { page: "sfi" },
          contact: { page: "contact" }
        }
      },
      casos: { page: "casos" },
      aplicar: { page: "mop-h-form" }
    }
  }
};

// ===== ROUTER LOGIC =====
(function () {
  const SYSTEM = window.SystemState;
  if (!SYSTEM) {
    console.warn("SystemState unavailable in router");
    return;
  }

  const path = window.location.pathname;
  let profile = "explorer";
  if (path.includes("simulation") || path.includes("flujo")) profile = "technical";
  else if (path.includes("sistema") || path.includes("mop-h")) profile = "executive";
  else if (path.includes("casos") || path.includes("contact")) profile = "engaged";

  SYSTEM.set("profile", profile);

  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get("role");
  if (urlRole && ["operator", "manager", "director", "founder"].includes(urlRole)) {
    SYSTEM.set("role", urlRole);
  }

  if (!SYSTEM.get("session_start")) {
    SYSTEM.set("session_start", Date.now());
  }

  const navTree = window.navTree;
  let currentPath = ["nucleus"];

  window.navigateFractal = function(nodeKey) {
    const currentNode = getNodeByPath(currentPath);
    if (currentNode && currentNode.children && currentNode.children[nodeKey]) {
      currentPath.push(nodeKey);
      if (window.currentNavigationPath) {
        window.currentNavigationPath = [...currentPath];
      }
      if (currentNode.children[nodeKey].page) {
        injectPage(currentNode.children[nodeKey].page, nodeKey);
      } else {
        if (window.expandNode) window.expandNode(nodeKey);
      }
    } else if (nodeKey === "nucleus") {
      currentPath = ["nucleus"];
      if (window.currentNavigationPath) {
        window.currentNavigationPath = ["nucleus"];
      }
      if (window.collapseAll) window.collapseAll();
    }
  };

  function getNodeByPath(path) {
    let node = navTree;
    for (const key of path) {
      node = node[key];
      if (!node) return null;
    }
    return node;
  }

  function injectPage(pageSlug, nodeKey) {
    fetch(`/${pageSlug}.html`)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const main = doc.querySelector('main');
        if (main) {
          const stage = document.getElementById('sf-main-stage');
          stage.innerHTML = '';
          const injectedContent = document.createElement('div');
          injectedContent.className = 'sf-injected-content';
          injectedContent.innerHTML = main.innerHTML;
          stage.appendChild(injectedContent);
          stage.classList.add('loaded');
        }
      })
      .catch(err => console.error('Failed to load page', pageSlug, err));
  }

  window.router = {
    navigateFractal,
    injectPage
  };

  console.log('[Router] Initialized');
})();
