from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Tipo = Literal["Rotina", "Emergencial"]
Roteiro = Literal["Ida e volta", "Somente ida", "Somente volta"]
TripStatus = Literal["pendente", "deferida", "indeferida", "concluida", "cancelada"]


class Destino(BaseModel):
    municipio: str = Field(min_length=1)
    local: str = Field(min_length=1)
    endereco: str = Field(min_length=1)

    @field_validator("municipio", "local", "endereco")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("campo obrigatório")
        return v


class TripIn(BaseModel):
    solicitante_nome: str = Field(min_length=1)
    solicitante_email: EmailStr
    diretoria: str = Field(min_length=1)
    tipo: Tipo = "Rotina"
    data_servico: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    data_saida: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    hora_saida: str = Field(pattern=r"^\d{2}:\d{2}$")
    hora_retorno: str = Field(pattern=r"^\d{2}:\d{2}$")
    roteiro: Roteiro = "Ida e volta"
    motorista_aguarda: bool = False
    passageiros: int = Field(default=1, ge=1, le=20)
    destinos: list[Destino] = Field(min_length=1, max_length=3)
    objetivo: str = Field(min_length=1)


class CaronaIn(BaseModel):
    trip_id: str
    nome: str = Field(min_length=1)
    email: EmailStr
    diretoria: str = Field(min_length=1)
    motivo: str = ""


class LoginIn(BaseModel):
    password: str


class TripDecision(BaseModel):
    acao: Literal["deferir", "indeferir"]
    vehicle_id: str | None = None
    driver_id: str | None = None
    obs: str = ""


class StatusIn(BaseModel):
    status: TripStatus


class CaronaDecision(BaseModel):
    acao: Literal["deferir", "indeferir"]
    obs: str = ""


class DiretoriaIn(BaseModel):
    nome: str = Field(min_length=1)


class VehicleIn(BaseModel):
    modelo: str = Field(min_length=1)
    placa: str = Field(min_length=1)
    vagas: int = Field(ge=2, le=60)
    ativo: bool = True


class DriverIn(BaseModel):
    nome: str = Field(min_length=1)
    telefone: str = ""
    cnh: str = ""
    ativo: bool = True
