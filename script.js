
const API_URL = "http://localhost:8080";
const tokenKey = "ticketflow_token_v3";
const userKey = "ticketflow_userid";
let modalBootstrap = null;
let modalIngressosBootstrap = null;

const telaLogin = document.getElementById("tela-login");
const telaEventos = document.getElementById("tela-eventos");
const btnLogout = document.getElementById("btn-logout");
const btnMeusIngressos = document.getElementById("btn-meus-ingressos");
const userInfo = document.getElementById("user-info");
const usernameDisplay = document.getElementById("username-display");
const loadingSpinner = document.getElementById("loading-spinner");
const listaEventosContainer = document.getElementById("lista-eventos");
const alertErro = document.getElementById("alert-erro");
const btnLogin = document.getElementById("btn-login");
const selectIngresso = document.getElementById("select-ingresso");

function mostrarErro(mensagem) {
    document.getElementById("msg-erro-txt").innerText = mensagem;
    alertErro.classList.remove("d-none");
    setTimeout(() => alertErro.classList.add("d-none"), 5000);
}

function setLoading(isLoading) {
    if (isLoading) {
        loadingSpinner.style.display = "block";
        listaEventosContainer.style.display = "none";
    } else {
        loadingSpinner.style.display = "none";
        listaEventosContainer.style.display = "flex";
    }
}

function formatarData(dataString) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

async function fazerLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("senha").value;

    btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
    btnLogin.disabled = true;
    alertErro.classList.add("d-none");

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(tokenKey, data.token);
            localStorage.setItem(userKey, data.userId);
            localStorage.setItem("username", data.nome || "Usuário");
            alternarTelas(true);
        } else {
            mostrarErro("Credenciais inválidas.");
        }
    } catch (error) {
        mostrarErro("Falha ao conectar.");
    } finally {
        btnLogin.innerHTML = 'ENTRAR';
        btnLogin.disabled = false;
    }
}

async function carregarEventos() {
    const token = localStorage.getItem(tokenKey);
    setLoading(true);

    try {
        const response = await fetch(`${API_URL}/events?sort=date,asc`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const dados = await response.json();
            renderizarCards(dados.content);
        } else if (response.status === 403) {
            logout();
        }
    } catch (error) {
        listaEventosContainer.innerHTML = `<div class="alert alert-danger col-12">Erro de conexão.</div>`;
    } finally {
        setLoading(false);
    }
}

function renderizarCards(eventos) {
    listaEventosContainer.innerHTML = "";
    if (eventos.length === 0) {
        listaEventosContainer.innerHTML = `<div class="col-12 text-center text-muted py-5"><h4>Nenhum evento encontrado.</h4></div>`;
        return;
    }

    eventos.forEach((evento, index) => {
        const imagemUrl = `https://source.unsplash.com/random/400x250/?concert,festival&sig=${index}`;

        const cardHtml = `
                    <div class="col-md-6 col-lg-4 d-flex align-items-stretch" style="animation: fadeIn 0.5s ease-in-out ${index * 0.1}s both;">
                        <div class="card card-evento w-100">
                            <img src="${imagemUrl}" class="card-img-top">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title text-truncate">${evento.titulo}</h5>
                                <div class="event-meta mt-3">
                                    <i class="fa-solid fa-calendar-days"></i> ${formatarData(evento.date)}
                                </div>
                                <div class="event-meta text-truncate">
                                    <i class="fa-solid fa-location-dot"></i> ${evento.venue ? evento.venue.nome : 'Local a definir'}
                                </div>
                                <p class="card-text text-truncate-3 mt-3">${evento.descricao || ''}</p>
                                <div class="mt-auto pt-3">
                                    <button type="button" class="btn btn-gradiente w-100 rounded-pill" onclick="abrirModalCompra('${evento.id}')">
                                        <i class="fa-solid fa-ticket me-2"></i> COMPRAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>`;
        listaEventosContainer.innerHTML += cardHtml;
    });
}

async function abrirModalCompra(eventoId) {
    const elModal = document.getElementById('modalCompra');
    modalBootstrap = new bootstrap.Modal(elModal);
    modalBootstrap.show();

    selectIngresso.innerHTML = "<option>Carregando...</option>";
    const token = localStorage.getItem(tokenKey);

    try {
        const response = await fetch(`${API_URL}/ticket-types`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const tipos = await response.json();
        const tiposDoEvento = tipos.filter(t => t.event.id === eventoId);

        selectIngresso.innerHTML = "";
        if (tiposDoEvento.length === 0) {
            selectIngresso.innerHTML = "<option disabled>Esgotado</option>";
        } else {
            tiposDoEvento.forEach(t => {
                selectIngresso.innerHTML += `<option value="${t.id}">${t.nome} - R$ ${t.preco}</option>`;
            });
        }
    } catch (e) {
        selectIngresso.innerHTML = "<option disabled>Erro ao carregar</option>";
    }
}

async function confirmarCompra() {
    const ticketTypeId = selectIngresso.value;
    const quantidade = document.getElementById("qtd-ingresso").value;
    const userId = localStorage.getItem(userKey);
    const token = localStorage.getItem(tokenKey);

    if (!ticketTypeId) return alert("Selecione um ingresso!");

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ userId, ticketTypeId, quantidade: parseInt(quantidade) })
        });

        if (response.ok) {
            alert("✅ Compra realizada!");
            modalBootstrap.hide();
            verMeusIngressos();
        } else {
            alert("❌ Erro na compra.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
}

async function verMeusIngressos() {
    const elModal = document.getElementById('modalMeusIngressos');
    modalIngressosBootstrap = new bootstrap.Modal(elModal);
    modalIngressosBootstrap.show();

    const divLista = document.getElementById("lista-meus-ingressos");
    divLista.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div></div>';

    const token = localStorage.getItem(tokenKey);

    try {
        const response = await fetch(`${API_URL}/tickets/my-tickets`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const ingressos = await response.json();
            divLista.innerHTML = "";

            if (ingressos.length === 0) {
                divLista.innerHTML = `<div class="text-center text-muted py-4"><i class="fa-solid fa-ticket fa-2x mb-2"></i><p>Você ainda não comprou ingressos.</p></div>`;
                return;
            }

            ingressos.forEach(ticket => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.codigoQr}&bgcolor=fff`;
                const item = `
                            <div class="ticket-item">
                                <div>
                                    <h5 class="fw-bold text-primary mb-1">${ticket.eventoTitulo}</h5>
                                    <div class="small text-light mb-2"><i class="fa-solid fa-calendar"></i> ${ticket.eventoData}</div>
                                    <div class="badge bg-info text-dark mb-2">${ticket.tipoIngresso}</div>
                                    <div class="small text-muted"><i class="fa-solid fa-location-dot"></i> ${ticket.localNome}</div>
                                </div>
                                <div>
                                    <img src="${qrUrl}" class="qr-code-img" width="100" height="100" alt="QR Code">
                                </div>
                            </div>`;
                divLista.innerHTML += item;
            });
        }
    } catch (e) {
        divLista.innerHTML = `<div class="text-danger text-center">Erro ao carregar carteira.</div>`;
    }
}

function alternarTelas(logado) {
    if (logado) {
        telaLogin.classList.add("d-none");
        telaEventos.style.display = "block";
        btnLogout.style.display = "block";
        btnMeusIngressos.style.display = "block";
        userInfo.style.display = "block";
        usernameDisplay.innerText = `Olá, ${localStorage.getItem("username") || 'Usuário'}`;
        carregarEventos();
    } else {
        telaLogin.classList.remove("d-none");
        telaEventos.style.display = "none";
        btnLogout.style.display = "none";
        btnMeusIngressos.style.display = "none";
        userInfo.style.display = "none";
    }
}

function logout() {
    localStorage.clear();
    window.history.replaceState({}, document.title, "/index.html"); 
    alternarTelas(false);
}

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("token");

    if (googleToken) {
        localStorage.setItem(tokenKey, googleToken);
        localStorage.setItem(userKey, params.get("userId"));
        localStorage.setItem("username", params.get("name"));

        window.history.replaceState({}, document.title, "/index.html");

        alternarTelas(true);
    }
    else if (localStorage.getItem(tokenKey)) {
        alternarTelas(true);
    } else {
        alternarTelas(false);
    }
});


const style = document.createElement('style');
style.innerHTML = `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .text-truncate-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        `;
document.head.appendChild(style);
