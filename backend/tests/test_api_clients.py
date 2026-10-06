"""HU-01 y RF-02: registro, actualizacion y baja de clientes."""

from app.infrastructure.google_identity import GoogleIdentity
from tests.conftest import authenticate, requires_database

pytestmark = requires_database

CLIENT = {
    "first_name": "Ana",
    "last_name": "Martinez",
    "dui": "01234567-8",
    "phone": "7777-1234",
    "email": "ana.martinez@gmail.com",
}


def _sign_in_as_registered_client(google_verifier) -> None:
    google_verifier.identity = GoogleIdentity(
        subject="google-subject-001",
        email=CLIENT["email"],
        name="Ana Martinez",
        picture=None,
    )


async def test_an_encargado_registers_a_client(client, encargado):
    authenticate(client, encargado)

    response = await client.post("/v1/admin/clients", json=CLIENT)

    assert response.status_code == 201
    body = response.json()
    assert body["first_name"] == "Ana"
    assert body["last_name"] == "Martinez"
    assert body["dui"] == "01234567-8"
    assert body["phone"] == "7777-1234"
    assert body["email"] == "ana.martinez@gmail.com"
    assert body["is_active"] is True


async def test_a_duplicate_dui_is_rejected(client, encargado):
    authenticate(client, encargado)
    await client.post("/v1/admin/clients", json=CLIENT)

    response = await client.post(
        "/v1/admin/clients",
        json={**CLIENT, "first_name": "Otra", "email": "otra@gmail.com"},
    )

    assert response.status_code == 409
    assert response.json()["title"] == "DUI de cliente ya registrado"
    assert response.json()["detail"] == "Ya existe un cliente registrado con este DUI."


async def test_a_duplicate_email_is_rejected(client, encargado):
    authenticate(client, encargado)
    await client.post("/v1/admin/clients", json=CLIENT)

    response = await client.post(
        "/v1/admin/clients", json={**CLIENT, "dui": "99999999-9"}
    )

    assert response.status_code == 409
    assert response.json()["title"] == "Correo de cliente ya registrado"


async def test_invalid_or_incomplete_client_data_is_rejected(client, encargado):
    authenticate(client, encargado)

    response = await client.post(
        "/v1/admin/clients",
        json={
            "first_name": "A",
            "last_name": "",
            "dui": "123",
            "phone": "x",
            "email": "no-es-correo",
        },
    )

    assert response.status_code == 422


async def test_the_email_is_required(client, encargado):
    authenticate(client, encargado)
    payload = {key: value for key, value in CLIENT.items() if key != "email"}

    response = await client.post("/v1/admin/clients", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "El correo electrónico es obligatorio."


async def test_a_regular_client_cannot_register_other_clients(client, customer):
    authenticate(client, customer)

    response = await client.post("/v1/admin/clients", json=CLIENT)

    assert response.status_code == 403


async def test_registered_clients_are_listed(client, encargado):
    authenticate(client, encargado)
    await client.post("/v1/admin/clients", json=CLIENT)

    response = await client.get("/v1/admin/clients")

    assert response.status_code == 200
    assert response.json()[0]["dui"] == CLIENT["dui"]


async def test_a_client_can_be_updated(client, encargado):
    authenticate(client, encargado)
    created = (await client.post("/v1/admin/clients", json=CLIENT)).json()

    response = await client.patch(
        f"/v1/admin/clients/{created['id']}",
        json={"phone": "7000-0000", "email": "nuevo@gmail.com"},
    )

    assert response.status_code == 200
    assert response.json()["phone"] == "7000-0000"
    assert response.json()["email"] == "nuevo@gmail.com"
    assert response.json()["dui"] == CLIENT["dui"]


async def test_updating_to_another_clients_dui_is_rejected(client, encargado):
    authenticate(client, encargado)
    await client.post("/v1/admin/clients", json=CLIENT)
    second = (
        await client.post(
            "/v1/admin/clients",
            json={**CLIENT, "dui": "11111111-1", "email": "segundo@gmail.com"},
        )
    ).json()

    response = await client.patch(
        f"/v1/admin/clients/{second['id']}", json={"dui": CLIENT["dui"]}
    )

    assert response.status_code == 409


async def test_a_client_can_be_deactivated_and_reactivated(client, encargado):
    authenticate(client, encargado)
    created = (await client.post("/v1/admin/clients", json=CLIENT)).json()

    off = await client.patch(
        f"/v1/admin/clients/{created['id']}", json={"is_active": False}
    )
    on = await client.patch(
        f"/v1/admin/clients/{created['id']}", json={"is_active": True}
    )

    assert off.json()["is_active"] is False
    assert on.json()["is_active"] is True


async def test_a_deactivated_client_keeps_their_data_in_the_list(client, encargado):
    authenticate(client, encargado)
    created = (await client.post("/v1/admin/clients", json=CLIENT)).json()
    await client.patch(f"/v1/admin/clients/{created['id']}", json={"is_active": False})

    listed = (await client.get("/v1/admin/clients")).json()

    assert listed[0]["dui"] == CLIENT["dui"]
    assert listed[0]["is_active"] is False


async def test_an_unknown_client_returns_404(client, encargado):
    authenticate(client, encargado)

    response = await client.patch(
        "/v1/admin/clients/00000000-0000-0000-0000-000000000000",
        json={"phone": "7000-0000"},
    )

    assert response.status_code == 404


async def test_a_deactivated_client_cannot_sign_in(client, encargado, google_verifier):
    _sign_in_as_registered_client(google_verifier)
    authenticate(client, encargado)
    created = (
        await client.post(
            "/v1/admin/clients",
            json=CLIENT,
        )
    ).json()
    await client.patch(f"/v1/admin/clients/{created['id']}", json={"is_active": False})
    client.cookies.clear()

    response = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})

    assert response.status_code == 401


async def test_a_registered_client_links_their_google_account_by_email(
    client, encargado, google_verifier
):
    _sign_in_as_registered_client(google_verifier)
    authenticate(client, encargado)
    created = (
        await client.post(
            "/v1/admin/clients",
            json=CLIENT,
        )
    ).json()
    client.cookies.clear()

    response = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
