# SRE Frota

Sistema de **solicitação de saídas, caronas e gestão da frota** da Superintendência Regional de Ensino
(SRE Metropolitana A). Recriação fiel do sistema originalmente feito no Emergent, agora independente de plataforma.

## Funcionalidades

**Portal público** (sem login)
- *Nova solicitação*: solicitante, serviço externo (datas/horários/roteiro), até 3 destinos e objetivo; tipo Rotina ou Emergencial. Gera protocolo `SRE-AAAA-0001`.
- *Caronas disponíveis*: viagens deferidas com vagas livres; pedido de carona gera protocolo `CAR-AAAA-0001`.
- *Acompanhar pedido*: consulta por protocolo ou e-mail (status, veículo, motorista e retorno da administração).

**Área administrativa** (`/admin`, senha)
- Solicitações: deferir (escolhendo veículo e motorista), indeferir, reatribuir, concluir, cancelar, excluir.
- Caronas: deferir/indeferir pedidos, com histórico.
- Cadastros: veículos, motoristas e diretorias.
- **Guia do motorista** imprimível/PDF (`/guia/:id`).
- Notificações por e-mail ao solicitante (via SMTP opcional).

**Regra de vagas:** vagas totais = lugares do veículo − 1 (motorista); vagas livres = totais − passageiros da viagem − caronas deferidas.

## Rodar em desenvolvimento

```bash
# back-end (porta 8001)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ADMIN_PASSWORD=admin123 uvicorn app.main:app --reload --port 8001

# front-end (porta 3000, com proxy /api -> 8001)
cd frontend
npm install
npm run dev
```

## Produção (um único serviço)

```bash
docker build -t sre-frota .
docker run -p 8001:8001 -v frota-data:/data \
  -e ADMIN_PASSWORD='sua-senha' -e SECRET_KEY='chave-longa-aleatoria' \
  -e COOKIE_SECURE=true sre-frota
```

O FastAPI serve a API em `/api` e o front-end compilado. Variáveis em `.env.example`.

## Testes

```bash
cd backend && python -m pytest -q
cd frontend && npm run typecheck
```

## Estrutura

- `frontend/` — React 19 + Vite + Tailwind 4 + componentes shadcn (Base UI) + TanStack Query.
- `backend/` — FastAPI + SQLite (sem dependências externas de banco). Diretorias iniciais são criadas na primeira execução.
