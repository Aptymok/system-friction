fetch('casos.json')
  .then(res => res.json())
  .then(data => render(data));

function render(casos) {

  casos.forEach(caso => {

    const card = document.createElement('div');
    card.className = 'card';

    const stagesHTML = caso.etapas.map(e => `
      <div class="stage">
        <div class="stage-label">ETAPA</div>
        <div class="stage-body">${e}</div>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="case-id">${caso.id}</div>
      <div class="case-title">${caso.titulo}</div>
      <div class="case-desc">${caso.descripcion}</div>

      <div class="stages">${stagesHTML}</div>

      <div class="action" onclick="openModal('${caso.conclusion}')">
        OBSERVAR CONCLUSIÓN OPERATIVA
      </div>
    `;

    document.getElementById(caso.tipo).appendChild(card);
  });

}

function toggle(id) {
  document.getElementById(id).classList.toggle('active');
}

function openModal(text) {
  document.getElementById('modal').classList.add('active');
  document.getElementById('modal-content').innerText = text;
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}
