document.getElementById('circuit1').addEventListener('click', () => {
    loadGame('../test1.glb');
});

function loadGame(circuit) {
    localStorage.setItem('selectedCircuit', circuit);
    window.location.href = 'game.html';
}