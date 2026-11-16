// Espelho manual dos modelos Pydantic do backend (backend/app/schemas.py).
export type Tipo = "Rotina" | "Emergencial";
export type Roteiro = "Ida e volta" | "Somente ida" | "Somente volta";
export type TripStatus = "pendente" | "deferida" | "indeferida" | "concluida" | "cancelada";
export type CaronaStatus = "pendente" | "deferida" | "indeferida";

export interface Diretoria { id: string; nome: string }
export interface Destino { municipio: string; local: string; endereco: string }
export interface Vehicle { id: string; modelo: string; placa: string; vagas: number; ativo: boolean }
export interface Driver { id: string; nome: string; telefone: string; cnh: string; ativo: boolean }

export interface TripIn {
  solicitante_nome: string;
  solicitante_email: string;
  diretoria: string;
  tipo: Tipo;
  data_servico: string;
  data_saida: string;
  hora_saida: string;
  hora_retorno: string;
  roteiro: Roteiro;
  motorista_aguarda: boolean;
  passageiros: number;
  destinos: Destino[];
  objetivo: string;
}

export interface Trip extends TripIn {
  id: string;
  protocolo: string;
  status: TripStatus;
  created_at: string;
}

export interface TripAdmin extends Trip {
  vehicle_id: string | null;
  driver_id: string | null;
  vehicle: Vehicle | null;
  driver: Driver | null;
  admin_obs: string;
  vagas_disponiveis: number | null;
  caronas_pendentes: number;
  decided_at: string | null;
}

export interface TripDecision {
  acao: "deferir" | "indeferir";
  vehicle_id: string | null;
  driver_id: string | null;
  obs: string;
}

export interface RideOffer {
  trip_id: string;
  protocolo: string;
  diretoria: string;
  data_saida: string;
  hora_saida: string;
  hora_retorno: string;
  roteiro: Roteiro;
  destinos: Destino[];
  veiculo: string;
  vagas_totais: number;
  vagas_disponiveis: number;
  vagas_ocupadas: number;
  objetivo: string;
  solicitante_nome: string;
}

export interface CaronaIn { trip_id: string; nome: string; email: string; diretoria: string; motivo: string }
export interface Carona {
  id: string;
  protocolo: string;
  trip_id: string;
  nome: string;
  email: string;
  diretoria: string;
  motivo: string;
  status: CaronaStatus;
  created_at: string;
}
export interface CaronaAdmin extends Carona {
  trip_protocolo: string;
  trip_data_saida: string;
  trip_destino: string;
  vagas_disponiveis: number;
  admin_obs: string;
  decided_at: string | null;
}
export interface CaronaDecision { acao: "deferir" | "indeferir"; obs: string }

export interface TrackTrip {
  protocolo: string;
  tipo: Tipo;
  status: TripStatus;
  data_saida: string;
  hora_saida: string;
  hora_retorno: string;
  created_at: string;
  destinos: Destino[];
  veiculo: string | null;
  motorista: string | null;
  admin_obs: string;
}
export interface TrackCarona {
  protocolo: string;
  trip_protocolo: string;
  status: CaronaStatus;
  destino: string;
  data_saida: string;
  hora_saida: string;
  nome: string;
  admin_obs: string;
}
export interface TrackResult { trips: TrackTrip[]; caronas: TrackCarona[] }

export interface DriverGuide {
  trip: TripAdmin;
  vehicle: Vehicle | null;
  driver: Driver | null;
  caronas: Carona[];
  emitido_em: string;
}

export interface Me { admin: boolean }
